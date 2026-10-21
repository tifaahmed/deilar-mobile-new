import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Phone, Search, X, List, Compass, Loader2, Percent } from 'lucide-react';
import type { FacilityCard, MapPin as Pin } from '../api/types';
import { api, PATHS } from '../api/endpoints';
import { directionsUrl, formatKm, roundCoord } from '../api/adapters';
import { useApi } from '../hooks/useApi';
import { useDebounced } from '../hooks/useDebounced';
import { usePaged } from '../hooks/usePaged';
import { isAbort } from '../api/http';
import { useFacilityTypes } from '../hooks/useCatalog';
import { useLanguage } from '../context/LanguageContext';
import { ErrorState, ListSkeleton, LoadMore } from './ui/Feedback';
import { Thumb } from './ui/Thumb';

interface MapViewProps {
  userLocation: { lat: number; lng: number; name: string };
  view: 'map' | 'list';
  onViewChange: (view: 'map' | 'list') => void;
  selectedTypeId: number | null;
  onSelectType: (typeId: number | null) => void;
  /** Search range in km (0 = everywhere); kept in the URL by the caller. */
  radius: number;
  onRadiusChange: (radius: number) => void;
  /** List order; kept in the URL by the caller. */
  sort: 'discount' | null;
  onSortChange: (sort: 'discount' | null) => void;
  /** Clears type, range and order in one navigation (several at once would overwrite each other in the URL). */
  onResetFilters: () => void;
  onSelectProvider: (provider: FacilityCard) => void;
  onRequestGps: () => void;
  isGpsLoading: boolean;
}

/** "Within X km" steps the API accepts; 0 means no limit (nearest first, across the country). */
const RADIUS_OPTIONS = [10, 20, 30, 50, 100, 0];
/** Pins fetched per request, nearest first. The backend allows up to 3000 and only ~2000 branches have coordinates, so with a wide radius the map shows them all (the pins are tiny and the map clusters them). */
const PIN_PAGE = 2500;
/** What every deployed backend accepts. */
const PIN_PAGE_FALLBACK = 500;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export const MapView: React.FC<MapViewProps> = ({ userLocation, view, onViewChange, selectedTypeId, onSelectType, radius: radiusProp, onRadiusChange, sort, onSortChange, onResetFilters, onSelectProvider, onRequestGps, isGpsLoading }) => {
  const { isAr } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activePin, setActivePin] = useState<Pin | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const maxRadiusKm = radiusProp;
  const setMaxRadiusKm = onRadiusChange;
  const viewMode = view;
  const setViewMode = onViewChange;

  const q = useDebounced(searchQuery.trim(), 350);
  const types = useFacilityTypes();

  // ~1 km grid for the map, ~110 m for the list: nearby positions share one cached URL.
  const mapPoint = { lat: roundCoord(userLocation.lat, 2), lng: roundCoord(userLocation.lng, 2) };
  const listPoint = { lat: roundCoord(userLocation.lat), lng: roundCoord(userLocation.lng) };
  const radius = maxRadiusKm || null;

  // ---- Map mode: only light pins, fetched for the visible mode alone -------------------------
  const pinParams = { ...mapPoint, radius_km: radius, facility_type_id: selectedTypeId, limit: PIN_PAGE };
  const pinsQuery = useApi(
    viewMode === 'map' ? `pins:${JSON.stringify(pinParams)}` : null,
    // A server that predates the larger page refuses anything over 500: ask again for what it allows
    // rather than leaving the map on an error screen.
    (signal) => api.mapPins(pinParams, signal).catch((err) => {
      if (isAbort(err) || PIN_PAGE_FALLBACK >= PIN_PAGE) throw err;
      return api.mapPins({ ...pinParams, limit: PIN_PAGE_FALLBACK }, signal);
    }),
  );
  const pins: Pin[] = useMemo(() => {
    const all = pinsQuery.data?.data ?? [];
    if (!q) return all;
    const needle = q.toLowerCase();
    return all.filter((p) => p.name.toLowerCase().includes(needle));
  }, [pinsQuery.data, q]);
  const capped = !!pinsQuery.data?.has_more;

  // The popup card is fetched when a pin is tapped — never shipped with every pin.
  const popup = useApi<FacilityCard>(activePin ? `pin:${activePin.id}:${isAr}` : null, (signal) => api.branchCard(activePin!.id, signal));

  // ---- List mode: server-side search / filter / nearest-first, infinite scroll ---------------
  const byDiscount = sort === 'discount';
  const listParams = { ...listPoint, q, radius_km: radius, type: selectedTypeId, per_page: 12, sort: byDiscount ? 'discount' : undefined };
  const list = usePaged<FacilityCard>(PATHS.facilities, listParams, (page, signal) => api.facilities({ ...listParams, page }, signal), viewMode === 'list');

  // Initialize Leaflet Map (only while the map view is showing)
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, { center: [userLocation.lat, userLocation.lng], zoom: 12, zoomControl: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // Update map center when userLocation changes
  useEffect(() => {
    mapInstanceRef.current?.setView([userLocation.lat, userLocation.lng], 13);
  }, [userLocation]);

  // Draw the user, the search radius, and clustered pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (viewMode !== 'map' || !map || !markersLayerRef.current) return;

    const render = () => {
      const layer = markersLayerRef.current;
      if (!layer) return;
      layer.clearLayers();

      if (maxRadiusKm > 0) {
        const circle = L.circle([userLocation.lat, userLocation.lng], {
          radius: maxRadiusKm * 1000,
          color: '#941946',
          weight: 1.5,
          opacity: 0.85,
          dashArray: '6, 6',
          fillColor: '#941946',
          fillOpacity: 0.08,
        });
        circle.bindTooltip(escapeHtml(`${isAr ? 'نطاق البحث' : 'Search range'}: ${maxRadiusKm} ${isAr ? 'كم' : 'km'}`), { direction: 'top', offset: [0, -10] });
        layer.addLayer(circle);
      }

      const userIcon = L.divIcon({
        html: `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 rounded-full bg-[#941946] border-2 border-white shadow-lg user-gps-pulse flex items-center justify-center text-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>`,
        className: 'custom-user-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindTooltip(`<b>${isAr ? 'موقعك' : 'You'}:</b> ${escapeHtml(userLocation.name)}`, { direction: 'top', offset: [0, -10] });
      layer.addLayer(userMarker);

      // Merge pins that would overlap on screen into one numbered cluster.
      const CLUSTER_DISTANCE_PX = 52;
      const clusters: { lat: number; lng: number; pins: Pin[]; x: number; y: number }[] = [];

      for (const pin of pins) {
        const point = map.latLngToLayerPoint([pin.lat, pin.lng]);
        const hit = clusters.find((c) => Math.hypot(point.x - c.x, point.y - c.y) <= CLUSTER_DISTANCE_PX);

        if (hit) {
          const n = hit.pins.push(pin);
          hit.lat = (hit.lat * (n - 1) + pin.lat) / n;
          hit.lng = (hit.lng * (n - 1) + pin.lng) / n;
          hit.x = (hit.x * (n - 1) + point.x) / n;
          hit.y = (hit.y * (n - 1) + point.y) / n;
        } else {
          clusters.push({ lat: pin.lat, lng: pin.lng, pins: [pin], x: point.x, y: point.y });
        }
      }

      for (const cluster of clusters) {
        if (cluster.pins.length > 1) {
          const count = cluster.pins.length;
          const marker = L.marker([cluster.lat, cluster.lng], {
            icon: L.divIcon({
              html: `
            <div class="relative flex items-center justify-center cursor-pointer group hover:scale-110 active:scale-95 transition-transform">
              <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#941946] via-[#7d143b] to-[#540c26] border-2 border-white shadow-xl flex flex-col items-center justify-center text-white ring-2 ring-[#941946]/30">
                <span class="text-xs font-black font-mono leading-none">${count}</span>
                <span class="text-[8px] font-bold text-amber-300 leading-none mt-0.5">${isAr ? 'فرع' : 'br.'}</span>
              </div>
              <div class="w-2 h-2 bg-[#941946] rotate-45 -mt-1 shadow-xs absolute -bottom-1"></div>
            </div>`,
              className: 'custom-cluster-marker',
              iconSize: [40, 44],
              iconAnchor: [20, 42],
            }),
          });
          marker.on('click', () => map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 18), { animate: true }));
          layer.addLayer(marker);
          continue;
        }

        const pin = cluster.pins[0];
        const isSelected = activePin?.id === pin.id;
        const label = escapeHtml(pin.name.substring(0, 14));

        const marker = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            html: `
            <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
              <div class="px-2.5 py-1 rounded-xl bg-white border-2 ${isSelected ? 'border-amber-400 ring-2 ring-amber-400' : 'border-[#941946]'} shadow-lg flex items-center justify-center">
                <span class="text-[10px] font-black text-slate-900 leading-none whitespace-nowrap">${label}</span>
              </div>
              <div class="w-2 h-2 bg-[#941946] rotate-45 -mt-1 shadow-xs"></div>
            </div>`,
            className: 'custom-provider-marker',
            iconSize: [46, 50],
            iconAnchor: [23, 48],
          }),
        });
        marker.on('click', () => {
          setActivePin(pin);
          map.panTo([pin.lat, pin.lng], { animate: true });
        });
        layer.addLayer(marker);
      }
    };

    render();
    map.on('zoomend moveend', render);
    return () => {
      map.off('zoomend moveend', render);
    };
  }, [viewMode, pins, activePin, userLocation, maxRadiusKm, isAr]);

  // A popup belongs to the pin set it was tapped in.
  useEffect(() => setActivePin(null), [selectedTypeId, maxRadiusKm, viewMode]);

  const handleCenterOnUser = () => mapInstanceRef.current?.setView([userLocation.lat, userLocation.lng], 14, { animate: true });

  const resetFilters = () => {
    setSearchQuery('');
    onResetFilters();
  };

  const radiusSelect = (id: string) => (
    <select
      id={id}
      value={maxRadiusKm}
      onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
      className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-lg px-2 py-0.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
    >
      {RADIUS_OPTIONS.map((km) => (
        <option key={km} value={km}>
          {km === 0 ? (isAr ? 'الكل' : 'All') : `${km} ${isAr ? 'كم' : 'km'}`}
        </option>
      ))}
    </select>
  );

  const popupCard = popup.data;

  return (
    <div className="space-y-3 pb-20 animate-in fade-in duration-200">
      {/* 1. Search & type filters */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={isAr ? 'ابحث باسم المستشفى، المعمل، أو المنطقة...' : 'Search hospital, lab or area...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {(['map', 'list'] as const).map((mode) => {
              const Icon = mode === 'map' ? Compass : List;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                    viewMode === mode ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={mode === 'map' ? (isAr ? 'عرض الخريطة' : 'Map') : isAr ? 'عرض كقائمة' : 'List'}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{mode === 'map' ? (isAr ? 'الخريطة' : 'Map') : isAr ? 'القائمة' : 'List'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {[{ id: null as number | null, name: isAr ? 'الكل' : 'All' }, ...(types.data ?? [])].map((type) => (
            <button
              key={type.id ?? 'all'}
              onClick={() => onSelectType(type.id)}
              className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                selectedTypeId === type.id ? 'bg-rose-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Map or list */}
      {viewMode === 'map' ? (
        <div className="relative w-full h-[480px] sm:h-[540px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm">
          <div ref={mapContainerRef} className="w-full h-full" />

          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-2xl px-2.5 py-1.5 shadow-md border border-slate-200/90 text-xs font-bold text-slate-800">
            <Navigation className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <label htmlFor="map-radius-select" className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
              {isAr ? 'النطاق:' : 'Range:'}
            </label>
            {radiusSelect('map-radius-select')}
            <span className="text-[10px] text-slate-500 font-semibold px-1.5 border-x border-slate-200 whitespace-nowrap">
              {pinsQuery.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${pins.length}${capped && !q ? '+' : ''} ${isAr ? 'فرع' : 'br.'}`}
            </span>
          </div>

          <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5">
            <button
              onClick={handleCenterOnUser}
              className="w-8 h-8 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-800 rounded-xl shadow-md border border-slate-200 flex items-center justify-center transition-all active:scale-95"
              title={isAr ? 'التركيز على موقعي الحالي' : 'Center on my location'}
            >
              <Navigation className="w-4 h-4 text-rose-600 fill-rose-100" />
            </button>

            <button
              onClick={onRequestGps}
              disabled={isGpsLoading}
              className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-slate-800 hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>{isGpsLoading ? (isAr ? 'جاري...' : '...') : 'GPS'}</span>
            </button>
          </div>

          {pinsQuery.error && (
            <div className="absolute inset-x-3 top-16 z-[450]">
              <ErrorState onRetry={pinsQuery.reload} />
            </div>
          )}

          {/* Popup for the tapped pin */}
          {activePin && (
            <div className="absolute bottom-3 left-3 right-3 z-[500] bg-white rounded-2xl p-3.5 shadow-2xl border border-slate-200/90 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Thumb src={popupCard?.logo} alt={activePin.name} kind="facility" fit="contain" className="w-12 h-12 rounded-xl border border-rose-100 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{popupCard?.name ?? activePin.name}</h4>
                      {popupCard?.discount != null && (
                        <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded-md shrink-0">
                          {isAr ? `خصم ${popupCard.discount}%` : `${popupCard.discount}% OFF`}
                        </span>
                      )}
                    </div>
                    {popup.loading ? (
                      <p className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {popupCard?.branch?.address ?? [popupCard?.branch?.city, popupCard?.branch?.governorate].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    {popupCard?.type && <p className="text-[10px] font-bold text-slate-600 mt-1">{popupCard.type.name}</p>}
                  </div>
                </div>

                <button onClick={() => setActivePin(null)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                <a
                  href={directionsUrl(activePin.lat, activePin.lng) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-rose-700" />
                  <span>{isAr ? 'الاتجاهات' : 'Directions'}</span>
                </a>

                <a
                  href={popupCard?.branch?.phone ? `tel:${popupCard.branch.phone}` : undefined}
                  aria-disabled={!popupCard?.branch?.phone}
                  className={`py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors ${popupCard?.branch?.phone ? 'hover:bg-slate-200' : 'opacity-40 pointer-events-none'}`}
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isAr ? 'اتصال' : 'Call'}</span>
                </a>

                <button
                  onClick={() => (popupCard ? onSelectProvider(popupCard) : undefined)}
                  disabled={!popupCard}
                  className="py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <span>{isAr ? 'كشف الخصومات' : 'View discounts'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="bg-white rounded-2xl px-3 py-2 border border-slate-200/90 shadow-2xs flex items-center justify-between text-xs font-bold text-slate-800">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{isAr ? 'نطاق البحث:' : 'Search range:'}</span>
              {radiusSelect('list-radius-select')}
            </div>
            {/* Biggest discount first; press again for nearest-first. */}
            <button
              type="button"
              onClick={() => onSortChange(byDiscount ? null : 'discount')}
              aria-pressed={byDiscount}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                byDiscount ? 'bg-[#941946] border-[#941946] text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-[#941946]'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>{isAr ? 'الأعلى خصماً' : 'Top discount'}</span>
            </button>
          </div>

          {list.loading && <ListSkeleton rows={5} />}
          {list.error && <ErrorState onRetry={list.reload} />}

          {list.items.map((provider) => (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider)}
              className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <Thumb src={provider.logo} alt={provider.name} kind="facility" fit="contain" className="w-12 h-12 rounded-xl border border-slate-200/80 shrink-0" />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors truncate">{provider.name}</h4>
                    {provider.discount != null && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 shrink-0">
                        {isAr ? `خصم ${provider.discount}%` : `${provider.discount}% OFF`}
                      </span>
                    )}
                  </div>

                  {provider.type && <p className="text-[11px] text-slate-500 mt-0.5">{provider.type.name}</p>}

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    {provider.distance_km != null && (
                      <>
                        <span className="font-bold text-rose-700 flex items-center gap-0.5 shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                          {formatKm(provider.distance_km, isAr)}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span className="truncate max-w-[200px]">{provider.branch?.address ?? provider.branch?.city}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                {provider.branch?.phone && (
                  <a
                    href={`tel:${provider.branch.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{provider.branch.phone}</span>
                  </a>
                )}

                <button
                  onClick={() => onSelectProvider(provider)}
                  className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {isAr ? 'تفاصيل الخصم' : 'Discount details'}
                </button>
              </div>
            </div>
          ))}

          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />

          {!list.loading && !list.error && list.items.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">{isAr ? 'لم يتم العثور على فروع مطابقة' : 'No matching branches found'}</p>
              <p className="text-xs text-slate-500 mt-1">{isAr ? 'جرب زيادة نطاق البحث أو تغيير كلمة البحث' : 'Try a wider range or a different search'}</p>
              <button onClick={resetFilters} className="mt-3 px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold">
                {isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
