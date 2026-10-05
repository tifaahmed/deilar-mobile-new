import React, { useState } from 'react';
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Star, 
  CheckCircle2, 
  Clock, 
  Navigation, 
  Tag, 
  CreditCard,
  Check,
  Copy,
  Building2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { MedicalProvider } from '../types';
import { formatDistance } from '../utils/geo';

interface ProviderDetailViewProps {
  provider: MedicalProvider & { distanceKm?: number };
  onBack: () => void;
  onNavigateToMap: () => void;
  onNavigateToCard: () => void;
}

export const ProviderDetailView: React.FC<ProviderDetailViewProps> = ({
  provider,
  onBack,
  onNavigateToMap,
  onNavigateToCard,
}) => {
  const [voucherGenerated, setVoucherGenerated] = useState<string | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const providerPhoto = provider.imageUrl || 
    (provider.category === 'labs' ? '/src/assets/images/sector_medical_labs_1791011785809.jpg' :
     provider.category === 'pharmacies' ? '/src/assets/images/sector_pharmacy_1791011795635.jpg' :
     provider.category === 'dental_optical' ? '/src/assets/images/sector_dental_eye_1791011806216.jpg' :
     '/src/assets/images/sector_health_care_1791011774979.jpg');

  const handleGenerateCode = () => {
    const code = `DEI-${(provider.logo || 'MED').substring(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setVoucherGenerated(code);
  };

  const handleCopyCode = () => {
    if (voucherGenerated) {
      navigator.clipboard.writeText(voucherGenerated);
      setCopiedVoucher(true);
      setTimeout(() => setCopiedVoucher(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `مرحباً ${provider.name}، أنا من حاملي كرت ديلار الطبي وأود الاستفسار عن كشف/فحص بنسبة الخصم المعتمدة (${provider.discount}).`
    );
    window.open(`https://wa.me/${provider.whatsapp || '201020709993'}?text=${text}`, '_blank');
  };

  const handleOpenGoogleMaps = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-28 pt-1 animate-in fade-in duration-200 text-right">
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#941946] hover:bg-rose-50/50 rounded-xl transition-all"
        >
          <ArrowRight className="w-4 h-4 text-[#941946]" />
          <span>الرجوع إلى المنشآت الطبية</span>
        </button>

        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100">
          {provider.categoryAr}
        </span>
      </div>

      {/* 2. Facility Hero Image & Identity */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white shadow-md border border-slate-200/50">
        <div className="relative aspect-[2.1/1] sm:aspect-[2.6/1] w-full overflow-hidden">
          <img
            src={providerPhoto}
            alt={provider.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>

        {/* Floating Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <div className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-xs">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{provider.rating}</span>
            <span className="text-[10px] text-slate-500 font-normal">({provider.reviewsCount} تقييم)</span>
          </div>

          {provider.is24h && (
            <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10.5px] font-bold rounded-xl shadow-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>متاح 24 ساعة</span>
            </span>
          )}
        </div>

        {/* Facility Title & Subtitle */}
        <div className="absolute bottom-3 right-4 left-4 text-white">
          <h1 className="text-lg sm:text-xl font-black text-white drop-shadow-md">
            {provider.name}
          </h1>
          <p className="text-[11px] text-slate-300 font-mono mt-0.5">{provider.nameEn}</p>
        </div>
      </div>

      {/* 3. Discount Privilege Box */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="p-3.5 bg-gradient-to-r from-rose-50 to-amber-50/60 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#941946] text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
              %
            </div>
            <div>
              <p className="text-sm font-black text-[#941946]">{provider.discount}</p>
              <p className="text-[11px] text-slate-600 font-medium">خصم فوري مباشر لحاملي كرت ديلار الطبي</p>
            </div>
          </div>
        </div>

        {/* Quick Contact & Navigation 3-button grid */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href={`tel:${provider.phone}`}
            className="py-2.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-2xs"
          >
            <Phone className="w-4 h-4 text-amber-400" />
            <span>اتصال هاتفي</span>
          </a>

          <button
            onClick={handleWhatsApp}
            className="py-2.5 px-2 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-2xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>واتساب وحجز</span>
          </button>

          <button
            onClick={handleOpenGoogleMaps}
            className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-2xs"
          >
            <Navigation className="w-4 h-4" />
            <span>الاتجاهات</span>
          </button>
        </div>
      </div>

      {/* 4. Interactive Digital Voucher Code */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#941946]" />
            <h3 className="text-xs font-bold text-slate-900">كود التحقق والاستفادة من الخصم</h3>
          </div>
          <span className="text-[10px] text-slate-500">صالح اليوم</span>
        </div>

        {voucherGenerated ? (
          <div className="p-3 bg-slate-50 rounded-2xl border-2 border-dashed border-[#941946]/40 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500">أظهر هذا الكود لموظف الاستقبال:</p>
              <p className="text-base font-black text-[#941946] font-mono tracking-wider">{voucherGenerated}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-800 transition-colors"
            >
              {copiedVoucher ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الكود</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerateCode}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-[#941946] border border-rose-200/80 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>توليد كود الخصم الفوري لموظف الاستقبال</span>
          </button>
        )}
      </div>

      {/* 5. Medical Services & Price List */}
      {provider.services && provider.services.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#941946]" />
            <span>أبرز الفحوصات والخدمات والأسعار المعتمدة</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {provider.services.map((srv, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">{srv.name}</p>
                  <p className="text-[10px] text-slate-400 line-through">السعر الأصلي: {srv.originalPrice} ج.م</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-xs font-black text-[#941946] font-mono">{srv.discountedPrice} ج.م</p>
                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                    وفر {srv.originalPrice - srv.discountedPrice} ج.م
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Facility Info & Features */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3 text-xs text-slate-700 leading-relaxed">
        <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#941946]" />
          <span>عن المنشأة والاعتمادات</span>
        </h3>
        
        <p className="text-slate-600 leading-relaxed">{provider.description}</p>

        {provider.features && provider.features.length > 0 && (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-1.5">
            <p className="text-xs font-bold text-slate-800">المميزات والخدمات الخاصة:</p>
            {provider.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        )}

        {/* Address and Distance */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#941946] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900">العنوان: </span>
              <span>{provider.address} ({provider.area} - {provider.city})</span>
            </div>
          </div>

          {provider.distanceKm !== undefined && (
            <div className="flex items-center gap-1.5 text-rose-700 font-bold pr-5">
              <span>المسافة: {formatDistance(provider.distanceKm)} من موقعك</span>
            </div>
          )}
        </div>
      </div>

      {/* 7. Show Medical Card CTA */}
      <div className="pt-1">
        <button
          onClick={onNavigateToCard}
          className="w-full py-3.5 bg-gradient-to-r from-[#941946] to-[#6d1132] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 active:scale-98 transition-all"
        >
          <CreditCard className="w-4 h-4 text-amber-300" />
          <span>عرض كرتي الطبي للاستفادة من الخصم الآن</span>
        </button>
      </div>
    </div>
  );
};
