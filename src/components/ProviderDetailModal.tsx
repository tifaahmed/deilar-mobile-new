import React, { useState } from 'react';
import { 
  X, 
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
  Copy
} from 'lucide-react';
import { MedicalProvider } from '../types';
import { formatDistance } from '../utils/geo';

interface ProviderDetailModalProps {
  provider: MedicalProvider & { distanceKm?: number };
  onClose: () => void;
  onNavigateToMap: () => void;
  onNavigateToCard: () => void;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  provider,
  onClose,
  onNavigateToMap,
  onNavigateToCard,
}) => {
  const [voucherGenerated, setVoucherGenerated] = useState<string | null>(null);
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  const handleGenerateCode = () => {
    const code = `DEI-${provider.logo.substring(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setVoucherGenerated(code);
  };

  const handleCopyCode = () => {
    if (voucherGenerated) {
      navigator.clipboard.writeText(voucherGenerated);
      setCopiedVoucher(true);
      setTimeout(() => setCopiedVoucher(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-150 text-right">
        {/* Top Header with Close */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
              {provider.categoryAr}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">ID: {provider.id}</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Provider Overview Lockup */}
          <div className="flex items-start gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-rose-800 font-black text-sm shrink-0 shadow-xs">
              {provider.logo.substring(0, 4)}
            </div>

            <div className="flex-1">
              <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                {provider.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{provider.nameEn}</p>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                  {provider.discount}
                </span>

                {provider.distanceKm !== undefined && (
                  <span className="font-semibold text-slate-700 flex items-center gap-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600" />
                    {formatDistance(provider.distanceKm)}
                  </span>
                )}

                <span className="flex items-center gap-1 font-semibold text-amber-600">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  {provider.rating} ({provider.reviewsCount})
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            {provider.description}
          </p>

          {/* Features pills */}
          <div className="flex flex-wrap gap-1.5">
            {provider.features.map((feat, i) => (
              <span
                key={i}
                className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{feat}</span>
              </span>
            ))}
            {provider.is24h && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>مفتوح 24 ساعة يومياً</span>
              </span>
            )}
          </div>

          {/* Location & Address Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">{provider.address}</p>
                <p className="text-[11px] text-slate-500">{provider.area} - {provider.city}</p>
              </div>
            </div>
          </div>

          {/* Price List Table (Official vs Deilar Discounted Price) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900">قائمة أسعار الخدمات بعد خصم كرت ديلار:</h3>
              <span className="text-[10px] text-slate-400">تحديث أسعار 2026</span>
            </div>

            <div className="space-y-2">
              {provider.services.map((serv, idx) => {
                const saved = serv.originalPrice - serv.discountedPrice;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-rose-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{serv.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-through">
                        السعر الرسمي: {serv.originalPrice} ج.م
                      </p>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="font-bold text-sm text-rose-700 font-mono">
                        {serv.discountedPrice} ج.م
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        وفرت {saved} ج.م
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct CTA Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                onClose();
                onNavigateToCard();
              }}
              className="w-full py-3 bg-[#931A47] hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-md shadow-rose-900/10"
            >
              <CreditCard className="w-4 h-4" />
              <span>إبراز كرتي الطبي لهذا الفرع للحصول على الخصم فوراً</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${provider.lat},${provider.lng}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation className="w-4 h-4 text-rose-700" />
                <span>الاتجاهات والوصول</span>
              </a>

              <a
                href={`tel:${provider.phone}`}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>اتصال بالفرع</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
