import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  ExternalLink, 
  Clock, 
  Star, 
  Search, 
  Filter, 
  X,
  MessageCircle,
  Percent,
  CheckCircle,
  List,
  Compass
} from 'lucide-react';
import { MedicalProvider, ProviderCategory } from '../types';
import { formatDistance } from '../utils/geo';

interface MapViewProps {
  userLocation: { lat: number; lng: number; name: string };
  providers: (MedicalProvider & { distanceKm: number })[];
  selectedCategory: ProviderCategory;
  onSelectCategory: (cat: ProviderCategory) => void;
  onSelectProvider: (provider: MedicalProvider) => void;
  onRequestGps: () => void;
  isGpsLoading: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  userLocation,
  providers,
  selectedCategory,
  onSelectCategory,
  onSelectProvider,
  onRequestGps,
  isGpsLoading,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [activeProvider, setActiveProvider] = useState<(MedicalProvider & { distanceKm: number }) | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(50); // Default to all / 50km
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Filter providers by category, search query, and radius
  const filteredProviders = providers.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesRadius = p.distanceKm <= maxRadiusKm;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesRadius && matchesSearch;
  });

  // Sort by nearest
  const sortedProviders = [...filteredProviders].sort((a, b) => a.distanceKm - b.distanceKm);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userLocation.lat, userLocation.lng],
        zoom: 12,
        zoomControl: false,
      });

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control at bottom-left
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center when userLocation changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation]);

  // Update Markers & Clusters whenever filteredProviders, userLocation, maxRadiusKm, or zoom changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const map = mapInstanceRef.current;

    const renderMarkersAndClusters = () => {
      if (!markersLayerRef.current || !mapInstanceRef.current) return;
      markersLayerRef.current.clearLayers();

      // 1. Draw circle around user location based on selected km (e.g. 3km, 5km, 10km, 25km)
      if (maxRadiusKm < 50) {
        const radiusCircle = L.circle([userLocation.lat, userLocation.lng], {
          radius: maxRadiusKm * 1000,
          color: '#941946',
          weight: 1.5,
          opacity: 0.85,
          dashArray: '6, 6',
          fillColor: '#941946',
          fillOpacity: 0.08,
        });
        radiusCircle.bindTooltip(`نطاق البحث: ${maxRadiusKm} كم`, { direction: 'top', offset: [0, -10] });
        markersLayerRef.current.addLayer(radiusCircle);
      }

      // 2. Add User Location Marker (Pulse icon)
      const userIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 rounded-full bg-[#941946] border-2 border-white shadow-lg user-gps-pulse flex items-center justify-center text-white">
            <div class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userIconHtml,
        className: 'custom-user-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      userMarker.bindTooltip(`<b>موقعك:</b> ${userLocation.name}`, { direction: 'top', offset: [0, -10] });
      markersLayerRef.current.addLayer(userMarker);

      // 3. Cluster nearby markers into combined counts to prevent mobile lag/crash with many branches
      const CLUSTER_DISTANCE_PX = 52;
      const clusters: {
        lat: number;
        lng: number;
        providers: (MedicalProvider & { distanceKm: number })[];
        pixelX: number;
        pixelY: number;
      }[] = [];

      filteredProviders.forEach((provider) => {
        const point = map.latLngToLayerPoint([provider.lat, provider.lng]);
        
        let merged = false;
        for (const cluster of clusters) {
          const dist = Math.hypot(point.x - cluster.pixelX, point.y - cluster.pixelY);
          if (dist <= CLUSTER_DISTANCE_PX) {
            cluster.providers.push(provider);
            const n = cluster.providers.length;
            cluster.lat = (cluster.lat * (n - 1) + provider.lat) / n;
            cluster.lng = (cluster.lng * (n - 1) + provider.lng) / n;
            cluster.pixelX = (cluster.pixelX * (n - 1) + point.x) / n;
            cluster.pixelY = (cluster.pixelY * (n - 1) + point.y) / n;
            merged = true;
            break;
          }
        }

        if (!merged) {
          clusters.push({
            lat: provider.lat,
            lng: provider.lng,
            providers: [provider],
            pixelX: point.x,
            pixelY: point.y,
          });
        }
      });

      // 4. Render Clusters and Individual Markers with Facility Logos
      clusters.forEach((cluster) => {
        if (cluster.providers.length > 1) {
          // --- CLUSTERED MARKER: Shows number of combined branches ---
          const count = cluster.providers.length;
          const clusterHtml = `
            <div class="relative flex items-center justify-center cursor-pointer group hover:scale-110 active:scale-95 transition-transform">
              <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#941946] via-[#7d143b] to-[#540c26] border-2 border-white shadow-xl flex flex-col items-center justify-center text-white ring-2 ring-[#941946]/30">
                <span class="text-xs font-black font-mono leading-none">${count}</span>
                <span class="text-[8px] font-bold text-amber-300 leading-none mt-0.5">فرع</span>
              </div>
              <div class="w-2 h-2 bg-[#941946] rotate-45 -mt-1 shadow-xs absolute -bottom-1"></div>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'custom-cluster-marker',
            iconSize: [40, 44],
            iconAnchor: [20, 42],
          });

          const clusterMarker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon });
          clusterMarker.bindTooltip(
            `<b>${count} فروع طبية متقاربة</b><br/><span style="font-size:10px; color:#941946;">انقر للتكبير وفصل الفروع</span>`,
            { direction: 'top', offset: [0, -38] }
          );

          clusterMarker.on('click', () => {
            map.setView([cluster.lat, cluster.lng], Math.min(map.getZoom() + 2, 18), { animate: true });
          });

          markersLayerRef.current?.addLayer(clusterMarker);
        } else {
          // --- INDIVIDUAL MARKER: Shows Facility Brand Logo & Discount ---
          const provider = cluster.providers[0];
          const isSelected = activeProvider?.id === provider.id;

          // Resolve facility brand name/logo label
          let brandText = provider.logo;
          if (provider.logo === 'ALMOKHTABAR') brandText = 'المختبر';
          else if (provider.logo === 'ALBORG') brandText = 'البرج';
          else if (provider.logo === 'CLEOPATRA') brandText = 'كليوباترا';
          else if (provider.logo === 'SGH') brandText = 'السعودي الألماني';
          else if (provider.logo === 'ALPHA') brandText = 'ألفا';
          else if (provider.logo === 'CAIRO_SCAN') brandText = 'كايرو سكان';
          else {
            brandText = provider.name.replace(/فرع.*/, '').replace(/مستشفى|معامل|صيدليات|مركز/g, '').trim().substring(0, 10) || provider.categoryAr;
          }

          const markerHtml = `
            <div class="relative flex flex-col items-center group cursor-pointer transition-transform duration-200 ${
              isSelected ? 'scale-125 z-50' : 'hover:scale-110'
            }">
              <div class="px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-md text-[9px] font-black text-rose-700 whitespace-nowrap mb-0.5 flex items-center gap-0.5">
                <span>خصم</span>
                <span class="font-mono">%${provider.discountPercentage}</span>
              </div>
              <div class="px-2.5 py-1 rounded-xl bg-white border-2 ${
                isSelected ? 'border-amber-400 ring-2 ring-amber-400' : 'border-[#941946]'
              } shadow-lg flex items-center justify-center">
                <span class="text-[10px] font-black text-slate-900 leading-none whitespace-nowrap">${brandText}</span>
              </div>
              <div class="w-2 h-2 bg-[#941946] rotate-45 -mt-1 shadow-xs"></div>
            </div>
          `;

          const customIcon = L.divIcon({
            html: markerHtml,
            className: 'custom-provider-marker',
            iconSize: [46, 50],
            iconAnchor: [23, 48],
          });

          const marker = L.marker([provider.lat, provider.lng], { icon: customIcon });

          marker.on('click', () => {
            setActiveProvider(provider);
            map.panTo([provider.lat, provider.lng], { animate: true });
          });

          markersLayerRef.current?.addLayer(marker);
        }
      });
    };

    renderMarkersAndClusters();

    map.on('zoomend moveend', renderMarkersAndClusters);
    return () => {
      map.off('zoomend moveend', renderMarkersAndClusters);
    };
  }, [filteredProviders, activeProvider, userLocation, maxRadiusKm]);

  const handleCenterOnUser = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
    }
  };

  return (
    <div className="space-y-3 pb-20 animate-in fade-in duration-200">
      {/* 1. Interactive Search & Radius Controls */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
        {/* Search input with view toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم المستشفى، المعمل، أو المنطقة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Toggle Map / List view */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'map' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض الخريطة"
            >
              <Compass className="w-4 h-4" />
              <span className="hidden sm:inline">الخريطة</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === 'list' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض كقائمة"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">القائمة</span>
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({providers.length})
          </button>
          <button
            onClick={() => onSelectCategory('hospitals')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'hospitals'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            مستشفيات وعيادات
          </button>
          <button
            onClick={() => onSelectCategory('labs')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'labs'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            معامل تحاليل
          </button>
          <button
            onClick={() => onSelectCategory('pharmacies')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'pharmacies'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            صيدليات
          </button>
          <button
            onClick={() => onSelectCategory('radiology')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'radiology'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            مراكز أشعة
          </button>
          <button
            onClick={() => onSelectCategory('dental_optical')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'dental_optical'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            أسنان وعيون
          </button>
        </div>
      </div>

      {/* 2. Map Container or List View */}
      {viewMode === 'map' ? (
        <div className="relative w-full h-[480px] sm:h-[540px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm">
          {/* Map Target */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Floating Compact Select over map ("only small select with the km number to make more space visible on the map") */}
          <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 bg-white/95 backdrop-blur-md rounded-2xl px-2.5 py-1.5 shadow-md border border-slate-200/90 text-xs font-bold text-slate-800">
            <Navigation className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <label htmlFor="map-radius-select" className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
              النطاق:
            </label>
            <select
              id="map-radius-select"
              value={maxRadiusKm}
              onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
              className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-lg px-2 py-0.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
            >
              <option value={3}>3 كم</option>
              <option value={5}>5 كم</option>
              <option value={10}>10 كم</option>
              <option value={25}>25 كم</option>
              <option value={50}>الكل</option>
            </select>
            <span className="text-[10px] text-slate-500 font-semibold pr-1.5 border-r border-slate-200 whitespace-nowrap">
              {sortedProviders.length} فرع
            </span>
          </div>

          {/* Floating Center & GPS Controls over map */}
          <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5">
            <button
              onClick={handleCenterOnUser}
              className="w-8 h-8 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-800 rounded-xl shadow-md border border-slate-200 flex items-center justify-center transition-all active:scale-95"
              title="التركيز على موقعي الحالي"
            >
              <Navigation className="w-4 h-4 text-rose-600 fill-rose-100" />
            </button>

            <button
              onClick={onRequestGps}
              disabled={isGpsLoading}
              className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-slate-800 hover:bg-slate-50 rounded-xl shadow-md border border-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>{isGpsLoading ? 'جاري...' : 'GPS'}</span>
            </button>
          </div>

          {/* Active Provider Bottom Card (Floating overlay when a pin is clicked) */}
          {activeProvider && (
            <div className="absolute bottom-3 left-3 right-3 z-[500] bg-white rounded-2xl p-3.5 shadow-2xl border border-slate-200/90 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center font-black text-sm shrink-0">
                    {activeProvider.logo.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {activeProvider.name}
                      </h4>
                      <span className="text-[10px] font-bold text-white bg-rose-600 px-2 py-0.5 rounded-md">
                        {activeProvider.discount}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {activeProvider.address}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="font-bold text-rose-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        يبعد {formatDistance(activeProvider.distanceKm)}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        {activeProvider.rating} ({activeProvider.reviewsCount})
                      </span>
                      {activeProvider.is24h && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded text-[10px]">
                            مفتوح 24 ساعة
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveProvider(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeProvider.lat},${activeProvider.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-rose-700" />
                  <span>الاتجاهات</span>
                </a>

                <a
                  href={`tel:${activeProvider.phone}`}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>اتصال</span>
                </a>

                <button
                  onClick={() => onSelectProvider(activeProvider)}
                  className="py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs"
                >
                  <span>كشف الخصومات</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-2.5">
          <div className="bg-white rounded-2xl px-3 py-2 border border-slate-200/90 shadow-2xs flex items-center justify-between text-xs font-bold text-slate-800">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>نطاق البحث:</span>
              <select
                value={maxRadiusKm}
                onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
                className="bg-slate-100 text-slate-900 text-xs font-bold rounded-lg px-2 py-0.5 border border-slate-200 cursor-pointer"
              >
                <option value={3}>3 كم</option>
                <option value={5}>5 كم</option>
                <option value={10}>10 كم</option>
                <option value={25}>25 كم</option>
                <option value={50}>الكل</option>
              </select>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {sortedProviders.length} فرع متاح
            </span>
          </div>

          {sortedProviders.map((provider) => (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider)}
              className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-800 font-black text-xs shrink-0 group-hover:bg-rose-50 group-hover:text-rose-700 transition-colors">
                  {provider.logo.substring(0, 3)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                      {provider.name}
                    </h4>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      {provider.discount}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {provider.specialty}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                    <span className="font-bold text-rose-700 flex items-center gap-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {formatDistance(provider.distanceKm)}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{provider.address}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                <a
                  href={`tel:${provider.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs flex items-center gap-1 font-semibold"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{provider.phone}</span>
                </a>

                <button
                  onClick={() => onSelectProvider(provider)}
                  className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  تفاصيل الخصم
                </button>
              </div>
            </div>
          ))}

          {sortedProviders.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">لم يتم العثور على فروع مطابقة</p>
              <p className="text-xs text-slate-500 mt-1">جرب زيادة نطاق البحث أو تغيير كلمة البحث</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMaxRadiusKm(50);
                  onSelectCategory('all');
                }}
                className="mt-3 px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
