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
import { SECTOR_CARDS, MEDICAL_PROVIDERS } from '../data/mockData';
import { MedicalProvider, ProviderCategory } from '../types';
import { formatDistance } from '../utils/geo';
import { useLanguage } from '../context/LanguageContext';

interface HomeViewProps {
  userLocation: { lat: number; lng: number; name: string };
  providersWithDistance: (MedicalProvider & { distanceKm: number })[];
  onSelectProvider: (provider: MedicalProvider) => void;
  onNavigateToMap: (category?: ProviderCategory) => void;
  onNavigateToCard: () => void;
  onNavigateToStore?: () => void;
  onNavigateToProducts?: () => void;
  onSearchOpen: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  userLocation,
  providersWithDistance,
  onSelectProvider,
  onNavigateToMap,
  onNavigateToCard,
  onNavigateToStore,
  onNavigateToProducts,
  onSearchOpen,
}) => {
  const { isAr, t, brandName } = useLanguage();

  // Nearest 3 providers sorted by distance
  const nearestProviders = [...providersWithDistance].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);

  return (
    <div className={`relative space-y-5 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* Ambient background card watermark for visual depth */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden opacity-10 -z-10">
        <img
          src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
          alt="Deilar Card Background"
          className="w-full h-full object-cover scale-125 blur-[1px] rotate-[-5deg]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white dark:via-[#0A0E17]/80 dark:to-[#0A0E17]" />
      </div>

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

        <button
          onClick={() => onNavigateToMap()}
          className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-[#931A47] border border-rose-200/70 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors shrink-0 cursor-pointer"
          title={t('navMap')}
        >
          <MapPin className="w-3.5 h-3.5 text-rose-700" />
          <span>{t('navMap')}</span>
        </button>
      </section>

      {/* PRIMARY ACTION BUTTONS: Store, Products, Card */}
      <section className="grid grid-cols-3 gap-2">
        <button
          onClick={onNavigateToStore}
          className="p-3 bg-gradient-to-br from-[#941946] to-[#6d1232] text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[96px] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <Store className="w-5 h-5 text-amber-300" />
          </div>
          <div className="mt-1.5">
            <span className="block text-xs font-black leading-tight">{t('quickBtnStore')}</span>
            <span className="block text-[9px] text-rose-200 leading-tight mt-0.5">
              {isAr ? 'بن • عسل • زيت' : 'Coffee • Honey • Oil'}
            </span>
          </div>
        </button>

        <button
          onClick={onNavigateToProducts}
          className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[96px] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="mt-1.5">
            <span className="block text-xs font-black leading-tight">{t('quickBtnProducts')}</span>
            <span className="block text-[9px] text-amber-100 leading-tight mt-0.5">
              {isAr ? 'العروض والطلب' : 'Offers & Order'}
            </span>
          </div>
        </button>

        <button
          onClick={onNavigateToCard}
          className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[96px] cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-1.5">
            <span className="block text-xs font-black leading-tight">{t('quickBtnCard')}</span>
            <span className="block text-[9px] text-slate-300 leading-tight mt-0.5">
              {isAr ? 'عرض وتحميل' : 'View & Download'}
            </span>
          </div>
        </button>
      </section>

      {/* 6 MEDICAL FACILITIES BUTTONS WITH ICONS */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{t('facilitiesTitle')}</h2>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'اختر نوع المنشأة الطبية للاطلاع على المستشفيات والمراكز ونسب الخصم' : 'Select facility type to view accredited hospitals & discount rates'}
            </p>
          </div>
          <button
            onClick={() => onNavigateToMap()}
            className="text-xs font-bold text-[#941946] hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>{isAr ? 'الكل' : 'All'}</span>
            <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* 6 Grid facility buttons with expressive medical icons */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: 'hospitals' as ProviderCategory,
              title: isAr ? 'المستشفيات' : 'Hospitals',
              icon: Building2,
              discount: isAr ? 'خصم حتى 35%' : 'Up to 35% OFF',
              badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
              iconBg: 'bg-rose-100 text-rose-800',
            },
            {
              id: 'labs' as ProviderCategory,
              title: isAr ? 'معامل التحاليل' : 'Clinical Labs',
              icon: FlaskConical,
              discount: isAr ? 'خصم حتى 50%' : 'Up to 50% OFF',
              badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
              iconBg: 'bg-blue-100 text-blue-800',
            },
            {
              id: 'pharmacies' as ProviderCategory,
              title: isAr ? 'الصيدليات' : 'Pharmacies',
              icon: Pill,
              discount: isAr ? 'خصم حتى 20%' : 'Up to 20% OFF',
              badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              iconBg: 'bg-emerald-100 text-emerald-800',
            },
            {
              id: 'clinics' as ProviderCategory,
              title: isAr ? 'عيادات الأطباء' : 'Clinics',
              icon: Stethoscope,
              discount: isAr ? 'خصم حتى 30%' : 'Up to 30% OFF',
              badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              iconBg: 'bg-indigo-100 text-indigo-800',
            },
            {
              id: 'radiology' as ProviderCategory,
              title: isAr ? 'مراكز الأشعة' : 'Radiology',
              icon: Activity,
              discount: isAr ? 'خصم حتى 40%' : 'Up to 40% OFF',
              badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
              iconBg: 'bg-amber-100 text-amber-800',
            },
            {
              id: 'dental_optical' as ProviderCategory,
              title: isAr ? 'الأسنان والعيون' : 'Dental & Eye',
              icon: Sparkles,
              discount: isAr ? 'خصم حتى 45%' : 'Up to 45% OFF',
              badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
              iconBg: 'bg-purple-100 text-purple-800',
            },
          ].map((facility) => {
            const Icon = facility.icon;
            return (
              <button
                key={facility.id}
                onClick={() => onNavigateToMap(facility.id)}
                className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[102px] cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${facility.iconBg} shadow-2xs group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="mt-1.5 space-y-1 w-full">
                  <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-[#941946] transition-colors truncate">
                    {facility.title}
                  </span>
                  <span className={`inline-block text-[8.5px] font-bold px-1.5 py-0.2 rounded-md border ${facility.badgeColor}`}>
                    {facility.discount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Nearest Medical Providers to User Location */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#931A47] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'أقرب مقدم خدمة (القاهرة)' : 'Nearest Medical Providers (Cairo)'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => onNavigateToMap()}
            className="text-xs font-bold text-[#931A47] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isAr ? 'فتح الخريطة' : 'Open Map'}</span>
            <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Nearest List Cards */}
        <div className="space-y-3">
          {nearestProviders.map((provider) => {
            const providerPhoto = provider.imageUrl || 
              (provider.category === 'labs' ? '/src/assets/images/sector_medical_labs_1791011785809.jpg' :
               provider.category === 'pharmacies' ? '/src/assets/images/sector_pharmacy_1791011795635.jpg' :
               provider.category === 'dental_optical' ? '/src/assets/images/sector_dental_eye_1791011806216.jpg' :
               '/src/assets/images/sector_health_care_1791011774979.jpg');

            const displayName = isAr ? provider.name : (provider.nameEn || provider.name);
            const displayCat = isAr ? provider.categoryAr : provider.category;

            return (
              <div
                key={provider.id}
                onClick={() => onSelectProvider(provider)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all cursor-pointer p-2.5 flex items-center gap-3 group overflow-hidden"
              >
                {/* 1. Image */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                  <img
                    src={providerPhoto}
                    alt={displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
                </div>

                {/* 2. Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#941946] transition-colors truncate leading-tight">
                    {displayName}
                  </h3>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                      {displayCat}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-rose-600" />
                      <span>{provider.distanceKm?.toFixed(1) || '1.2'} {isAr ? 'كم' : 'km'}</span>
                    </div>

                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      {isAr ? `خصم ${provider.discountPercentage}%` : `${provider.discountPercentage}% OFF`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
