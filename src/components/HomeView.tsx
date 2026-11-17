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
import { api, PATHS, fetchHomeShelves, type HomeShelves } from '../api/endpoints';
import { peek } from '../api/http';
import { formatKm, roundCoord } from '../api/adapters';
import { useApi } from '../hooks/useApi';
import { useFacilityTypes, useStoreCategories } from '../hooks/useCatalog';
import { useLazySection } from '../hooks/useLazySection';
import { facilityTypeStyle } from '../utils/facilityTypeStyle';
import { ListSkeleton, Skeleton } from './ui/Feedback';
import { ServiceSlider } from './ServiceSlider';
import { HomeShelf } from './HomeShelf';
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

/** Shorter Arabic names for the home tiles, which have room for one word. The type's full name shows everywhere else. */
const TILE_NAMES_AR: Record<string, string> = { 'medical-laboratories': 'معامل', 'batn-otkhssat-akhr': 'باطنة', hospitals: 'مستشفيات', 'dkatr-asnan': 'أسنان', 'radiology-centers': 'أشعة' };

export const HomeView: React.FC<HomeViewProps> = ({
  userLocation,
  area,
  onSelectProvider,
  onSearchOpen,
}) => {
  const { isAr, t, brandName } = useLanguage();

  // The tiles are tiny and sit at the top: load them straight away (and from the saved copy when there is one),
  // not after the first scroll — that wait is what made the section look hidden.
  const types = useFacilityTypes();
  const storeTypes = useStoreCategories();
  const chips = [
    ...(types.data ?? []).map((t) => ({ kind: 'medical' as const, id: t.id, name: t.name })),
    ...(storeTypes.data ?? []).map((t) => ({ kind: 'store' as const, id: t.id, name: t.name })),
  ];

  // The six home strips come in one request, from the server's daily saved copy.
  const shelves = useApi('home-shelves', (signal) => fetchHomeShelves(signal), () => peek<HomeShelves>('/mobile/home-shelves', {})?.shelves);
  const shelf = (key: keyof NonNullable<typeof shelves.data>) => (shelves.error ? [] : shelves.data?.[key] ?? null);

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
            {isAr ? 'ابحث عن مقدم الخدمة' : 'Search for a service provider'}
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

      {/* Endless strip of medical place types and store types, plus the button to the products page */}
      <section className="space-y-2">
        <ServiceSlider chips={chips} />
        <Link
          to={{ tab: 'products' }}
          className="py-2.5 px-4 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Package className="w-5 h-5" />
          <span className="text-sm font-black leading-tight">{t('quickBtnProducts')}</span>
        </Link>
      </section>

      {/* Kids' quiz game */}
      <Link
        to={{ quiz: true }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-l from-emerald-500 to-emerald-600 text-white shadow-sm active:scale-95 transition-all cursor-pointer overflow-hidden"
      >
        <span className="text-3xl animate-bounce">⚽</span>
        <div className="flex-1">
          <span className="block text-sm font-black leading-tight">{isAr ? 'العب واكسب' : 'Play and earn'}</span>
        </div>
        <span className="text-2xl">🏆</span>
      </Link>

      {/* Two buttons: the nearest medical provider and the nearest store; each opens its map */}
      <section className="grid grid-cols-2 gap-2">
        <Link
          to={{ tab: 'map' }}
          className="py-4 px-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#941946]/40 active:scale-95 transition-all text-center flex flex-col items-center gap-2 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center"><Stethoscope className="w-6 h-6" /></div>
          <span className="text-xs font-extrabold text-slate-800">{isAr ? 'أقرب مقدم خدمة طبية' : 'Nearest medical provider'}</span>
        </Link>
        <Link
          to={{ tab: 'store', storeMap: true }}
          className="py-4 px-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-[#941946]/40 active:scale-95 transition-all text-center flex flex-col items-center gap-2 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center"><Store className="w-6 h-6" /></div>
          <span className="text-xs font-extrabold text-slate-800">{isAr ? 'أقرب مقدم خدمة متاجر' : 'Nearest store'}</span>
        </Link>
      </section>

      {/* Six strips: most visited / best offers / newest, for stores and then for medical places. Dragged by hand; 3 cards, then 3 more at a time up to 12, then «see more». */}
      <div className="space-y-5">
        <HomeShelf kind="store" sort="visits" items={shelf('store_visits')} title={isAr ? 'أفضل المتاجر' : 'Top stores'} />
        <HomeShelf kind="store" sort="discount" items={shelf('store_discount')} title={isAr ? 'أفضل العروض' : 'Best offers'} />
        <HomeShelf kind="store" sort="newest" items={shelf('store_newest')} title={isAr ? 'أحدث المتاجر' : 'Newest stores'} />
        <HomeShelf kind="medical" sort="visits" items={shelf('medical_visits')} title={isAr ? 'أفضل الأماكن الطبية' : 'Top medical places'} />
        <HomeShelf kind="medical" sort="discount" items={shelf('medical_discount')} title={isAr ? 'أفضل العروض الطبية' : 'Best medical offers'} />
        <HomeShelf kind="medical" sort="newest" items={shelf('medical_newest')} title={isAr ? 'أحدث مقدمي الخدمات الطبية' : 'Newest medical providers'} />
      </div>

      {/* 8. Trust Highlights */}
      <section className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Shield className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">{isAr ? 'من غير موافقات' : 'No Pre-approvals'}</p>
          <p className="text-[10px] text-slate-500">{isAr ? 'خصم فوري على طول' : 'Instant Direct Discount'}</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Clock className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">{isAr ? 'استخدام من غير حدود' : 'Unlimited Visits'}</p>
          <p className="text-[10px] text-slate-500">{isAr ? 'طول مدة الاشتراك' : 'Throughout Subscription'}</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Award className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">{isAr ? 'أكتر من 3000 فرع' : '3000+ Branches'}</p>
          <p className="text-[10px] text-slate-500">{isAr ? 'في كل المحافظات' : 'Across All Governorates'}</p>
        </div>
      </section>
    </div>
  );
};
