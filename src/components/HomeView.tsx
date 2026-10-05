/**
 * ==============================================================================
 * 📌 DEILAR HOME DASHBOARD VIEW (HomeView.tsx)
 * ==============================================================================
 * 
 * 🤖 AI / CLAUDE DEVELOPER GUIDE:
 * This component is the primary landing screen of the mobile/web app.
 * Key UI Sections to maintain:
 * 
 * 1. 🎫 Hero Promotional Banner:
 *    - Highlights up to 50% discount with a floating preview of the Deilar Card.
 *    - Clicking the card preview opens the user's Card page (`onNavigateToCard`).
 * 
 * 2. ⚡ 3 Primary Quick Navigation Buttons:
 *    - `المتجر` (Store): routes to StoreView (`onNavigateToStore`).
 *    - `منتجاتنا` (Products): routes to ProductsView (`onNavigateToProducts`).
 *    - `كرتي الطبي` (Card): routes to ProfileView (`onNavigateToCard`).
 * 
 * 3. 🏥 6 Medical Facility Buttons with Expressive Icons:
 *    - [المستشفيات (Building2), معامل التحاليل (FlaskConical), الصيدليات (Pill),
 *       عيادات الأطباء (Stethoscope), مراكز الأشعة (Activity), الأسنان والعيون (Sparkles)].
 *    - Clicking any of these 6 buttons calls `onNavigateToMap(categoryKey)` to filter the map!
 * 
 * 4. 🧮 Interactive Medical Savings Calculator:
 *    - Allows users to drag/type bill amounts and see instant calculated Deilar discount.
 * 
 * 5. 📍 Nearest Medical Providers List:
 *    - Displays 3 nearest branches based on the user's live GPS/selected location.
 * ==============================================================================
 */

import React, { useState } from 'react';
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
  // Nearest 3 providers sorted by distance
  const nearestProviders = [...providersWithDistance].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);

  return (
    <div className="relative space-y-5 pb-24 pt-2 animate-in fade-in duration-200">
      {/* Ambient background card watermark for visual depth */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden opacity-10 -z-10">
        <img
          src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
          alt="Deilar Card Background"
          className="w-full h-full object-cover scale-125 blur-[1px] rotate-[-5deg]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white" />
      </div>

      {/* 2. Quick Location & Search Bar */}
      <section className="bg-white rounded-xl p-2.5 border border-slate-200/80 shadow-xs flex items-center gap-2">
        <button
          onClick={onSearchOpen}
          className="flex-1 flex items-center gap-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100/80 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-right"
        >
          <Search className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="truncate">ابحث باسم المستشفى، المعمل، الطبيب أو التخصص...</span>
        </button>

        <button
          onClick={() => onNavigateToMap()}
          className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-[#931A47] border border-rose-200/70 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors shrink-0"
          title="فتح الخريطة التفاعلية"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-700" />
          <span>الخريطة</span>
        </button>
      </section>

      {/* 
        PRIMARY ACTION BUTTONS:
        - زرار للمتجر
        - زرار للمنتجات
        - زرار عشان اشوف الكارت
      */}
      <section className="grid grid-cols-3 gap-2">
        <button
          onClick={onNavigateToStore}
          className="p-3 bg-gradient-to-br from-[#941946] to-[#6d1232] text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[96px]"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <Store className="w-5 h-5 text-amber-300" />
          </div>
          <div className="mt-1.5">
            <span className="block text-xs font-black leading-tight">المتجر</span>
            <span className="block text-[9px] text-rose-200 leading-tight mt-0.5">بن • عسل • زيت</span>
          </div>
        </button>

        <button
          onClick={onNavigateToProducts}
          className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[96px]"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="mt-1.5">
            <span className="block text-xs font-black leading-tight">منتجاتنا</span>
            <span className="block text-[9px] text-amber-100 leading-tight mt-0.5">العروض والطلب</span>
          </div>
        </button>

        <button
          onClick={onNavigateToCard}
          className="p-3 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-sm hover:shadow-md active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[96px]"
        >
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-1.5">
            <span className="block text-xs font-black leading-tight">كرتي الطبي</span>
            <span className="block text-[9px] text-slate-300 leading-tight mt-0.5">عرض وتحميل</span>
          </div>
        </button>
      </section>

      {/* 
        6 MEDICAL FACILITIES BUTTONS WITH ICONS:
        "فى الرئيسيه عايز 6 زراير مع ايقونات تعبر عن انواع المنشئات الطبيه الى موجوده"
      */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">المنشآت والخدمات الطبية المعتمدة</h2>
            <p className="text-[11px] text-slate-500">اختر نوع المنشأة الطبية للاطلاع على المستشفيات والمراكز ونسب الخصم</p>
          </div>
          <button
            onClick={() => onNavigateToMap()}
            className="text-xs font-bold text-[#941946] hover:underline flex items-center gap-0.5"
          >
            <span>الكل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Grid facility buttons with expressive medical icons */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              id: 'hospitals' as ProviderCategory,
              titleAr: 'المستشفيات',
              icon: Building2,
              discount: 'خصم حتى 35%',
              badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
              iconBg: 'bg-rose-100 text-rose-800',
            },
            {
              id: 'labs' as ProviderCategory,
              titleAr: 'معامل التحاليل',
              icon: FlaskConical,
              discount: 'خصم حتى 50%',
              badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
              iconBg: 'bg-blue-100 text-blue-800',
            },
            {
              id: 'pharmacies' as ProviderCategory,
              titleAr: 'الصيدليات',
              icon: Pill,
              discount: 'خصم حتى 20%',
              badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              iconBg: 'bg-emerald-100 text-emerald-800',
            },
            {
              id: 'clinics' as ProviderCategory,
              titleAr: 'عيادات الأطباء',
              icon: Stethoscope,
              discount: 'خصم حتى 30%',
              badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              iconBg: 'bg-indigo-100 text-indigo-800',
            },
            {
              id: 'radiology' as ProviderCategory,
              titleAr: 'مراكز الأشعة',
              icon: Activity,
              discount: 'خصم حتى 40%',
              badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
              iconBg: 'bg-amber-100 text-amber-800',
            },
            {
              id: 'dental_optical' as ProviderCategory,
              titleAr: 'الأسنان والعيون',
              icon: Sparkles,
              discount: 'خصم حتى 45%',
              badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
              iconBg: 'bg-purple-100 text-purple-800',
            },
          ].map((facility) => {
            const Icon = facility.icon;
            return (
              <button
                key={facility.id}
                onClick={() => onNavigateToMap(facility.id)}
                className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 active:scale-95 transition-all text-center flex flex-col items-center justify-between group min-h-[102px]"
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${facility.iconBg} shadow-2xs group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="mt-1.5 space-y-1 w-full">
                  <span className="block text-[11px] font-extrabold text-slate-800 group-hover:text-[#941946] transition-colors truncate">
                    {facility.titleAr}
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
              <h2 className="text-sm font-bold text-slate-900">اقرب مقدم خدمه(القاهره)</h2>
            </div>
          </div>

          <button
            onClick={() => onNavigateToMap()}
            className="text-xs font-bold text-[#931A47] hover:underline flex items-center gap-1"
          >
            <span>فتح الخريطة</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nearest List Cards - Harmonious layout: Photo + Title + Facility Type + Distance + Discount Tag */}
        <div className="space-y-3">
          {nearestProviders.map((provider) => {
            const providerPhoto = provider.imageUrl || 
              (provider.category === 'labs' ? '/src/assets/images/sector_medical_labs_1791011785809.jpg' :
               provider.category === 'pharmacies' ? '/src/assets/images/sector_pharmacy_1791011795635.jpg' :
               provider.category === 'dental_optical' ? '/src/assets/images/sector_dental_eye_1791011806216.jpg' :
               '/src/assets/images/sector_health_care_1791011774979.jpg');

            return (
              <div
                key={provider.id}
                onClick={() => onSelectProvider(provider)}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all cursor-pointer p-2.5 flex items-center gap-3 group overflow-hidden"
              >
                {/* 1. صوره (Image) */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                  <img
                    src={providerPhoto}
                    alt={provider.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />
                </div>

                {/* 2. العنوان + 3. نوع المنشأة + 4. الكيلومترات + 5. الخصم */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-1.5">
                  {/* 2. العنوان (Title / Name) */}
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#941946] transition-colors truncate leading-tight">
                    {provider.name}
                  </h3>

                  {/* 3. نوع المنشأه (Facility Type) */}
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                      {provider.categoryAr}
                    </span>
                  </div>

                  {/* السطر السفلي: 4. الكيلومترات + 5. الخصم (منفصلين ومنسقين بدون تداخل) */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    {/* 4. الكيلومترات */}
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-[#941946] shrink-0" />
                      <span>{formatDistance(provider.distanceKm)}</span>
                    </div>

                    {/* 5. الخصم كا تاج */}
                    <span className="px-2 py-0.5 bg-rose-50 text-[#941946] border border-rose-200/80 rounded-md text-[10px] font-extrabold whitespace-nowrap shadow-2xs">
                      {provider.discount}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. Popular Services & Brands (Directly matching "Popular Services" in uploaded image) */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Popular Services</h2>
            <p className="text-xs text-slate-500">أشهر الشركاء والمستشفيات والمعامل المعتمدة</p>
          </div>
        </div>

        {/* Brand Grid matching the 4-box layout in screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MEDICAL_PROVIDERS.filter((p) => p.popular).slice(0, 4).map((provider) => (
            <button
              key={provider.id}
              onClick={() => onSelectProvider(provider)}
              className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-rose-300 transition-all text-center flex flex-col items-center justify-between min-h-[140px] group focus:outline-none"
            >
              {/* Brand Logo / Emblem */}
              <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2 mb-2 group-hover:scale-105 transition-transform">
                {provider.logo === 'ALMOKHTABAR' && (
                  <div className="text-center">
                    <div className="text-rose-600 font-black text-xs leading-none">المختبر</div>
                    <div className="text-[9px] text-slate-500 mt-0.5 font-bold">معامل مؤمنة كامل</div>
                  </div>
                )}
                {provider.logo === 'ALBORG' && (
                  <div className="text-center">
                    <div className="text-blue-700 font-black text-xs leading-none">معامل البرج</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">دقة وأمان</div>
                  </div>
                )}
                {provider.logo === 'CLEOPATRA' && (
                  <div className="text-center">
                    <div className="text-indigo-800 font-black text-xs leading-none">كليوباترا</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">مستشفيات رائدة</div>
                  </div>
                )}
                {provider.logo === 'SGH' && (
                  <div className="text-center">
                    <div className="text-emerald-700 font-black text-xs leading-none">السعودي الألماني</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">نرعاكم كأهالينا</div>
                  </div>
                )}
                {!['ALMOKHTABAR', 'ALBORG', 'CLEOPATRA', 'SGH'].includes(provider.logo) && (
                  <div className="text-center">
                    <div className="text-[#931A47] font-black text-xs">{provider.name.split(' ')[0]}</div>
                    <div className="text-[8px] text-slate-500 mt-0.5">{provider.categoryAr}</div>
                  </div>
                )}
              </div>

              {/* Title & Discount */}
              <div className="w-full">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#931A47] transition-colors truncate">
                  {provider.name}
                </p>
                <div className="mt-1 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-[#931A47] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    خصم {provider.discountPercentage}%
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 8. Trust Highlights */}
      <section className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Shield className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">بدون موافقات</p>
          <p className="text-[10px] text-slate-500">خصم فوري مباشر</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Clock className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">استخدام غير محدود</p>
          <p className="text-[10px] text-slate-500">طوال مدة الاشتراك</p>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
          <Award className="w-4 h-4 text-[#931A47] mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-800">أكثر من 3000 فرع</p>
          <p className="text-[10px] text-slate-500">في جميع المحافظات</p>
        </div>
      </section>
    </div>
  );
};
