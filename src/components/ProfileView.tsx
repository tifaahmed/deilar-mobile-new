import React, { useState } from 'react';
import { 
  User, 
  CreditCard, 
  Calendar, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  ExternalLink, 
  PhoneCall, 
  MessageCircle, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Users, 
  Clock,
  Sparkles,
  ArrowUpRight,
  Download,
  AlertCircle,
  RotateCw,
  Share2,
  Copy,
  QrCode,
  CheckCircle2
} from 'lucide-react';
import { Beneficiary, SubscriptionPlan, UsageRecord } from '../types';
import { SUBSCRIPTION_PLANS } from '../data/mockData';
import { OfficialDeilarCard } from './OfficialDeilarCard';
import { downloadDeilarCardImage } from '../utils/downloadCard';

interface ProfileViewProps {
  beneficiaries: Beneficiary[];
  usageHistory: UsageRecord[];
  onOpenCard?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  beneficiaries,
  usageHistory,
}) => {
  const [currentPlanId, setCurrentPlanId] = useState<string>('plan-family');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [renewalSuccess, setRenewalSuccess] = useState(false);
  
  // Card states
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(beneficiaries[0]?.id || 'ben-1');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const currentBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId) || beneficiaries[0];

  const memId = currentBeneficiary.cardNumber.startsWith('MEM')
    ? currentBeneficiary.cardNumber
    : `MEM-${1000 + parseInt(currentBeneficiary.id.replace(/\D/g, '') || '0')}`;

  const handleCopyCardId = () => {
    navigator.clipboard.writeText(memId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownload = async (side: 'front' | 'back' = 'front') => {
    setIsDownloading(true);
    try {
      await downloadDeilarCardImage(currentBeneficiary, side);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download card:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `بطاقة ديلار للخصم الطبي المعتمدة 🎫\nالاسم: ${currentBeneficiary.name}\nرقم العضوية: ${memId}\nالصلاحية: حتى 31/12/2027\nخصومات تصل حتى 70% في المستشفيات والمعامل.\nالموقع: https://deilar.com`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Calculate total savings
  const totalSaved = usageHistory.reduce((acc, curr) => acc + curr.savedAmount, 0);
  const totalPaid = usageHistory.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const totalOriginal = totalSaved + totalPaid;

  const activePlan = SUBSCRIPTION_PLANS.find((p) => p.id === currentPlanId) || SUBSCRIPTION_PLANS[1];

  const handleSelectPlan = (planId: string) => {
    setCurrentPlanId(planId);
    setShowPlanModal(false);
    setRenewalSuccess(true);
    setTimeout(() => setRenewalSuccess(false), 4000);
  };

  return (
    <div className="space-y-4 pb-24 pt-2 animate-in fade-in duration-200">
      {/* 1. Profile Top Card */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-800 to-amber-700 text-white flex items-center justify-center font-bold text-xl shadow-md">
              <span>م</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">مصطفى مرسي</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  عضو نشط
                </span>
              </div>
              <p className="text-xs text-[#c89e43] font-bold mt-0.5">رقم العضوية: MEM-1000</p>
              <p className="text-[11px] text-slate-500 font-mono">01020709993</p>
            </div>
          </div>

          <button
            onClick={() => handleDownload('front')}
            className="px-3 py-1.5 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل الكرت</span>
          </button>
        </div>

        {/* Subscription Status Bar */}
        <div className="mt-4 p-3 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-200">{activePlan.name}</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              صالح حتى: 31 ديسمبر 2027 (متبقي 450 يوماً)
            </p>
          </div>

          <button
            onClick={() => setShowPlanModal(true)}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shrink-0"
          >
            إدارة الباقة
          </button>
        </div>

        {renewalSuccess && (
          <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تم تحديث باقة اشتراكك بنجاح! كرتك الطبي مفعل بجميع المزايا الجديدة.</span>
          </div>
        )}
      </section>

      {/* 
        2. THE OFFICIAL DEILAR CARD & DOWNLOAD BUTTONS SECTION 
        "فى صفحه حسابى عايو اشوف الكارت الخاص بيا مع زرار لتحميل الكارت زي الصور الى بعتها"
      */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#941946]" />
            <h3 className="text-xs font-bold text-slate-900">كرت ديلار الطبي الخاص بحسابك</h3>
          </div>
          <span className="text-[10px] font-bold text-[#c89e43] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            رسمي ومعتمد
          </span>
        </div>

        {/* Beneficiary Switcher Pills (If multiple members exist) */}
        {beneficiaries.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {beneficiaries.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBeneficiaryId(b.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedBeneficiaryId === b.id
                    ? 'bg-[#941946] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b.name} ({b.relation || 'رئيسي'})
              </button>
            ))}
          </div>
        )}

        {/* The 3D Realistic Interactive Deilar Card */}
        <div className="relative">
          <OfficialDeilarCard
            beneficiary={currentBeneficiary}
            isFlipped={isFlipped}
            onToggleFlip={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-sm mx-auto"
          />

          <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
            <RotateCw className="w-3 h-3 text-[#c89e43]" />
            <span>اضغط على الكرت لقلب الوجهين (الأمامي / الخلفي)</span>
          </p>
        </div>

        {/* Download & Actions Toolbar */}
        <div className="pt-1 space-y-2">
          {/* Primary Big Download Button */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDownload('front')}
              disabled={isDownloading}
              className="py-2.5 px-3 bg-[#941946] hover:bg-[#7b1439] active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تحميل وجه الكارت (PNG)</span>
            </button>

            <button
              onClick={() => handleDownload('back')}
              disabled={isDownloading}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تحميل ظهر الكارت (PNG)</span>
            </button>
          </div>

          {/* Secondary Actions: Copy ID, Share, QR View */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-slate-200/70"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#c89e43]" />
              <span>{isFlipped ? 'الوجه الأمامي' : 'ظهر الكرت'}</span>
            </button>

            <button
              onClick={handleCopyCardId}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-slate-200/70"
            >
              {copiedId ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>نسخ الرقم</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-emerald-200/70"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>مشاركة واتساب</span>
            </button>
          </div>

          {downloadSuccess && (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">تم تحميل كرت ديلار الطبي عالي الدقة على جهازك بنجاح!</span>
            </div>
          )}
        </div>
      </section>

      {/* 3. Total Savings Dashboard (عداد التوفير المالي) */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">سجل التوفير المالي لحسابك</h3>
              <p className="text-[10px] text-slate-500">الأموال التي وفرتها بكرت ديلار مقارنة بالأسعار الرسمية</p>
            </div>
          </div>

          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            +{totalSaved.toLocaleString()} ج.م وفرت
          </span>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <p className="text-[10px] text-slate-500">القيمة الأصلية</p>
            <p className="text-xs sm:text-sm font-bold text-slate-700 font-mono mt-0.5">
              {totalOriginal.toLocaleString()} ج.م
            </p>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
            <p className="text-[10px] text-slate-500">المدفوع فقط</p>
            <p className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5">
              {totalPaid.toLocaleString()} ج.م
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
            <p className="text-[10px] text-emerald-700 font-medium">صافي التوفير</p>
            <p className="text-xs sm:text-sm font-black text-emerald-700 font-mono mt-0.5">
              {totalSaved.toLocaleString()} ج.م
            </p>
          </div>
        </div>
      </section>

      {/* 4. Beneficiaries List (أفراد الأسرة المشمولين) */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#941946]" />
            <h3 className="text-xs font-bold text-slate-900">أفراد الأسرة المشمولين بالاشتراك ({beneficiaries.length})</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">مشتركون فعالون</span>
        </div>

        <div className="space-y-2">
          {beneficiaries.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBeneficiaryId(b.id)}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                selectedBeneficiaryId === b.id
                  ? 'bg-rose-50/80 border-[#941946]/40 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#941946]/10 text-[#941946] flex items-center justify-center font-bold text-xs">
                  {b.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">{b.name}</p>
                    <span className="text-[10px] text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded">
                      {b.relation || 'حساب رئيسي'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{b.cardNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  مفعل
                </span>
                <span className="text-[10px] font-bold text-[#941946]">عرض الكرت</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Deilar Customer Care & Official Links */}
      <section className="bg-gradient-to-r from-rose-900 to-rose-950 text-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white">خدمة عملاء ديلار الطبية</h3>
            <p className="text-[10px] text-rose-200">فريق الدعم وحجز العمليات متاح 24/7</p>
          </div>
          <a
            href="https://deilar.com/"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium flex items-center gap-1 border border-white/20 transition-colors"
          >
            <span>موقعنا الرسمي</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href="https://wa.me/201020709993"
            target="_blank"
            rel="noreferrer"
            className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>واتساب</span>
          </a>

          <a
            href="tel:01020709993"
            className="py-2.5 px-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border border-white/20"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>اتصال فوري</span>
          </a>

          <a
            href="https://www.facebook.com/share/18F567x1yM/"
            target="_blank"
            rel="noreferrer"
            className="py-2.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <span>فيسبوك</span>
          </a>
        </div>
      </section>

      {/* Subscription Plans Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">ترقية وتجديد باقة ديلار</h3>
                <p className="text-[11px] text-slate-500">اختر الباقة المناسبة لاحتياجك العائلي أو الفردي</p>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isCurrent = plan.id === currentPlanId;
                return (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-[#941946] bg-rose-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{plan.name}</h4>
                          {plan.badge && (
                            <span className="text-[9px] font-bold text-[#c89e43] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {plan.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          تغطي حتى {plan.maxBeneficiaries} أفراد من العائلة
                        </p>
                      </div>

                      <div className="text-left">
                        <div className="text-sm font-black text-slate-900 font-mono">
                          {plan.pricePerYear} ج.م
                        </div>
                        <div className="text-[9px] text-slate-400">سنوياً</div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-bold">{plan.discountUpTo}</span>
                      <span className={`font-bold ${isCurrent ? 'text-[#941946]' : 'text-slate-500'}`}>
                        {isCurrent ? 'باقتك الحالية ✓' : 'اختيار هذه الباقة ←'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
