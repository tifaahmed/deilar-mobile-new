import React, { useState } from 'react';
import { 
  User, 
  CreditCard, 
  ShieldCheck, 
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
  CheckCircle2,
  Headphones,
  UserCheck,
  Palette,
  Sun,
  Moon,
  Plus,
  Save,
  MapPin,
  Mail,
  Phone,
  FileText,
  Send
} from 'lucide-react';
import { Beneficiary, UsageRecord } from '../types';
import { OfficialDeilarCard } from './OfficialDeilarCard';
import { downloadDeilarCardImage } from '../utils/downloadCard';

export type ProfileSubSection = 'card' | 'members' | 'support' | 'personal' | 'theme';

interface ProfileViewProps {
  beneficiaries: Beneficiary[];
  usageHistory: UsageRecord[];
  onOpenCard?: () => void;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onAddBeneficiary?: (newBen: Beneficiary) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  beneficiaries,
  usageHistory,
  theme = 'light',
  onThemeChange,
  onAddBeneficiary,
}) => {
  // Active sub-section state (Default to 'card')
  const [activeSection, setActiveSection] = useState<ProfileSubSection>('card');

  // Card sub-section states
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(beneficiaries[0]?.id || 'ben-1');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Personal Info form state
  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'مصطفى مرسي',
    phone: '01020709993',
    email: 'mostafa.morsy3110@gmail.com',
    governorate: 'القاهرة - المعادي',
    nationalId: '29508150102345',
  });
  const [personalSaveSuccess, setPersonalSaveSuccess] = useState(false);

  // New Beneficiary form state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('زوجة');
  const [newMemberNid, setNewMemberNid] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState(false);

  // Support ticket form state
  const [ticketTopic, setTopic] = useState('استفسار عام');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

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

  const handleSavePersonalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalSaveSuccess(true);
    setTimeout(() => setPersonalSaveSuccess(false), 3500);
  };

  const handleAddNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const newId = `ben-${Date.now()}`;
    const newCardNumber = `MEM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBen: Beneficiary = {
      id: newId,
      name: newMemberName.trim(),
      relation: newMemberRelation,
      cardNumber: newCardNumber,
      nationalId: newMemberNid.trim() || '29801010102345',
      dob: '1998-01-01',
      status: 'active',
    };

    if (onAddBeneficiary) {
      onAddBeneficiary(newBen);
    }

    setAddMemberSuccess(true);
    setNewMemberName('');
    setNewMemberNid('');
    setTimeout(() => {
      setAddMemberSuccess(false);
      setShowAddMemberModal(false);
    }, 1500);
  };

  const handleSendSupportTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;
    setTicketSent(true);
    setTicketMessage('');
    setTimeout(() => setTicketSent(false), 4000);
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-4 pb-24 pt-2 animate-in fade-in duration-200 text-right">
      {/* 1. Profile Identity Header */}
      <section className={`rounded-2xl p-4 border transition-colors shadow-2xs ${
        isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#941946] to-[#6d1132] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              <span>{personalInfo.fullName.charAt(0) || 'م'}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-slate-900'}`}>{personalInfo.fullName}</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  عضو نشط
                </span>
              </div>
              <p className="text-xs text-[#c89e43] font-bold mt-0.5">رقم العضوية: MEM-1000</p>
              <p className={`text-[11px] font-mono ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{personalInfo.phone}</p>
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
      </section>

      {/* 2. Interactive Navigation Tabs (التقسيمات الخمسة) */}
      <div className={`p-1.5 rounded-2xl border transition-colors flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs ${
        isDark ? 'bg-[#181B26] border-white/[0.08]' : 'bg-white border-slate-200/90'
      }`}>
        <button
          onClick={() => setActiveSection('card')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeSection === 'card'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>الكرت الطبي</span>
        </button>

        <button
          onClick={() => setActiveSection('members')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeSection === 'members'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>أفراد الأسرة</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
            {beneficiaries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('support')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeSection === 'support'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>الدعم الفني</span>
        </button>

        <button
          onClick={() => setActiveSection('personal')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeSection === 'personal'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>بياناتي</span>
        </button>

        <button
          onClick={() => setActiveSection('theme')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeSection === 'theme'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>المظهر</span>
        </button>
      </div>

      {/* 3. Section 1: مكان اشوف الكارت (Official Deilar Card & Downloads) */}
      {activeSection === 'card' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-3.5 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">كرت ديلار الطبي الخاص بحسابك</h3>
            </div>
            <span className="text-[10px] font-bold text-[#c89e43] bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
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
                      : isDark ? 'bg-[#1E2330] text-[#94A3B8] border border-white/[0.08]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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

            <p className={`text-center text-[10px] mt-2 flex items-center justify-center gap-1 ${
              isDark ? 'text-[#94A3B8]' : 'text-slate-400'
            }`}>
              <RotateCw className="w-3 h-3 text-[#c89e43]" />
              <span>اضغط على الكرت لقلب الوجهين (الأمامي / الخلفي)</span>
            </p>
          </div>

          {/* Download & Actions Toolbar */}
          <div className="pt-1 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDownload('front')}
                disabled={isDownloading}
                className="py-2.5 px-3 bg-[#941946] hover:bg-[#7b1439] active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل وجه الكارت (PNG)</span>
              </button>

              <button
                onClick={() => handleDownload('back')}
                disabled={isDownloading}
                className={`py-2.5 px-3 active:scale-[0.99] rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  isDark 
                    ? 'bg-[#1E2330] hover:bg-[#252c3d] text-[#F1F5F9] border-white/[0.08]' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-transparent'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>تحميل ظهر الكارت (PNG)</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border ${
                  isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-[#F1F5F9] border-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200/70'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5 text-[#c89e43]" />
                <span>{isFlipped ? 'الوجه الأمامي' : 'ظهر الكرت'}</span>
              </button>

              <button
                onClick={handleCopyCardId}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border ${
                  isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-[#F1F5F9] border-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200/70'
                }`}
              >
                {copiedId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                    <span>نسخ الرقم</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border ${
                  isDark 
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/40' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/70'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>مشاركة واتساب</span>
              </button>
            </div>

            {downloadSuccess && (
              <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">تم حفظ كرت ديلار الطبي عالي الدقة على جهازك بنجاح!</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Section 2: مكان تانى اشوف الاعضاء (Family Members / Beneficiaries) */}
      {activeSection === 'members' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-3 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">أفراد الأسرة المسجلين بالكرت ({beneficiaries.length})</h3>
            </div>
            
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="px-2.5 py-1 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة فرد جديد</span>
            </button>
          </div>

          <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            جميع الأفراد أدناه مشمولين بنسب الخصم الطبية، اضغط على أي فرد لعرض بطاقته الشخصية.
          </p>

          <div className="space-y-2 pt-1">
            {beneficiaries.map((b) => (
              <div
                key={b.id}
                onClick={() => {
                  setSelectedBeneficiaryId(b.id);
                  setActiveSection('card');
                }}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  selectedBeneficiaryId === b.id
                    ? isDark ? 'bg-[#941946]/20 border-[#941946]' : 'bg-rose-50/80 border-[#941946]/40 shadow-xs'
                    : isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] border-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#941946]/15 text-[#941946] flex items-center justify-center font-bold text-sm shrink-0">
                    {b.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold">{b.name}</p>
                      <span className={`text-[10px] px-2 py-0.2 rounded-md ${
                        isDark ? 'bg-[#252c3d] text-[#94A3B8]' : 'bg-slate-200/80 text-slate-500'
                      }`}>
                        {b.relation || 'حساب رئيسي'}
                      </span>
                    </div>
                    <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{b.cardNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    مفعل ✓
                  </span>
                  <span className="text-xs font-bold text-[#941946] flex items-center gap-0.5">
                    <span>عرض الكرت</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add Member Inline Modal */}
          {showAddMemberModal && (
            <div className={`p-4 rounded-2xl border space-y-3 mt-3 animate-in fade-in ${
              isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-rose-50/40 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold">إضافة فرد جديد إلى الكرت الطبي</h4>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    isDark ? 'bg-[#252c3d] text-[#94A3B8]' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddNewMember} className="space-y-2.5">
                <div>
                  <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>الاسم الكامل للفرد:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ياسمين مصطفى مرسي"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                      isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>صلة القرابة:</label>
                    <select
                      value={newMemberRelation}
                      onChange={(e) => setNewMemberRelation(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                        isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="زوجة">زوجة</option>
                      <option value="ابن">ابن</option>
                      <option value="ابنة">ابنة</option>
                      <option value="والد">والد</option>
                      <option value="والدة">والدة</option>
                      <option value="أخ / أخت">أخ / أخت</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>الرقم القومي (اختياري):</label>
                    <input
                      type="text"
                      placeholder="14 رقم"
                      value={newMemberNid}
                      onChange={(e) => setNewMemberNid(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                        isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  {addMemberSuccess ? 'تمت إضافة الفرد بنجاح! ✓' : 'تأكيد إضافة الفرد'}
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* 5. Section 3: مكان للدعم الفنى (Customer Support & Inquiries) */}
      {activeSection === 'support' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">فريق الدعم الفني وخدمة العملاء</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              متاح 24/7
            </span>
          </div>

          <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            فريق رعاية عملاء كرت ديلار الطبي متواجد على مدار الساعة للرد على استفساراتكم وحجز المستشفيات.
          </p>

          {/* Quick Direct Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://wa.me/201020709993"
              target="_blank"
              rel="noreferrer"
              className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>محادثة واتساب مباشرة</span>
            </a>

            <a
              href="tel:01020709993"
              className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs ${
                isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-white border border-white/[0.08]' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>اتصال هاتفي بالخط الساخن</span>
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://deilar.com/"
              target="_blank"
              rel="noreferrer"
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border ${
                isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-[#F1F5F9] border-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <span>الموقع الرسمي لـ ديلار</span>
              <ExternalLink className={`w-3.5 h-3.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
            </a>

            <a
              href="https://www.facebook.com/share/18F567x1yM/"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>صفحتنا على فيسبوك</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Support Ticket Submission Form */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
            isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#941946]" />
              <span>إرسال استفسار أو بلاغ لمشرف الخدمة:</span>
            </h4>

            <form onSubmit={handleSendSupportTicket} className="space-y-2">
              <select
                value={ticketTopic}
                onChange={(e) => setTopic(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                  isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="استفسار عام">استفسار عام عن نسب الخصم</option>
                <option value="شكوى فرع">إبلاغ عن عدم تطبيق الخصم بفرع معين</option>
                <option value="حجز عملية">مساعدة في حجز عملية جراحية أو كشف استشاري</option>
                <option value="طلب إضافة منشأة">اقتراح إضافة مستشفى أو معمل جديد للشبكة</option>
              </select>

              <textarea
                required
                rows={3}
                placeholder="اكتب تفاصيل استفسارك أو طلبك هنا..."
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                  isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9] placeholder-[#94A3B8]' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />

              <button
                type="submit"
                className="w-full py-2.5 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال الرسالة إلى خدمة العملاء</span>
              </button>

              {ticketSent && (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>تم استلام استفسارك بنجاح! سيتواصل معك ممثل خدمة العملاء عبر الهاتف أو الواتساب فوراً.</span>
                </div>
              )}
            </form>
          </div>
        </section>
      )}

      {/* 6. Section 4: مكان لتغيير بياناتى الشخصيه (Personal Profile Settings) */}
      {activeSection === 'personal' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">تعديل البيانات الشخصية للحساب</h3>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>تحديث فوري</span>
          </div>

          <form onSubmit={handleSavePersonalInfo} className="space-y-3">
            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                الاسم بالكامل (كما يظهر على الكرت الطبي):
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                <input
                  type="text"
                  required
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                  className={`w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                    isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  رقم الهاتف الأساسي:
                </label>
                <div className="relative">
                  <Phone className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                  <input
                    type="tel"
                    required
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className={`w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  البريد الإلكتروني:
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    required
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className={`w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  المحافظة والمنطقة:
                </label>
                <div className="relative">
                  <MapPin className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={personalInfo.governorate}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, governorate: e.target.value })}
                    className={`w-full pr-9 pl-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  الرقم القومي (14 رقم):
                </label>
                <input
                  type="text"
                  value={personalInfo.nationalId}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, nationalId: e.target.value })}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                    isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات على الحساب</span>
            </button>

            {personalSaveSuccess && (
              <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">تم حفظ وتحديث بياناتك الشخصية بنجاح!</span>
              </div>
            )}
          </form>
        </section>
      )}

      {/* 7. Section 5: مكان الشكل العام للتطبيق (Dark Theme & Light Theme) */}
      {activeSection === 'theme' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-4 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">الشكل العام ومظهر التطبيق (Theme)</h3>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>تطبيق فوري</span>
          </div>

          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            اختر المظهر المفضل لتجربة استخدام مريحة لعينك في كافة شاشات التطبيق:
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Light Theme Card */}
            <div
              onClick={() => onThemeChange && onThemeChange('light')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2.5 relative ${
                theme === 'light'
                  ? 'border-[#941946] bg-rose-50/50 shadow-md ring-2 ring-[#941946]/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {theme === 'light' && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#941946] text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">الوضع الفاتح (Light)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">ألوان نهارية ناصعة وواضحة</p>
              </div>
            </div>

            {/* Dark Theme Card */}
            <div
              onClick={() => onThemeChange && onThemeChange('dark')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2.5 relative ${
                theme === 'dark'
                  ? 'border-[#941946] bg-[#181B26] shadow-md ring-2 ring-[#941946]/30 text-[#F1F5F9]'
                  : 'border-white/[0.08] hover:border-white/20 bg-[#181B26] text-[#94A3B8]'
              }`}
            >
              {theme === 'dark' && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#941946] text-white flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <div className="w-12 h-12 rounded-2xl bg-[#1E2330] text-indigo-300 flex items-center justify-center shadow-xs border border-white/[0.08]">
                <Moon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#F1F5F9]">الوضع الداكن (Dark)</h4>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">خلفية #0A0E17 وكروت #181B26</p>
              </div>
            </div>
          </div>

          {/* Palette Details Box */}
          <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
            isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#94A3B8]' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c89e43] shrink-0" />
              <span className={isDark ? 'text-[#F1F5F9]' : 'text-slate-900'}>
                المظهر النشط حالياً: <b>{theme === 'dark' ? 'الوضع الداكن (Dark Mode)' : 'الوضع الفاتح (Light Mode)'}</b>
              </span>
            </div>
            {isDark && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0A0E17] border border-white/20"></span>
                  <span>الخلفية: #0A0E17</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#181B26] border border-white/20"></span>
                  <span>الكروت: #181B26</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F1F5F9] border border-slate-400"></span>
                  <span>نصوص رئيسية: #F1F5F9</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></span>
                  <span>نصوص ثانوية: #94A3B8</span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
