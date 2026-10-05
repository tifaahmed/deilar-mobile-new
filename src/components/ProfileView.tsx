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
  Send,
  Languages,
  Globe
} from 'lucide-react';
import { Beneficiary, UsageRecord } from '../types';
import { OfficialDeilarCard } from './OfficialDeilarCard';
import { downloadDeilarCardImage } from '../utils/downloadCard';
import { useLanguage } from '../context/LanguageContext';

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
  const { language, setLanguage, t, isAr, brandName } = useLanguage();

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
    fullName: isAr ? 'مصطفى مرسي' : 'Mostafa Morsy',
    phone: '01020709993',
    email: 'mostafa.morsy3110@gmail.com',
    governorate: isAr ? 'القاهرة - المعادي' : 'Cairo - Maadi',
    nationalId: '29508150102345',
  });
  const [personalSaveSuccess, setPersonalSaveSuccess] = useState(false);

  // New Beneficiary form state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState(isAr ? 'زوجة' : 'Wife');
  const [newMemberNid, setNewMemberNid] = useState('');
  const [addMemberSuccess, setAddMemberSuccess] = useState(false);

  // Support ticket form state
  const [ticketTopic, setTopic] = useState('ticketTopicGeneral');
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
    const cardTitle = isAr ? `بطاقة ${brandName} للخصم الطبي المعتمدة 🎫` : `${brandName} Certified Medical Discount Card 🎫`;
    const text = encodeURIComponent(
      `${cardTitle}\n${isAr ? 'الاسم' : 'Name'}: ${currentBeneficiary.name}\n${isAr ? 'رقم العضوية' : 'Membership ID'}: ${memId}\n${isAr ? 'الصلاحية' : 'Validity'}: 31/12/2027\n${isAr ? 'خصومات تصل حتى 70% في المستشفيات والمعامل.' : 'Discounts up to 70% at hospitals & labs.'}\nhttps://deilar.com`
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
    <div className={`space-y-4 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* 1. Profile Identity Header */}
      <section className={`rounded-2xl p-4 border transition-colors shadow-2xs ${
        isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#941946] to-[#6d1132] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
              <span>{personalInfo.fullName.charAt(0) || 'M'}</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-slate-900'}`}>{personalInfo.fullName}</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {t('activeMember')}
                </span>
              </div>
              <p className="text-xs text-[#c89e43] font-bold mt-0.5">{t('membershipId')}: MEM-1000</p>
              <p className={`text-[11px] font-mono ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{personalInfo.phone}</p>
            </div>
          </div>

          <button
            onClick={() => handleDownload('front')}
            className="px-3 py-1.5 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('downloadCardShort')}</span>
          </button>
        </div>
      </section>

      {/* 2. Interactive Navigation Tabs (5 Sections) */}
      <div className={`p-1.5 rounded-2xl border transition-colors flex items-center gap-1 overflow-x-auto no-scrollbar shadow-2xs ${
        isDark ? 'bg-[#181B26] border-white/[0.08]' : 'bg-white border-slate-200/90'
      }`}>
        <button
          onClick={() => setActiveSection('card')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'card'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{t('tabCard')}</span>
        </button>

        <button
          onClick={() => setActiveSection('members')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'members'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('tabMembers')}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
            {beneficiaries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSection('support')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'support'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>{t('tabSupport')}</span>
        </button>

        <button
          onClick={() => setActiveSection('personal')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'personal'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>{t('tabPersonal')}</span>
        </button>

        <button
          onClick={() => setActiveSection('theme')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSection === 'theme'
              ? 'bg-[#941946] text-white shadow-xs'
              : isDark ? 'text-[#94A3B8] hover:bg-[#1E2330]' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>{t('tabTheme')}</span>
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
              <h3 className="text-xs font-bold">{t('userCardTitle')}</h3>
            </div>
            <span className="text-[10px] font-bold text-[#c89e43] bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
              {t('officialCertified')}
            </span>
          </div>

          {/* Beneficiary Switcher Pills (If multiple members exist) */}
          {beneficiaries.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {beneficiaries.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBeneficiaryId(b.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedBeneficiaryId === b.id
                      ? 'bg-[#941946] text-white shadow-xs'
                      : isDark ? 'bg-[#1E2330] text-[#94A3B8] border border-white/[0.08]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {b.name} ({b.relation || (isAr ? 'رئيسي' : 'Primary')})
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
              <span>{t('tapToFlip')}</span>
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
                <span>{t('downloadFront')}</span>
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
                <span>{t('downloadBack')}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border cursor-pointer ${
                  isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-[#F1F5F9] border-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200/70'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5 text-[#c89e43]" />
                <span>{isFlipped ? t('frontSide') : t('backSide')}</span>
              </button>

              <button
                onClick={handleCopyCardId}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border cursor-pointer ${
                  isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-[#F1F5F9] border-white/[0.08]' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200/70'
                }`}
              >
                {copiedId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">{t('copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className={`w-3.5 h-3.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                    <span>{t('copyId')}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-colors border cursor-pointer ${
                  isDark 
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/40' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/70'
                }`}
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('shareWhatsapp')}</span>
              </button>
            </div>

            {downloadSuccess && (
              <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{t('cardDownloadSuccess')}</span>
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
              <h3 className="text-xs font-bold">{t('familyMembersCount')} ({beneficiaries.length})</h3>
            </div>
            
            <button
              onClick={() => setShowAddMemberModal(true)}
              className="px-2.5 py-1 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addNewMember')}</span>
            </button>
          </div>

          <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            {t('familyMembersDesc')}
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
                        {b.relation || t('primaryAccount')}
                      </span>
                    </div>
                    <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{b.cardNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {t('activeStatus')}
                  </span>
                  <span className="text-xs font-bold text-[#941946] flex items-center gap-0.5">
                    <span>{t('viewCardAction')}</span>
                    <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
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
                <h4 className="text-xs font-bold">{t('addMemberTitle')}</h4>
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer ${
                    isDark ? 'bg-[#252c3d] text-[#94A3B8]' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddNewMember} className="space-y-2.5">
                <div>
                  <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{t('memberNamePrompt')}</label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: ياسمين مصطفى مرسي' : 'e.g. Yasmin Mostafa Morsy'}
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                      isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{t('relationPrompt')}</label>
                    <select
                      value={newMemberRelation}
                      onChange={(e) => setNewMemberRelation(e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                        isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value={isAr ? 'زوجة' : 'Wife'}>{t('relWife')}</option>
                      <option value={isAr ? 'ابن' : 'Son'}>{t('relSon')}</option>
                      <option value={isAr ? 'ابنة' : 'Daughter'}>{t('relDaughter')}</option>
                      <option value={isAr ? 'والد' : 'Father'}>{t('relFather')}</option>
                      <option value={isAr ? 'والدة' : 'Mother'}>{t('relMother')}</option>
                      <option value={isAr ? 'أخ / أخت' : 'Sibling'}>{t('relSibling')}</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{t('nationalIdOptional')}</label>
                    <input
                      type="text"
                      placeholder="14 digits"
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
                  {addMemberSuccess ? t('memberAddedSuccess') : t('confirmAddMember')}
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
              <h3 className="text-xs font-bold">{t('supportTitle')}</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {t('supportAvailable247')}
            </span>
          </div>

          <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            {t('supportDesc')}
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
              <span>{t('directWhatsapp')}</span>
            </a>

            <a
              href="tel:01020709993"
              className={`py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs ${
                isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-white border border-white/[0.08]' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>{t('hotlineCall')}</span>
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
              <span>{t('officialWebsite')}</span>
              <ExternalLink className={`w-3.5 h-3.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
            </a>

            <a
              href="https://www.facebook.com/share/18F567x1yM/"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <span>{t('facebookPage')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Support Ticket Submission Form */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 ${
            isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#941946]" />
              <span>{t('ticketSectionTitle')}</span>
            </h4>

            <form onSubmit={handleSendSupportTicket} className="space-y-2">
              <select
                value={ticketTopic}
                onChange={(e) => setTopic(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                  isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="ticketTopicGeneral">{t('ticketTopicGeneral')}</option>
                <option value="ticketTopicComplaint">{t('ticketTopicComplaint')}</option>
                <option value="ticketTopicBooking">{t('ticketTopicBooking')}</option>
                <option value="ticketTopicSuggest">{t('ticketTopicSuggest')}</option>
              </select>

              <textarea
                required
                rows={3}
                placeholder={t('ticketPlaceholder')}
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
                <span>{t('sendTicketBtn')}</span>
              </button>

              {ticketSent && (
                <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t('ticketSuccess')}</span>
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
              <h3 className="text-xs font-bold">{t('personalInfoTitle')}</h3>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{t('instantUpdate')}</span>
          </div>

          <form onSubmit={handleSavePersonalInfo} className="space-y-3">
            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                {t('fullNamePrompt')}
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                <input
                  type="text"
                  required
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                  className={`w-full ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                    isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  {t('phonePrompt')}
                </label>
                <div className="relative">
                  <Phone className={`w-4 h-4 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                  <input
                    type="tel"
                    required
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    className={`w-full ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  {t('emailPrompt')}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                  <input
                    type="email"
                    required
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className={`w-full ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  {t('governoratePrompt')}
                </label>
                <div className="relative">
                  <MapPin className={`w-4 h-4 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={personalInfo.governorate}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, governorate: e.target.value })}
                    className={`w-full ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  {t('nationalIdPrompt')}
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
              <span>{t('saveChangesBtn')}</span>
            </button>

            {personalSaveSuccess && (
              <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center justify-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{t('saveChangesSuccess')}</span>
              </div>
            )}
          </form>
        </section>
      )}

      {/* 7. Section 5: مكان الشكل العام للتطبيق ولغة التطبيق (Theme & Language) */}
      {activeSection === 'theme' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-5 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-3 border-inherit">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">{t('appearanceSectionTitle')}</h3>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{t('instantUpdate')}</span>
          </div>

          {/* 1. LANGUAGE SWITCHER (العربية "ديلر" / English "deilar") */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#c89e43]" />
              <h4 className="text-xs font-bold">{t('languageChoiceTitle')}</h4>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
              {t('languageChoiceDesc')}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-0.5">
              {/* Arabic Option */}
              <div
                onClick={() => setLanguage('ar')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 relative ${
                  language === 'ar'
                    ? 'border-[#941946] bg-rose-50/50 dark:bg-[#941946]/20 shadow-md ring-2 ring-[#941946]/20'
                    : isDark 
                      ? 'border-white/[0.08] hover:border-white/20 bg-[#1E2330]' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🇪🇬</span>
                  <div>
                    <h5 className="text-xs font-bold">العربية</h5>
                    <p className="text-[10px] text-amber-500 font-bold">اسم المنصة: ديلر</p>
                  </div>
                </div>
                {language === 'ar' && (
                  <div className="w-5 h-5 rounded-full bg-[#941946] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* English Option */}
              <div
                onClick={() => setLanguage('en')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-2 relative ${
                  language === 'en'
                    ? 'border-[#941946] bg-rose-50/50 dark:bg-[#941946]/20 shadow-md ring-2 ring-[#941946]/20'
                    : isDark 
                      ? 'border-white/[0.08] hover:border-white/20 bg-[#1E2330]' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🇬🇧</span>
                  <div>
                    <h5 className="text-xs font-bold">English</h5>
                    <p className="text-[10px] text-amber-500 font-bold">Brand: deilar</p>
                  </div>
                </div>
                {language === 'en' && (
                  <div className="w-5 h-5 rounded-full bg-[#941946] text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-inherit pt-3 space-y-2.5">
            {/* 2. THEME SWITCHER */}
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold">{t('themeChoiceTitle')}</h4>
            </div>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
              {t('themeChoiceDesc')}
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
                  <div className={`absolute top-2 ${isAr ? 'left-2' : 'right-2'} w-5 h-5 rounded-full bg-[#941946] text-white flex items-center justify-center`}>
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{t('lightMode')}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{t('lightModeDesc')}</p>
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
                  <div className={`absolute top-2 ${isAr ? 'left-2' : 'right-2'} w-5 h-5 rounded-full bg-[#941946] text-white flex items-center justify-center`}>
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="w-12 h-12 rounded-2xl bg-[#1E2330] text-indigo-300 flex items-center justify-center shadow-xs border border-white/[0.08]">
                  <Moon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9]">{t('darkMode')}</h4>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{t('darkModeDesc')}</p>
                </div>
              </div>
            </div>

            {/* Palette Details Box */}
            <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 mt-2 ${
              isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#94A3B8]' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c89e43] shrink-0" />
                <span className={isDark ? 'text-[#F1F5F9]' : 'text-slate-900'}>
                  {t('activeThemeLabel')} <b>{theme === 'dark' ? t('darkMode') : t('lightMode')}</b> • {t('activeLangLabel')} <b>{isAr ? 'العربية (ديلر)' : 'English (deilar)'}</b>
                </span>
              </div>
              {isDark && (
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-[#94A3B8]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0A0E17] border border-white/20"></span>
                    <span>Background: #0A0E17</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#181B26] border border-white/20"></span>
                    <span>Cards: #181B26</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F1F5F9] border border-slate-400"></span>
                    <span>Text Primary: #F1F5F9</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></span>
                    <span>Text Secondary: #94A3B8</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
