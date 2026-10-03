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
  Calculator,
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
  // Calculator state
  const [calcServiceType, setCalcServiceType] = useState<'labs' | 'clinics' | 'radiology' | 'dental'>('labs');
  const [calcAmount, setCalcAmount] = useState<number>(2500);

  // Discount percentage calculation for the calculator
  const discountRates = {
    labs: 0.45,
    clinics: 0.30,
    radiology: 0.35,
    dental: 0.40,
  };
  const currentDiscountRate = discountRates[calcServiceType];
  const moneySaved = Math.round(calcAmount * currentDiscountRate);
  const finalPrice = calcAmount - moneySaved;

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

      {/* 1. Hero Promotional Banner (Matching the user's reference image with Card visible!) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-rose-800 text-white shadow-xl shadow-rose-950/20">
        {/* Card ambient graphic behind the banner */}
        <div className="absolute -left-12 -bottom-10 w-64 h-44 opacity-25 pointer-events-none rotate-12">
          <img
            src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
            alt="Card Backdrop"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        <div className="relative p-5 sm:p-6 flex flex-col justify-between min-h-[175px]">
          {/* Top highlight kicker */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-300 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              شبكة ديلار الطبية الشاملة 2026
            </span>
            <span className="text-[11px] bg-white/15 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full font-medium border border-white/20">
              بطاقة علاجية موحدة
            </span>
          </div>

          {/* Main Huge 50% Discounts graphic like in the uploaded image */}
          <div className="flex items-center justify-between gap-3 my-1">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm font-sans">
                  50%
                </span>
                <div className="flex flex-col">
                  <span className="bg-[#931A47] text-white font-extrabold text-sm sm:text-base px-2.5 py-0.5 rounded-md shadow-xs">
                    خصومات
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-rose-100 mt-0.5">
                    تصل إلى
                  </span>
                </div>
              </div>
              <p className="text-xs text-rose-100/90 mt-1.5 font-normal leading-relaxed">
                على المستشفيات والعمليات الجراحية، كشوفات الاستشاريين، معامل التحاليل والأشعة والصيدليات.
              </p>
            </div>

            {/* Floating 3D Medical Card Thumbnail Preview */}
            <div className="shrink-0 flex flex-col items-center">
              <button
                onClick={onNavigateToCard}
                className="group relative transition-transform active:scale-95 text-center focus:outline-none"
              >
                <div className="w-24 sm:w-28 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400/70 group-hover:scale-105 transition-all bg-white p-0.5">
                  <img
                    src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
                    alt="كارت ديلار الطبي"
                    className="w-full h-auto object-cover rounded-lg"
                  />
                </div>
                <span className="inline-block mt-1 text-[10px] font-bold text-amber-300 group-hover:underline">
                  كارت العيله ⟵
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

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

      {/* 5. Nearest Medical Providers to User Location (Geographic System Highlight) */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#931A47] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">أقرب مقدمي الخدمة لموقعك الآن</h2>
              <p className="text-[11px] text-slate-500">
                محدد بناءً على: {userLocation.name}
              </p>
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

        {/* Nearest List Cards */}
        <div className="space-y-2.5">
          {nearestProviders.map((provider) => (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider)}
              className="p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                {/* Logo Badge */}
                <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-800 font-extrabold text-xs shrink-0 group-hover:border-rose-200">
                  {provider.logo.substring(0, 3)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#931A47] transition-colors">
                      {provider.name}
                    </h3>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {provider.discount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="text-[#931A47] font-semibold flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {formatDistance(provider.distanceKm)}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[170px]">{provider.address}</span>
                  </div>
                </div>
              </div>

              <div className="text-left shrink-0">
                <span className="text-xs font-semibold text-[#931A47] group-hover:underline flex items-center gap-0.5">
                  التفاصيل
                  <ChevronLeft className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
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

      {/* 7. Instant Savings Calculator / حاسبة التوفير المالي بكرت ديلار */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg shadow-slate-950/20 relative overflow-hidden">
        {/* Subtle card glow in background */}
        <div className="absolute -left-10 -bottom-10 w-44 h-32 opacity-15 pointer-events-none">
          <img
            src="/src/assets/images/deilar_vip_card_mockup_1791012301520.jpg"
            alt="Card Ambient"
            className="w-full h-full object-cover rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 mb-3 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">حاسبة التوفير بكرت ديلار الطبي</h3>
            <p className="text-[11px] text-slate-300">احسب مقدار ما ستوفره فوراً في فاتورتك القادمة</p>
          </div>
        </div>

        {/* Category selector */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-800/80 rounded-xl mb-4 border border-slate-700 relative z-10">
          <button
            onClick={() => setCalcServiceType('labs')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              calcServiceType === 'labs' ? 'bg-[#931A47] text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            تحاليل (45%)
          </button>
          <button
            onClick={() => setCalcServiceType('radiology')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              calcServiceType === 'radiology' ? 'bg-[#931A47] text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            أشعة (35%)
          </button>
          <button
            onClick={() => setCalcServiceType('clinics')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              calcServiceType === 'clinics' ? 'bg-[#931A47] text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            كشف (30%)
          </button>
          <button
            onClick={() => setCalcServiceType('dental')}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              calcServiceType === 'dental' ? 'bg-[#931A47] text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            أسنان (40%)
          </button>
        </div>

        {/* Amount Slider */}
        <div className="space-y-2 mb-4 relative z-10">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300">قيمة الفاتورة المتوقعة:</span>
            <span className="text-amber-300 font-bold text-base font-mono">{calcAmount.toLocaleString()} ج.م</span>
          </div>
          <input
            type="range"
            min="300"
            max="15000"
            step="100"
            value={calcAmount}
            onChange={(e) => setCalcAmount(Number(e.target.value))}
            className="w-full accent-rose-600 bg-slate-700 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* Calculation Result */}
        <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center justify-between relative z-10">
          <div>
            <p className="text-[11px] text-slate-400">ستدفع فقط بعد الخصم:</p>
            <p className="text-lg font-black text-white font-mono">{finalPrice.toLocaleString()} ج.م</p>
          </div>

          <div className="text-left bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 rounded-lg">
            <p className="text-[10px] text-emerald-300 font-medium">قيمة التوفير الصافي:</p>
            <p className="text-base font-black text-emerald-400 font-mono">+{moneySaved.toLocaleString()} ج.م</p>
          </div>
        </div>

        <button
          onClick={onNavigateToCard}
          className="w-full mt-3 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 relative z-10"
        >
          <span>استخدم كرتك الطبي الآن للحصول على هذا الخصم</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
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
