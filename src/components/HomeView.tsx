import React from 'react';
import { 
  Sparkles, 
  MapPin, 
  Search, 
  Percent, 
  ArrowLeft, 
  Clock, 
  Star, 
  Shield, 
  ChevronLeft,
  ChevronRight,
  Award,
  CreditCard,
  Building2,
  FlaskConical,
  Pill,
  Stethoscope,
  Activity,
  Store,
  Package
} from 'lucide-react';
import type { FacilityCard } from '../api/types';
import { api, PATHS } from '../api/endpoints';
import { peek } from '../api/http';
import { formatKm, roundCoord } from '../api/adapters';
import { useApi } from '../hooks/useApi';
import { useFacilityTypes } from '../hooks/useCatalog';
import { useLazySection } from '../hooks/useLazySection';
import { facilityTypeStyle } from '../utils/facilityTypeStyle';
import { ListSkeleton, Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { useLanguage } from '../context/LanguageContext';
import { Link } from '../router';

import type { Area } from '../utils/area';

const NEAREST_COUNT = 3;
const TYPE_TILES = 6;

interface HomeViewProps {
  userLocation: { lat: number; lng: number; name: string };
  area: Area | null;
  onSelectProvider: (provider: FacilityCard) => void;
  onSearchOpen: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  userLocation,
  area,
  onSelectProvider,
  onSearchOpen,
}) => {
  const { isAr, t, brandName } = useLanguage();

  // The server sorts by nearest branch; we ask for just the few cards this section draws.
  const nearestParams = { lat: roundCoord(userLocation.lat), lng: roundCoord(userLocation.lng), per_page: NEAREST_COUNT, governorate_id: area?.governorate.id, city_id: area?.city?.id };
  // Nothing is requested while the page paints: each section loads after the first scroll, as it nears the screen.
  const [typesRef] = useLazySection<HTMLElement>();
  const [nearestRef, nearestNear] = useLazySection<HTMLElement>();

  // What this device saw last time, if anything: painted at once, refreshed behind it.
  const savedNearest = peek<{ data: FacilityCard[] }>(PATHS.facilities, nearestParams)?.data;
  const nearest = useApi(
    // Waits for a scroll only when there is nothing saved to show — otherwise the list is already on screen.
    nearestNear || savedNearest ? `home-nearest:${JSON.stringify(nearestParams)}:${isAr}` : null,
    (signal) => api.facilities(nearestParams, signal, true).then((r) => r.data),
    () => peek<{ data: FacilityCard[] }>(PATHS.facilities, nearestParams)?.data,
  );
  const nearestProviders = nearest.data ?? [];

  // The tiles are tiny and sit at the top: load them straight away (and from the saved copy when there is one),
  // not after the first scroll — that wait is what made the section look hidden.
  const types = useFacilityTypes();
  const typeTiles = (types.data ?? []).slice(0, TYPE_TILES);

  return (
    <div className={`relative space-y-5 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* 2. Quick Location & Search Bar */}
      <section className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs flex items-center gap-2">
        <button
          onClick={onSearchOpen}
          className={`flex-1 flex items-center gap-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100/80 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${isAr ? 'text-right' : 'text-left'}`}
        >
          <Search className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="truncate">
            {isAr ? 'ابحث باسم المستشفى، المعمل، الطبيب أو التخصص...' : 'Search hospital, lab, doctor or specialty...'}
          </span>
        </button>

        <Link
          to={{ tab: 'map' }}
          className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-[#931A47] border border-rose-200/70 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
          title={t('navMap')}
          aria-label={t('navMap')}
        >
          <MapPin className="w-3.5 h-3.5 text-rose-700" />
        </Link>
      </section>

      {/* PRIMARY ACTION BUTTONS: Store, Products, Card */}
      <section className="grid grid-cols-3 gap-2">
        <Link
          to={{ tab: 'store' }}
          className="py-3 px-2 bg-gradient-to-br from-[#941946] to-[#6d1232] text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <Store className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <span className="block text-sm font-black leading-tight">{t('quickBtnStore')}</span>
          </div>
        </Link>

        <Link
          to={{ tab: 'products' }}
          className="py-3 px-2 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="block text-sm font-black leading-tight">{t('quickBtnProducts')}</span>
          </div>
        </Link>

        <Link
          to={{ tab: 'profile' }}
          className="py-3 px-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <span className="block text-sm font-black leading-tight">{t('quickBtnCard')}</span>
          </div>
        </Link>
      </section>

      {/* 6 MEDICAL FACILITIES BUTTONS WITH ICONS */}
      <section ref={typesRef} className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('facilitiesTitle')}</h2>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'اختر نوع المنشأة للاطلاع على المستشفيات والمراكز ونسب الخصم' : 'Select facility type to view accredited hospitals & discount rates'}
            </p>
          </div>
          <Link
            to={{ tab: 'map' }}
            className="text-xs font-bold text-[#941946] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{isAr ? 'الكل' : 'All'}</span>
            <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
          </Link>
        </div>

        {/* Facility type tiles — the most populated types, straight from the API */}
        <div className="grid grid-cols-3 gap-2">
          {types.loading &&
            Array.from({ length: TYPE_TILES }).map((_, i) => <Skeleton key={i} className="min-h-[6.375rem] rounded-2xl" />)}

          {typeTiles.map((type, index) => {
            const style = facilityTypeStyle(type, index);
            const Icon = style.icon;
            return (
              <Link
                key={type.id}
                to={{ tab: 'map', typeId: type.id }}
                className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[6.375rem] cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${style.iconBg} shadow-2xs group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="mt-1.5 space-y-1 w-full">
                  <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-[#941946] transition-colors truncate">
                    {type.name}
                  </span>
                  <span className={`inline-block text-[8.5px] font-bold px-1.5 py-0.2 rounded-md border ${style.badgeColor}`}>
                    {isAr ? `${type.count} منشأة` : `${type.count} facilities`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Nearest Medical Providers to User Location */}
      <section ref={nearestRef} className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#931A47] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'أقرب مقدمي الخدمة إليك' : 'Nearest Medical Providers'}
              </h2>
            </div>
          </div>

          <Link
            to={{ tab: 'map' }}
            className="text-xs font-bold text-[#931A47] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isAr ? 'فتح الخريطة' : 'Open Map'}</span>
            <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
          </Link>
        </div>

        {/* Nearest List Cards */}
        <div className="space-y-3">
          {(nearest.loading || (!nearestNear && !nearestProviders.length)) && <ListSkeleton rows={NEAREST_COUNT} />}

          {nearestProviders.map((provider, position) => (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all cursor-pointer p-2.5 flex items-center gap-3 group overflow-hidden"
            >
              <Thumb
                src={provider.logo}
                alt={provider.name}
                kind="facility"
                fit="contain"
                priority={position < 3}
                className="w-20 h-20 rounded-xl shrink-0 border border-slate-100"
              />

              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#941946] transition-colors truncate leading-tight">
                  {provider.name}
                </h3>

                {provider.type && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                      {provider.type.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">
                      {formatKm(provider.distance_km, isAr) ?? provider.branch?.city ?? provider.branch?.governorate}
                    </span>
                  </div>

                  {provider.discount != null && (
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      {isAr ? `خصم ${provider.discount}%` : `${provider.discount}% OFF`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Trust Highlights */}
      <section className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Shield className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">{isAr ? 'بدون موافقات' : 'No Pre-approvals'}</p>
          <p className="text-[10px] text-slate-500">{isAr ? 'خصم فوري مباشر' : 'Instant Direct Discount'}</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Clock className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">{isAr ? 'استخدام غير محدود' : 'Unlimited Visits'}</p>
          <p className="text-[10px] text-slate-500">{isAr ? 'طوال مدة الاشتراك' : 'Throughout Subscription'}</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Award className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">{isAr ? 'أكثر من 3000 فرع' : '3000+ Branches'}</p>
          <p className="text-[10px] text-slate-500">{isAr ? 'في جميع المحافظات' : 'Across All Governorates'}</p>
        </div>
      </section>
    </div>
  );
};
