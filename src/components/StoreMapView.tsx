import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Phone, Search, X, Loader2, Percent, LocateFixed, List, Compass, MapPin, SlidersHorizontal } from 'lucide-react';
import type { MapPin as Pin, StoreCard, StorePin } from '../api/types';
import { api, PATHS, fetchLocations, fetchNearestAreas, type Locations } from '../api/endpoints';
import { directionsUrl, formatKm, roundCoord } from '../api/adapters';
import { usePaged } from '../hooks/usePaged';
import { useArea } from '../utils/area';
import { getSavedGps } from '../utils/gps';
import { usePopupHash } from '../utils/popupHash';
import { useApi } from '../hooks/useApi';
import { useDebounced } from '../hooks/useDebounced';
import { useStoreCategories } from '../hooks/useCatalog';
import { RADIUS_OPTIONS, radiusToTryNext } from '../utils/widenRadius';
import { useLanguage } from '../context/LanguageContext';
import { ErrorState, ListSkeleton, LoadMore } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { openReferProvider } from './ReferProviderButton';

interface StoreMapViewProps {
  userLocation?: { lat: number; lng: number };
  /** Opens the store's own page (its branches and products). */
  onOpenStore: (slug: string) => void;
}

/** Where the map opens when the position is not known yet (central Cairo). */
const FALLBACK = { lat: 30.0444, lng: 31.2357 };
const PIN_PAGE = 2500;
/** Past this range an automatic widening for a chosen kind of store opens the «recommend a provider» popup. */
const AUTO_WIDEN_PROMPT_KM = 10;
const CLUSTER_DISTANCE_PX = 52;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/**
 * The map of the stores: the same ideas as the facilities map (MapView) — a search box that shrinks while empty, kind-of-store
 * pills, a range that widens by itself while nothing is in it, clustered pins, a counter of what is on screen, "my place" and a
 * popup card with directions, call and the store page. The backend answers with light pins (`/mobile/store-map-pins`).
 */
export const StoreMapView: React.FC<StoreMapViewProps> = ({ userLocation, onOpenStore }) => {
  const { isAr } = useLanguage();
  const here = userLocation ?? FALLBACK;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const [view, setView] = useState<'map' | 'list'>('map');
  const [sort, setSort] = useState<'nearest' | 'discount'>('nearest');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [radius, setRadius] = useState(1);
  const [widenedFrom, setWidenedFrom] = useState<number | null>(null);
  const [activePin, setActivePin] = useState<Pin | null>(null);
  const [inView, setInView] = useState(0);
  const autoWiden = useRef(true);
  const q = useDebounced(searchQuery.trim(), 350);
  const categories = useStoreCategories();
  const expanded = searchFocused || !!searchQuery;

  // ---- Area filter (list): governorate / city, with the member's own area marked -----------------
  const myArea = useArea();
  const hasGps = !!(getSavedGps() ?? myArea?.point);
  const [govId, setGovId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [locations, setLocations] = useState<Locations['governorates']>([]);
  useEffect(() => {
    const c = new AbortController();
    fetchLocations(c.signal).then(setLocations, () => undefined);
    return () => c.abort();
  }, []);
  const [govDist, setGovDist] = useState<Map<number, number>>(new Map());
  const [cityDist, setCityDist] = useState<Map<number, number>>(new Map());
  useEffect(() => {
    if (view !== 'list') return;
    const c = new AbortController();
    fetchNearestAreas('governorate', here.lat, here.lng, 40, c.signal).then((r) => setGovDist(new Map(r.map((x) => [x.id, x.distance_km]))), () => undefined);
    return () => c.abort();
  }, [view, here.lat, here.lng]);
  useEffect(() => {
    setCityDist(new Map());
    if (view !== 'list' || !govId) return;
    const c = new AbortController();
    fetchNearestAreas('city', here.lat, here.lng, 200, c.signal, govId).then((r) => setCityDist(new Map(r.map((x) => [x.id, x.distance_km]))), () => undefined);
    return () => c.abort();
  }, [view, govId, here.lat, here.lng]);
  const byCloseness = <T extends { id: number; name: string }>(items: T[], dist: Map<number, number>, mineId?: number) =>
    [...items].sort((a, b) => Number(b.id === mineId) - Number(a.id === mineId) || (dist.get(a.id) ?? Infinity) - (dist.get(b.id) ?? Infinity) || a.name.localeCompare(b.name, isAr ? 'ar' : 'en'));
  const sortedGovs = useMemo(() => byCloseness(locations, govDist, myArea?.governorate.id), [locations, govDist, myArea, isAr]); // eslint-disable-line react-hooks/exhaustive-deps
  const cities = useMemo(
    () => byCloseness(locations.find((g) => g.id === govId)?.cities ?? [], cityDist, govId === myArea?.governorate.id ? myArea?.city?.id : undefined),
    [locations, govId, cityDist, myArea, isAr], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const atMyArea = govId === (myArea?.governorate.id ?? null) && cityId === (myArea?.city?.id ?? null);
  const resetToMyArea = () => { setGovId(myArea?.governorate.id ?? null); setCityId(myArea?.city?.id ?? null); };

  // ---- Map mode: light pins ------------------------------------------------------------------
  const point = { lat: roundCoord(here.lat, 2), lng: roundCoord(here.lng, 2) };
  const params = { ...point, radius_km: radius || null, category_id: categoryId, q: q || undefined, limit: PIN_PAGE };
  const pinsQuery = useApi(view === 'map' ? `store-pins:${JSON.stringify(params)}` : null, (signal) => api.storeMapPins(params, signal));
  const pins: Pin[] = useMemo(() => pinsQuery.data?.data ?? [], [pinsQuery.data]);
  const capped = !!pinsQuery.data?.has_more;

  // Nothing in range: grow the range one step at a time until a store shows (a search or a hand-picked range stops it).
  useEffect(() => {
    if (view !== 'map' || pinsQuery.loading || !pinsQuery.data) return;
    const next = radiusToTryNext({ armed: autoWiden.current, loaded: true, pinCount: pins.length, searching: !!q, current: radius });
    if (next === null) { autoWiden.current = false; return; }
    if (categoryId) setWidenedFrom((from) => from ?? radius);
    // A kind of store that is not within 10 km opens «recommend a provider», so the team can add one.
    if (categoryId && radius <= AUTO_WIDEN_PROMPT_KM && (next === 0 || next > AUTO_WIDEN_PROMPT_KM)) openReferProvider();
    setRadius(next);
  }, [view, pinsQuery.loading, pinsQuery.data, pins, q, radius]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickRadius = (km: number) => { autoWiden.current = false; setWidenedFrom(null); setRadius(km); };
  const pickCategory = (id: number | null) => { autoWiden.current = true; setWidenedFrom(null); setCategoryId(id); };
  const resetFilters = () => { autoWiden.current = true; setWidenedFrom(null); setRadius(1); setCategoryId(null); setSearchQuery(''); setSort('nearest'); setGovId(null); setCityId(null); };

  // The popup card is fetched when a pin is tapped.
  const popup = useApi<StorePin>(activePin ? `store-pin:${activePin.id}:${isAr}` : null, (signal) => api.storePinCard(activePin!.id, signal));
  const card = popup.data;
  const [swipeX, setSwipeX] = useState(0);
  const swipeStart = useRef<{ x: number; y: number; lock: boolean } | null>(null);

  // ---- List mode: server-side search / filter / nearest-first or top offer, infinite scroll ---------
  const listPoint = { lat: roundCoord(here.lat), lng: roundCoord(here.lng) };
  const listParams = { ...listPoint, q, category_id: categoryId, governorate_id: govId, city_id: cityId, sort, per_page: 12 };
  const list = usePaged<StoreCard>(PATHS.stores, listParams, (page, signal) => api.stores({ ...listParams, page }, signal), view === 'list');

  // ---- Suggestions under the search box: stores, kinds of store, governorates and cities -------------
  const storeHits = useApi<StoreCard[]>(suggestOpen && q.length >= 2 ? `store-suggest:${q}` : null, (signal) => api.stores({ q, per_page: 5 }, signal).then((r) => r.data));
  const text = q.toLowerCase();
  const catHits = q.length >= 2 ? (categories.data ?? []).filter((c) => c.name.toLowerCase().includes(text)).slice(0, 4) : [];
  const govHits = q.length >= 2 ? locations.filter((g) => g.name.toLowerCase().includes(text)).slice(0, 4) : [];
  const cityHits = q.length >= 2 ? locations.flatMap((g) => g.cities.filter((c) => c.name.toLowerCase().includes(text)).map((c) => ({ ...c, govId: g.id }))).slice(0, 4) : [];
  const hasSuggestions = (storeHits.data?.length ?? 0) + catHits.length + govHits.length + cityHits.length > 0;

  // ---- The Leaflet map (only while the map view is showing) -------------------------------------------
  useEffect(() => {
    if (view !== 'map' || !containerRef.current) return;
    const map = L.map(containerRef.current, { center: [here.lat, here.lng], zoom: 12, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => { mapRef.current?.setView([here.lat, here.lng], 13); }, [here.lat, here.lng]);

  // Draw me, the range circle and the clustered pins.
  useEffect(() => {
    const map = mapRef.current;
    if (view !== 'map' || !map || !layerRef.current) return;

    const render = () => {
      const layer = layerRef.current;
      if (!layer) return;
      layer.clearLayers();

      if (radius > 0) {
        const circle = L.circle([here.lat, here.lng], { radius: radius * 1000, color: '#941946', weight: 3, opacity: 1, dashArray: '8, 6', fillColor: '#941946', fillOpacity: 0.12, interactive: false });
        circle.bindTooltip(escapeHtml(`${isAr ? 'نطاق البحث' : 'Search range'}: ${radius} ${isAr ? 'كم' : 'km'}`), { direction: 'top', offset: [0, -10] });
        layer.addLayer(circle);
      }

      layer.addLayer(L.marker([here.lat, here.lng], {
        icon: L.divIcon({
          html: '<div class="w-6 h-6 rounded-full bg-[#941946] border-2 border-white shadow-lg user-gps-pulse flex items-center justify-center"><div class="w-2 h-2 rounded-full bg-white"></div></div>',
          className: 'custom-user-marker', iconSize: [24, 24], iconAnchor: [12, 12],
        }),
        zIndexOffset: 1000,
      }));

      const clusters: { lat: number; lng: number; pins: Pin[]; x: number; y: number }[] = [];
      for (const pin of pins) {
        const p = map.latLngToLayerPoint([pin.lat, pin.lng]);
        const hit = clusters.find((c) => Math.hypot(p.x - c.x, p.y - c.y) <= CLUSTER_DISTANCE_PX);
        if (hit) {
          const n = hit.pins.push(pin);
          hit.lat = (hit.lat * (n - 1) + pin.lat) / n;
          hit.lng = (hit.lng * (n - 1) + pin.lng) / n;
          hit.x = (hit.x * (n - 1) + p.x) / n;
          hit.y = (hit.y * (n - 1) + p.y) / n;
        } else clusters.push({ lat: pin.lat, lng: pin.lng, pins: [pin], x: p.x, y: p.y });
      }

      for (const c of clusters) {
        if (c.pins.length > 1) {
          const m = L.marker([c.lat, c.lng], {
            icon: L.divIcon({
              html: `<div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#941946] to-[#540c26] border-2 border-white shadow-xl flex flex-col items-center justify-center text-white cursor-pointer"><span class="text-xs font-black leading-none">${c.pins.length}</span><span class="text-[8px] font-bold text-amber-300 leading-none mt-0.5">${isAr ? 'فرع' : 'br.'}</span></div>`,
              className: 'custom-cluster-marker', iconSize: [40, 44], iconAnchor: [20, 42],
            }),
          });
          m.on('click', () => map.setView([c.lat, c.lng], Math.min(map.getZoom() + 2, 18), { animate: true }));
          layer.addLayer(m);
          continue;
        }
        const pin = c.pins[0];
        const selected = activePin?.id === pin.id;
        const m = L.marker([pin.lat, pin.lng], {
          icon: L.divIcon({
            html: `<div class="flex flex-col items-center cursor-pointer ${selected ? 'scale-125' : ''}"><div class="px-2.5 py-1 rounded-xl bg-white border-2 ${selected ? 'border-amber-400' : 'border-[#941946]'} shadow-lg"><span class="text-[10px] font-black text-slate-900 leading-none whitespace-nowrap">${escapeHtml(pin.name.substring(0, 14))}</span></div><div class="w-2 h-2 bg-[#941946] rotate-45 -mt-1"></div></div>`,
            className: 'custom-provider-marker', iconSize: [46, 50], iconAnchor: [23, 48],
          }),
        });
        m.on('click', () => { setActivePin(pin); map.panTo([pin.lat, pin.lng], { animate: true }); });
        layer.addLayer(m);
      }
    };

    render();
    map.on('zoomend moveend', render);
    return () => { map.off('zoomend moveend', render); };
  }, [view, pins, activePin, here.lat, here.lng, radius, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActivePin(null), [categoryId, radius, view]);

  // Stores on the part of the map that is on screen.
  useEffect(() => {
    const map = mapRef.current;
    if (view !== 'map' || !map) return;
    const count = () => { const b = map.getBounds(); setInView(pins.filter((p) => b.contains([p.lat, p.lng])).length); };
    count();
    map.on('moveend zoomend', count);
    return () => { map.off('moveend zoomend', count); };
  }, [view, pins]);

  // A new range or kind of store frames what it found (once per choice, not per pan).
  const fitted = useRef('');
  useEffect(() => {
    const map = mapRef.current;
    const key = `${categoryId}:${radius}`;
    if (view !== 'map' || !map || fitted.current === key) return;
    if (radius === 0 && (pinsQuery.loading || !pinsQuery.data)) return;
    fitted.current = key;
    const bounds = radius > 0 ? L.latLng(here.lat, here.lng).toBounds(radius * 2000) : L.latLngBounds([[here.lat, here.lng], ...pins.map((p) => [p.lat, p.lng] as [number, number])]);
    map.invalidateSize();
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: true });
  }, [view, pinsQuery.loading, pinsQuery.data, pins, radius, categoryId, here.lat, here.lng]);

  // ---- Filters drawer (list): the same filters in a popup once the list is scrolled -------------------
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  usePopupHash('store-filter-popup', drawerOpen);
  useEffect(() => {
    if (view !== 'list') { setScrolled(false); setDrawerOpen(false); return; }
    const onScroll = () => setScrolled(window.scrollY > 320);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [view]);
  const activeFilters = (categoryId ? 1 : 0) + (govId ? 1 : 0) + (cityId ? 1 : 0) + (sort === 'discount' ? 1 : 0);

  const categoryPills = (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
      {[{ id: null as number | null, name: isAr ? 'كل المتاجر' : 'All stores' }, ...(categories.data ?? [])].map((cat) => (
        <button key={cat.id ?? 'all'} onClick={() => pickCategory(cat.id)} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${categoryId === cat.id ? 'bg-rose-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          {cat.name}
        </button>
      ))}
    </div>
  );

  const radiusSelect = (
    <select id="store-radius" value={radius} onChange={(e) => pickRadius(Number(e.target.value))} className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-lg px-2 py-0.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer">
      {RADIUS_OPTIONS.map((km) => <option key={km} value={km}>{km === 0 ? (isAr ? 'الكل' : 'All') : `${km} ${isAr ? 'كم' : 'km'}`}</option>)}
    </select>
  );

  const listFilters = (
    <>
      <div className="bg-white rounded-2xl px-3 py-2 border border-slate-200/90 shadow-2xs space-y-2 text-[11px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-800 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-600" />{isAr ? 'المحافظة والمدينة' : 'Governorate & city'}</span>
          <button type="button" onClick={resetToMyArea} disabled={atMyArea} className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer">
            <Navigation className="w-3 h-3" />{isAr ? 'موقعي الحالي' : 'My location'}
          </button>
        </div>
        {[
          { items: [{ id: null as number | null, name: isAr ? 'كل المحافظات' : 'All governorates' }, ...sortedGovs], value: govId, mine: myArea?.governorate.id, pick: (id: number | null) => { setGovId(id); setCityId(null); } },
          ...(govId ? [{ items: [{ id: null as number | null, name: isAr ? 'كل المدن' : 'All cities' }, ...cities], value: cityId, mine: govId === myArea?.governorate.id ? myArea?.city?.id : undefined, pick: (id: number | null) => setCityId(id) }] : []),
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {row.items.map((o) => {
              const isMine = o.id != null && o.id === row.mine;
              const isOn = row.value === o.id;
              return (
                <button key={o.id ?? 'all'} type="button" onClick={() => row.pick(o.id)} className={`px-2.5 py-1 rounded-lg font-bold shrink-0 border transition-colors ${isMine ? (isOn ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-400 text-emerald-700') : isOn ? 'bg-rose-700 border-rose-700 text-white' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}>
                  {isMine && '★ '}{o.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl px-3 py-2 border border-slate-200/90 shadow-2xs flex items-center justify-between text-xs font-bold text-slate-800">
        <button type="button" onClick={() => setSort('nearest')} aria-pressed={sort === 'nearest'} className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${sort === 'nearest' ? 'bg-[#941946] border-[#941946] text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-[#941946]'}`}>
          <Navigation className="w-3.5 h-3.5" /><span>{isAr ? 'الأقرب' : 'Nearest'}</span>
        </button>
        <button type="button" onClick={() => setSort('discount')} aria-pressed={sort === 'discount'} className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${sort === 'discount' ? 'bg-[#941946] border-[#941946] text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-[#941946]'}`}>
          <Percent className="w-3.5 h-3.5" /><span>{isAr ? 'الأعلى خصم' : 'Top discount'}</span>
        </button>
      </div>
    </>
  );

  const suggestGroup = (label: string, children: React.ReactNode) => (
    <div className="py-1">
      <div className="px-3 py-1 text-[11px] font-black text-slate-400">{label}</div>
      {children}
    </div>
  );
  const suggestRow = (key: string, label: string, onPick: () => void, sub?: string) => (
    <button key={key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setSuggestOpen(false); onPick(); }} className="w-full px-3 py-2 flex items-center gap-2.5 text-start hover:bg-rose-50 cursor-pointer">
      <span className="min-w-0 flex-1"><span className="block font-bold text-slate-900 truncate">{label}</span>{sub && <span className="block text-[11px] text-slate-500 truncate">{sub}</span>}</span>
    </button>
  );

  return (
    <div className="space-y-3 pb-20">
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
        {categoryPills}
        {widenedFrom !== null && categoryId && pins.length > 0 && view === 'map' && (
          <p data-testid="widened-note" className="text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
            {isAr ? `مفيش منها في ${widenedFrom} كم، وسّعنا البحث لـ ${radius || 'كل'} ${radius ? 'كم' : 'المسافات'} عشان نوصل لأقرب فروع.` : `None within ${widenedFrom} km, so we widened the search to ${radius || 'any distance'}${radius ? ' km' : ''} to find the nearest.`}
          </p>
        )}
      </div>

      {view === 'map' ? (
        <div className="relative w-full h-[30rem] sm:h-[33.75rem] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm">
          <div ref={containerRef} className="w-full h-full" />

          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
            <button onClick={() => mapRef.current?.setView([here.lat, here.lng], 14, { animate: true })} className="w-8 h-8 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-800 rounded-xl shadow-md border border-slate-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer" title={isAr ? 'التركيز على موقعي الحالي' : 'Center on my location'} aria-label={isAr ? 'موقعي' : 'My location'}>
              <LocateFixed className="w-4 h-4 text-rose-600" />
            </button>
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-2xl px-2.5 py-1.5 shadow-md border border-slate-200/90 text-xs font-bold text-slate-800">
              <Navigation className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <label htmlFor="store-radius" className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{isAr ? 'النطاق:' : 'Range:'}</label>
              {radiusSelect}
              <span title={isAr ? 'في الشاشة / الإجمالي' : 'on screen / total'} className="text-[10px] text-slate-500 font-semibold px-1.5 border-x border-slate-200 whitespace-nowrap">
                {pinsQuery.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : `${inView}/${pins.length}${capped && !q ? '+' : ''} ${isAr ? 'فرع' : 'br.'}`}
              </span>
            </div>
          </div>

          {pinsQuery.error && <div className="absolute inset-x-3 top-16 z-[450]"><ErrorState onRetry={pinsQuery.reload} /></div>}
          {!pinsQuery.loading && !pinsQuery.error && pins.length === 0 && (
            <div className="absolute inset-x-6 top-16 z-[420] text-center text-xs font-bold bg-white/95 rounded-2xl p-3 shadow-md text-slate-600">
              {isAr ? 'مفيش متاجر مطابقة على الخريطة' : 'No stores to show on the map'}
              <button onClick={resetFilters} className="block mx-auto mt-2 px-4 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer">{isAr ? 'رجّع الفلاتر' : 'Reset filters'}</button>
            </div>
          )}

          {activePin && (
            <div
              className="absolute bottom-3 left-3 right-3 z-[500] bg-white rounded-2xl p-3.5 shadow-2xl border border-slate-200/90 animate-in slide-in-from-bottom-4 duration-200 touch-pan-y"
              style={{ transform: `translateX(${swipeX}px)`, opacity: 1 - Math.min(Math.abs(swipeX) / 300, 0.6), transition: swipeStart.current ? 'none' : 'transform 0.2s, opacity 0.2s' }}
              onTouchStart={(e) => { swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, lock: false }; }}
              onTouchMove={(e) => {
                const st = swipeStart.current;
                if (!st) return;
                const dx = e.touches[0].clientX - st.x;
                if (!st.lock && Math.abs(e.touches[0].clientY - st.y) > Math.abs(dx)) { swipeStart.current = null; setSwipeX(0); return; }
                st.lock = true;
                setSwipeX(dx);
              }}
              onTouchEnd={() => { swipeStart.current = null; if (Math.abs(swipeX) > 80) setActivePin(null); setSwipeX(0); }}
            >
              <div className="flex items-start justify-between gap-3">
                <div role="button" tabIndex={0} onClick={() => (card && Math.abs(swipeX) < 10 ? onOpenStore(card.slug) : undefined)} onKeyDown={(e) => { if (e.key === 'Enter' && card) onOpenStore(card.slug); }} className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                  <Thumb src={card?.logo} alt={activePin.name} kind="facility" fit="contain" className="w-12 h-12 rounded-xl border border-rose-100 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{card?.title ?? activePin.name}</h4>
                      {card?.offer_to != null && (
                        <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded-md shrink-0">{isAr ? `خصم ${card.offer_from != null && card.offer_from !== card.offer_to ? `${card.offer_from}–` : ''}${card.offer_to}%` : `${card.offer_to}% OFF`}</span>
                      )}
                    </div>
                    {popup.loading ? <p className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'بنحمّل...' : 'Loading...'}</p> : <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{card?.branch.address ?? [card?.branch.city, card?.branch.governorate].filter(Boolean).join(' - ')}</p>}
                    {card && card.categories.length > 0 && <p className="text-[10px] font-bold text-slate-600 mt-1">{card.categories.map((c) => c.name).join(' · ')}</p>}
                  </div>
                </div>
                <button onClick={() => setActivePin(null)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                <a href={directionsUrl(activePin.lat, activePin.lng) ?? undefined} target="_blank" rel="noreferrer" className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1"><Navigation className="w-3.5 h-3.5 text-rose-700" /><span>{isAr ? 'الاتجاهات' : 'Directions'}</span></a>
                <a href={card?.branch.phone ? `tel:${card.branch.phone}` : undefined} aria-disabled={!card?.branch.phone} className={`py-2 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${card?.branch.phone ? 'hover:bg-slate-200' : 'opacity-40 pointer-events-none'}`}><Phone className="w-3.5 h-3.5 text-emerald-600" /><span>{isAr ? 'اتصال' : 'Call'}</span></a>
                <button onClick={() => card && onOpenStore(card.slug)} disabled={!card} className="py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"><span>{isAr ? 'افتح المتجر' : 'Open store'}</span></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {listFilters}

          {list.loading && <ListSkeleton rows={5} />}
          {list.error && <ErrorState onRetry={list.reload} />}

          {list.items.map((st) => (
            <div key={st.id} onClick={() => onOpenStore(st.slug)} className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Thumb src={st.logo} alt={st.title} kind="facility" fit="contain" className="w-12 h-12 rounded-xl border border-slate-200/80 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{st.title}</h4>
                    {st.offer_to != null && <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 shrink-0">{isAr ? `خصم ${st.offer_to}%` : `${st.offer_to}% OFF`}</span>}
                  </div>
                  {st.categories.length > 0 && <p className="text-[11px] text-slate-500 mt-0.5">{st.categories.map((c) => c.name).join(' · ')}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    {st.distance_km != null && (<><span className="font-bold text-rose-700 flex items-center gap-0.5 shrink-0"><MapPin className="w-3.5 h-3.5" />{formatKm(st.distance_km, isAr)}</span><span>•</span></>)}
                    <span className="truncate max-w-[12.5rem]">{st.branch?.address ?? st.branch?.city}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                {st.branch?.phone && (
                  <a href={`tel:${st.branch.phone}`} onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-semibold"><Phone className="w-3.5 h-3.5 text-emerald-600" /><span>{st.branch.phone}</span></a>
                )}
                <button onClick={() => onOpenStore(st.slug)} className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer">{isAr ? 'افتح المتجر' : 'Open store'}</button>
              </div>
            </div>
          ))}

          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />

          {!list.loading && !list.error && list.items.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">{isAr ? 'مفيش متاجر مطابقة' : 'No matching stores found'}</p>
              <p className="text-xs text-slate-500 mt-1">{isAr ? 'وسّع نطاق البحث أو غيّر كلمة البحث' : 'Try a wider range or a different search'}</p>
              <button onClick={resetFilters} className="mt-3 px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer">{isAr ? 'رجّع الفلاتر' : 'Reset filters'}</button>
            </div>
          )}
        </div>
      )}

      {view === 'list' && scrolled && !drawerOpen && createPortal(
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed z-40 bottom-40 left-4 w-12 h-12 rounded-full bg-[#941946] hover:bg-[#7b1439] text-white shadow-lg shadow-rose-900/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer animate-in fade-in zoom-in-90 duration-150"
          style={{ left: 'max(1rem, calc(50% - 384px + 1rem))' }}
          title={isAr ? 'تصفية' : 'Filters'}
          aria-label={isAr ? 'تصفية' : 'Filters'}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeFilters > 0 && <span className="absolute -top-1 -end-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center border-2 border-white">{activeFilters}</span>}
        </button>,
        document.body,
      )}

      {drawerOpen && createPortal(
        <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setDrawerOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} dir={isAr ? 'rtl' : 'ltr'} className="bg-white w-full max-w-md max-h-[88dvh] rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-[#941946]" />{isAr ? 'تصفية المتاجر' : 'Filter stores'}</h3>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[{ id: null as number | null, name: isAr ? 'الكل' : 'All' }, ...(categories.data ?? [])].map((cat) => (
                  <button key={cat.id ?? 'all'} onClick={() => pickCategory(cat.id)} className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${categoryId === cat.id ? 'bg-rose-700 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat.name}</button>
                ))}
              </div>
              {listFilters}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setDrawerOpen(false)} className="w-full py-3 rounded-2xl bg-[#941946] text-white font-black text-sm cursor-pointer">{isAr ? 'اعرض النتائج' : 'Show results'}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
