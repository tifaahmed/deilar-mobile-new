import React, { useEffect, useState } from 'react';
import { 
  User, 
  CreditCard, 
  ShieldCheck, 
  ExternalLink, 
  PhoneCall, 
  MessageCircle, 
  Check, 
  ChevronRight, 
  ChevronDown,
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
  TriangleAlert,
  Mail,
  Phone,
  FileText,
  Send,
  Languages,
  Globe,
  Lock,
  LogOut,
  PackageSearch,
} from 'lucide-react';
import { Beneficiary } from '../types';
import { MembershipCardImage } from './MembershipCardImage';
import { downloadCardImageFile, fetchProfile, updateProfile } from '../api/auth';
import { fetchLocations } from '../api/endpoints';
import { ApiError, postContactMessage } from '../api/http';
import { getSession } from '../utils/session';
import { useApi } from '../hooks/useApi';
import { fetchFamily } from '../api/family';
import { AddChildForm } from './AddChildForm';
import { CardStatusBanner } from './CardStatusBanner';
import { CardExpiry } from './CardExpiry';
import { SubscribePanel } from './SubscribePanel';
import { fetchMembership, requestRelatives, type CardStatus } from '../api/membership';
import { AreaPicker } from './AreaPicker';
import { PayPage } from './PayPage';
import { AddressesTab } from './AddressesTab';
import { saveHomeAddress, uploadAvatar, fetchSavedAddress } from '../api/auth';
import { navigate, routeHref } from '../router';
import { onMembershipChanged } from '../utils/membershipEvents';
import { AvatarCropper } from './AvatarCropper';
import { ImageViewer } from './ImageViewer';
import { NationalIdChange } from './NationalIdChange';
import { reportClientError } from '../utils/reportError';
import { useContact } from '../hooks/useCatalog';
import { DobPicker } from './DobPicker';
import { downloadDeilarCardImage } from '../utils/downloadCard';
import { useLanguage } from '../context/LanguageContext';

export type ProfileSubSection = 'card' | 'list' | 'members' | 'support' | 'personal' | 'addresses' | 'theme' | 'pay';

export interface ProfileAccount {
  name: string;
  phone: string;
  number: string;
  validTo: string | null;
  signedIn: boolean;
}

interface ProfileViewProps {
  /** `card`: the «كارتي» tab (card, relatives, subscription). `account`: the «حسابي» tab (a list; each row opens its page). */
  mode: 'card' | 'account';
  account: ProfileAccount;
  onLogout: () => void;
  beneficiaries: Beneficiary[];
  onOpenCard?: () => void;
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  onAddBeneficiary?: (newBen: Beneficiary) => void;
  /** Opens the phone + code sign-in. */
  onSignIn: () => void;
  /** Open sub-section, driven by the URL (null = the card). */
  section: Exclude<ProfileSubSection, 'card' | 'list'> | null;
  onSectionChange: (section: Exclude<ProfileSubSection, 'card' | 'list'> | null) => void;
  /** The card's state from the backend (trial / expired / active, price, contacts). */
  status?: CardStatus;
}

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  name: { ar: 'الاسم', en: 'name' },
  email: { ar: 'البريد الإلكتروني', en: 'email' },
  gender: { ar: 'النوع', en: 'gender' },
  governorate_id: { ar: 'المحافظة', en: 'governorate' },
  city_id: { ar: 'المدينة', en: 'city' },
  national_id: { ar: 'الرقم القومي', en: 'national ID' },
  job_title: { ar: 'المسمى الوظيفي', en: 'job title' },
  company_name: { ar: 'جهة العمل', en: 'company' },
  address: { ar: 'العنوان', en: 'address' },
  avatar: { ar: 'الصورة الشخصية', en: 'profile photo' },
};

export const ProfileView: React.FC<ProfileViewProps> = ({
  mode,
  account,
  onLogout,
  beneficiaries,
  theme = 'light',
  onThemeChange,
  onAddBeneficiary,
  onSignIn,
  section,
  onSectionChange,
  status,
}) => {
  const { language, setLanguage, t, isAr, brandName } = useLanguage();
  const contact = useContact();

  // Active sub-section state (Default to 'card')
  const activeSection: ProfileSubSection = section ?? (mode === 'card' ? 'card' : 'list');
  const setActiveSection = (s: ProfileSubSection) => onSectionChange(s === 'card' || s === 'list' ? null : (s as Exclude<ProfileSubSection, 'card' | 'list'>));
  const isCardMode = mode === 'card';

  // Card sub-section states
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(beneficiaries[0]?.id || 'ben-1');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Personal Info form state
  const [personalInfo, setPersonalInfo] = useState({
    fullName: account.name,
    phone: account.phone,
    email: '',
    governorateId: '' as string,
    cityId: '' as string,
    nationalId: '',
    gender: '' as '' | 'male' | 'female',
    jobTitle: '',
    companyName: '',
    dob: '',
    address: '',
    building: '',
  });
  // The profile photo: picked here, framed in a circle (AvatarCropper), uploaded at once, then shown across the app.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [viewAvatar, setViewAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; missing: string[] } | null>(null);
  const [idChange, setIdChange] = useState<import('../api/auth').Profile['idChange']>(null);
  const [personalSaveSuccess, setPersonalSaveSuccess] = useState(false);
  const [personalBusy, setPersonalBusy] = useState(false);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [nameTried, setNameTried] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // The member's saved details come from the backend once they are signed in (phone + code).
  const personalOpen = activeSection === 'personal' && account.signedIn;
  const token = getSession().token;
  const family = useApi(token ? `family:${token}` : null, () => fetchFamily(token!));
  const people = family.data?.members ?? [];
  // Only a male member adds children (by first name); anyone else asks customer service.
  const canAddChildren = family.data?.canAddChildren === true;
  const awaiting = people.filter((p) => p.approval_status !== 'approved');
  // The signed-in member's own card state: the trial / relatives rules and the open payment. Never cached.
  const membership = useApi(token ? `membership:${token}` : null, () => fetchMembership(token!));
  const reloadMembership = membership.reload;
  useEffect(() => onMembershipChanged(reloadMembership), [reloadMembership]);
  const relatives = membership.data?.relatives;
  const [relativesAsked, setRelativesAsked] = useState(false);
  const [relativesError, setRelativesError] = useState(false);
  const askRelatives = async () => {
    if (!token) return;
    setRelativesError(false);
    try {
      await requestRelatives(token);
      setRelativesAsked(true);
    } catch (err) {
      setRelativesError(true);
      reportClientError('Relatives request failed', err);
    }
  };
  const governorates = useApi(personalOpen ? `all-governorates:${language}` : null, (signal) => fetchLocations(signal));

  useEffect(() => {
    const t = getSession().token;
    if (!t) return;
    let alive = true;
    fetchProfile(t).then((p) => { if (alive) { setAvatarUrl(p.avatarUrl); setProgress(p.progress); } }, () => undefined);
    return () => { alive = false; };
  }, []);

  const saveAvatar = async (cropped: File) => {
    const t = getSession().token;
    if (!t) return;
    const url = await uploadAvatar(t, cropped);
    // The same address now serves the new picture: ask the browser for it afresh.
    setAvatarUrl(url ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : null);
    setCropFile(null);
    setAvatarError(null);
  };

  useEffect(() => {
    const token = getSession().token;
    if (!personalOpen || !token) return;
    let cancelled = false;

    fetchProfile(token).then(
      (p) => {
        if (cancelled) return;
        setPersonalInfo((cur) => ({
          fullName: p.name ?? cur.fullName,
          phone: p.phone ?? cur.phone,
          email: p.email ?? '',
          governorateId: p.governorateId ? String(p.governorateId) : '',
          cityId: p.cityId ? String(p.cityId) : '',
          nationalId: p.nationalId ?? '',
          gender: p.gender ?? '',
          jobTitle: p.jobTitle ?? '',
          companyName: p.companyName ?? '',
          dob: p.dob ?? '',
          address: cur.address,
          building: cur.building,
        }));
        setProgress(p.progress);
        setIdChange(p.idChange);
        setSavedNationalId(p.nationalId ?? '');
        fetchSavedAddress(token).then(
          (a) => { if (!cancelled && a) setPersonalInfo((cur) => ({ ...cur, address: a.street ?? '', building: a.building_number ?? '' })); },
          () => undefined,
        );
      },
      (err) => {
        if (!cancelled && err instanceof ApiError && err.status === 401) setSessionExpired(true);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [personalOpen]);

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Support ticket form state
  const [ticketTopic, setTopic] = useState('ticketTopicGeneral');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketPhone, setTicketPhone] = useState(account.phone);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const currentBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId) || beneficiaries[0];

  const memId = currentBeneficiary.cardNumber;

  const handleCopyCardId = () => {
    navigator.clipboard.writeText(memId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleDownload = async (side: 'front' | 'back' = 'front') => {
    setIsDownloading(true);
    try {
      // The real artwork first; the locally drawn card only if the server cannot give it.
      await downloadCardImageFile(account.number, side).catch(() => downloadDeilarCardImage(currentBeneficiary, side));
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to download card:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  /** The family card is its two sides: front, then back. */
  const handleDownloadBoth = async () => {
    await handleDownload('front');
    await handleDownload('back');
  };

  const handleShareWhatsApp = () => {
    const cardTitle = isAr ? `بطاقة ${brandName} المعتمدة للخصم 🎫` : `${brandName} Certified Medical Discount Card 🎫`;
    const text = encodeURIComponent(
      `${cardTitle}\n${isAr ? 'الاسم' : 'Name'}: ${currentBeneficiary.name}\n${isAr ? 'رقم العضوية' : 'Membership ID'}: ${memId}\n${isAr ? 'الصلاحية' : 'Validity'}: ${account.validTo ?? '-'}\n${isAr ? 'خصومات تصل حتى 70% في المستشفيات والمعامل.' : 'Discounts up to 70% at hospitals & labs.'}\nhttps://deilar.com`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Once the card carries a national ID it is read-only here.
  const [savedNationalId, setSavedNationalId] = useState('');
  const idLocked = savedNationalId !== '';

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getSession().token;
    if (!token || personalBusy) return;

    // Spaces alone are not a name.
    if (personalInfo.fullName.trim().length < 3) {
      setNameTried(true);
      setPersonalSaveSuccess(false);
      setPersonalError(isAr ? 'الاسم مطلوب (٣ أحرف على الأقل). أكمل البيانات الناقصة ثم احفظ.' : 'Your name is required (at least 3 characters). Fill in what is missing, then save.');
      return;
    }

    setPersonalBusy(true);
    setPersonalError(null);
    setPersonalSaveSuccess(false);

    try {
      await updateProfile(token, {
        name: personalInfo.fullName.trim(),
        email: personalInfo.email.trim() || null,
        ...(personalInfo.gender ? { gender: personalInfo.gender } : {}),
        job_title: personalInfo.jobTitle.trim() || null,
        company_name: personalInfo.companyName.trim() || null,
        date_of_birth: personalInfo.dob || null,
        // An ID that is already on the card is changed only through a request (see <NationalIdChange>).
        ...(idLocked ? {} : { national_id: personalInfo.nationalId.trim() || null }),
        governorate_id: personalInfo.governorateId ? Number(personalInfo.governorateId) : null,
        city_id: personalInfo.cityId ? Number(personalInfo.cityId) : null,
      });
      // The address belongs to a governorate (the backend requires it); the photo is its own upload.
      if (personalInfo.address.trim()) {
        if (!personalInfo.governorateId) {
          setPersonalError(isAr ? 'اختر المحافظة أولاً ليُحفظ العنوان' : 'Choose your governorate first so the address can be saved');
          return;
        }
        await saveHomeAddress(token, {
          governorate_id: Number(personalInfo.governorateId),
          city_id: personalInfo.cityId ? Number(personalInfo.cityId) : null,
          street: personalInfo.address.trim(),
          building_number: personalInfo.building.trim() || undefined,
        });
      }
      // The percentage is the backend's count; ask it again rather than guessing what changed.
      fetchProfile(token).then((p) => setProgress(p.progress), () => undefined);
      setPersonalSaveSuccess(true);
      setTimeout(() => setPersonalSaveSuccess(false), 3500);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSessionExpired(true);
      } else {
        const first = err instanceof ApiError && err.status === 422 ? Object.values((err.body?.errors ?? {}) as Record<string, string[]>)[0]?.[0] : undefined;
        setPersonalError(first ?? (isAr ? 'تعذر حفظ بياناتك، حاول مرة أخرى' : 'Could not save your details, please try again'));
      }
    } finally {
      setPersonalBusy(false);
    }
  };

  // Lands in the Contact Us inbox of the back office, like the website's contact form.
  const handleSendSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = ticketMessage.trim();
    const phone = ticketPhone.replace(/[\s-]/g, '');
    if (!message || ticketBusy) return;

    if (!/^\+?\d{8,15}$/.test(phone)) {
      setTicketError(isAr ? 'أدخل رقم هاتف صحيح للتواصل معك' : 'Enter a valid phone number so we can reach you');
      return;
    }

    setTicketBusy(true);
    setTicketError(null);

    try {
      await postContactMessage({
        phone,
        name: account.name || undefined,
        message: `[${t(ticketTopic as Parameters<typeof t>[0])}] ${message}${account.number ? `\n${isAr ? 'رقم العضوية' : 'Membership'}: ${account.number}` : ''}`,
        source: 'contact_form',
      });
      setTicketSent(true);
      setTicketMessage('');
      setTimeout(() => setTicketSent(false), 4000);
    } catch (err) {
      setTicketError(err instanceof ApiError && err.status === 429 ? (isAr ? 'محاولات كثيرة، حاول لاحقاً' : 'Too many attempts, try later') : isAr ? 'تعذر إرسال رسالتك، حاول مرة أخرى' : 'Could not send your message, please try again');
    } finally {
      setTicketBusy(false);
    }
  };

  const isDark = theme === 'dark';
  // Red once the name is empty or too short, and from the first failed save.
  const nameBad = personalInfo.fullName.trim().length < 3 && (nameTried || !personalInfo.fullName.trim());

  // /card/pay is the payment form and nothing else: no banners, tabs or card around it.
  if (activeSection === 'pay') {
    return (
      <div className={`pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
        {token && membership.data ? (
          <PayPage token={token} status={membership.data} onDone={membership.reload} />
        ) : (
          <div className="py-10 flex justify-center text-slate-400" aria-hidden><span className="w-6 h-6 rounded-full border-2 border-slate-300 border-t-[#941946] animate-spin" /></div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* A scan of an expired card says so first, in red, with every way to pay or call. */}
      {isCardMode && <CardStatusBanner status={status} number={account.number} />}

      {/* The name is required: say what is missing and take the member straight to the field. */}
      {isCardMode && account.signedIn && !account.name.trim() && (
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-3.5 flex items-start gap-3 text-red-800">
          <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-black">{isAr ? 'بيانات ناقصة: الاسم مطلوب' : 'Missing details: your name is required'}</p>
            <p className="text-xs leading-relaxed">{isAr ? 'أضف اسمك بالكامل ليظهر على كرتك.' : 'Add your full name so it appears on your card.'}</p>
            <button type="button" onClick={() => setActiveSection('personal')} className="px-3.5 py-2 rounded-xl bg-red-700 text-white text-xs font-bold cursor-pointer">
              {isAr ? 'إضافة الاسم الآن' : 'Add my name now'}
            </button>
          </div>
        </div>
      )}

      {/* Subscribe or renew: while on trial, once expired, or within a month of the end. */}
      {isCardMode && activeSection === 'card' && token && membership.data && (membership.data.is_trial || membership.data.expired || membership.data.days_left <= 30) && (
        <SubscribePanel token={token} status={membership.data} onDone={membership.reload} />
      )}

      {/* 1. Profile Identity Header */}
      {(isCardMode || activeSection === 'list') && (
      <section className={`rounded-2xl p-4 border transition-colors shadow-2xs ${
        isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="relative w-[68px] h-[68px] shrink-0"
              role={progress ? 'progressbar' : undefined}
              aria-valuenow={progress?.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {progress && (
                <svg viewBox="0 0 68 68" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
                  <circle cx="34" cy="34" r="31" fill="none" strokeWidth="4" className={isDark ? 'stroke-white/10' : 'stroke-slate-200'} />
                  <circle
                    cx="34" cy="34" r="31" fill="none" strokeWidth="4" strokeLinecap="round"
                    className={progress.percent >= 100 ? 'stroke-emerald-500' : 'stroke-[#941946]'}
                    strokeDasharray={2 * Math.PI * 31}
                    strokeDashoffset={2 * Math.PI * 31 * (1 - Math.min(progress.percent, 100) / 100)}
                    style={{ transition: 'stroke-dashoffset 0.6s' }}
                  />
                </svg>
              )}
              <div
                role={avatarUrl ? 'button' : undefined}
                onClick={avatarUrl ? () => setViewAvatar(true) : undefined}
                className={`absolute inset-[7px] rounded-full overflow-hidden bg-gradient-to-br from-[#941946] to-[#6d1132] text-white flex items-center justify-center font-bold text-xl shadow-md ${avatarUrl ? 'cursor-pointer' : ''}`}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{personalInfo.fullName.charAt(0) || 'D'}</span>}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-slate-900'}`}>{personalInfo.fullName}</h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {t('activeMember')}
                </span>
              </div>
              <p className="text-xs text-[#c89e43] font-bold mt-0.5">{t('membershipId')}: {account.number}</p>
              <p className={`text-[11px] font-mono ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{personalInfo.phone}</p>
            </div>
          </div>

        </div>

        {!isCardMode && (account.signedIn ? (
          <button
            onClick={onLogout}
            className={`mt-3 w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              isDark
                ? 'border-rose-400/40 text-rose-300 hover:bg-rose-500/10'
                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isAr ? 'تسجيل الخروج' : 'Log out'}</span>
          </button>
        ) : (
          <button
            onClick={onLogout}
            className={`mt-3 text-[11px] font-bold hover:underline cursor-pointer ${isDark ? 'text-rose-300' : 'text-[#941946]'}`}
          >
            {isAr ? 'إزالة الكرت من هذا الجهاز' : 'Remove card from this device'}
          </button>
        ))}
      </section>
      )}

      {/* 2. The card tab's two pages: the card and its relatives */}
      {isCardMode && (
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

      </div>
      )}

      {/* The account tab: a plain list, each row opens its own page. */}
      {!isCardMode && activeSection === 'list' && (
        <nav className={`rounded-2xl border overflow-hidden shadow-2xs divide-y ${isDark ? 'bg-[#181B26] border-white/[0.08] divide-white/[0.08]' : 'bg-white border-slate-200/90 divide-slate-100'}`}>
          {([
            { key: 'personal', icon: UserCheck, label: t('tabPersonal'), go: () => setActiveSection('personal') },
            { key: 'addresses', icon: MapPin, label: isAr ? 'عناويني' : 'Addresses', go: () => setActiveSection('addresses') },
            { key: 'orders', icon: PackageSearch, label: isAr ? 'طلباتي' : 'My orders', go: () => navigate(routeHref({ orders: { code: null } })) },
            { key: 'support', icon: Headphones, label: t('tabSupport'), go: () => setActiveSection('support') },
            { key: 'theme', icon: Palette, label: t('tabTheme'), go: () => setActiveSection('theme') },
          ] as const).map(({ key, icon: Icon, label, go }) => (
            <button key={key} onClick={go} className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-bold cursor-pointer transition-colors ${isDark ? 'text-[#F1F5F9] hover:bg-[#1E2330]' : 'text-slate-800 hover:bg-slate-50'}`}>
              <span className="w-9 h-9 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center shrink-0"><Icon className="w-4.5 h-4.5" /></span>
              <span className="flex-1 text-start">{label}</span>
              <ChevronLeft className={`w-4 h-4 text-slate-400 ${isAr ? '' : 'rotate-180'}`} />
            </button>
          ))}
        </nav>
      )}

      {/* An account page: a way back to the list. */}
      {!isCardMode && activeSection !== 'list' && (
        <button onClick={() => setActiveSection('list')} className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'} hover:text-[#941946]`}>
          <ChevronRight className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} />
          <span>{isAr ? 'حسابي' : 'Account'}</span>
        </button>
      )}

      {viewAvatar && avatarUrl && <ImageViewer images={[avatarUrl]} index={0} onIndexChange={() => undefined} onClose={() => setViewAvatar(false)} />}
      {cropFile && <AvatarCropper file={cropFile} onConfirm={saveAvatar} onCancel={() => setCropFile(null)} />}

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
            <MembershipCardImage
              number={account.number}
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

            {token && membership.data && <CardExpiry status={membership.data} dark={isDark} />}
          </div>

          {/* Download & Actions Toolbar */}
          <div className="pt-1 space-y-2">
            <button
              onClick={handleDownloadBoth}
              disabled={isDownloading}
              className="w-full py-2.5 px-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t('downloadFamilyCard')}</span>
            </button>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
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
      {activeSection === 'addresses' && (token ? <AddressesTab token={token} dark={isDark} /> : (
        <p className="p-3 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{isAr ? 'سجّل الدخول برقم هاتفك أولاً لإضافة عناوينك.' : 'Sign in with your phone first to add your addresses.'}</p>
      ))}

      {activeSection === 'members' && (
        <section className={`rounded-2xl p-4 border transition-colors shadow-2xs space-y-3 animate-in fade-in duration-150 ${
          isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#941946]" />
              <h3 className="text-xs font-bold">{t('familyMembersCount')} ({beneficiaries.length})</h3>
            </div>
            
            {/* A trial card holds the owner alone; a full one takes up to the cap, first degree only. */}
            {/* A trial card cannot take members: the button is there but locked, and leads to payment. */}
            {relatives?.must_contact_support && (
              <button
                onClick={() => navigate(routeHref({ tab: 'mycard', section: 'pay' }))}
                className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title={isAr ? 'يلزم الدفع لإضافة أفراد' : 'Payment is required to add members'}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t('addNewMember')}</span>
              </button>
            )}
            {(!relatives || relatives.can_add) && canAddChildren && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-2.5 py-1 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addNewMember')}</span>
              </button>
            )}
          </div>

          {relatives && (
            <div className={`p-3 rounded-2xl border text-[11px] space-y-2 ${isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#CBD5E1]' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              <p className="font-bold">
                {isAr ? `${relatives.count} من ${relatives.max} مستخدم` : `${relatives.count} of ${relatives.max} used`}
                {' · '}
                {isAr ? 'أقارب الدرجة الأولى (الوالدان والزوج/الزوجة والأبناء)' : 'first-degree relatives (parents, spouse, children)'}
              </p>
              {relatives.must_contact_support ? (
                <>
                  <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                    <p className="font-black flex items-center gap-1.5"><Lock className="w-4 h-4" />{isAr ? 'يلزم الدفع لإضافة أفراد العائلة' : 'You need to pay to add family members'}</p>
                    <p>{isAr ? 'الكارت التجريبي يشملك وحدك. اشترك في الكارت الكامل لتتمكن من إضافة أبنائك وأقاربك من الدرجة الأولى.' : 'The trial card covers only you. Subscribe to the full card to add your children and first-degree relatives.'}</p>
                    <button onClick={() => navigate(routeHref({ tab: 'mycard', section: 'pay' }))} className="px-3.5 py-2 rounded-xl bg-[#941946] text-white text-[11px] font-bold cursor-pointer">
                      {isAr ? 'ادفع الآن لإضافة الأفراد' : 'Pay now to add members'}
                    </button>
                  </div>
                  <p>{isAr ? 'خلال التجربة يشملك الكارت وحدك. اضغط الزر وستتصل بك خدمة العملاء لإضافة أقاربك.' : 'During the trial your card holds you only. Press the button and customer service will call you to add your relatives.'}</p>
                  <button
                    onClick={askRelatives}
                    disabled={relativesAsked}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                  >
                    {relativesAsked ? (isAr ? 'تم الإرسال — ستتصل بك خدمة العملاء' : 'Sent — customer service will call you') : isAr ? 'اتصلوا بي لإضافة أقاربي' : 'Call me to add my relatives'}
                  </button>
                  {relativesError && <p className="text-rose-600 font-bold">{isAr ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'The request could not be sent. Please try again.'}</p>}
                </>
              ) : !canAddChildren && relatives.can_add ? (
                <>
                  <p>{isAr ? 'لإضافة أقاربك تواصل مع خدمة العملاء. اضغط الزر وسنتصل بك.' : 'To add your relatives, contact customer service. Press the button and we will call you.'}</p>
                  <button
                    onClick={askRelatives}
                    disabled={relativesAsked}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold disabled:opacity-60 cursor-pointer"
                  >
                    {relativesAsked ? (isAr ? 'تم الإرسال — ستتصل بك خدمة العملاء' : 'Sent — customer service will call you') : isAr ? 'اتصلوا بي لإضافة أقاربي' : 'Call me to add my relatives'}
                  </button>
                  {relativesError && <p className="text-rose-600 font-bold">{isAr ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'The request could not be sent. Please try again.'}</p>}
                </>
              ) : !relatives.can_add ? (
                <p>{relatives.count >= relatives.max ? (isAr ? 'وصلت للحد الأقصى. تواصل مع خدمة العملاء.' : 'You have reached the limit. Contact customer service.') : isAr ? 'جدّد الكارت لإضافة أقارب.' : 'Renew your card to add relatives.'}</p>
              ) : (
                <p>{isAr ? 'أضف أبناءك بالاسم الأول فقط — يُضاف اسمك تلقائياً، وينتظر الابن موافقة فريقنا.' : 'Add your children by first name only — your name is added automatically, and each child waits for our team to approve.'}</p>
              )}
            </div>
          )}

          <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            {t('familyMembersDesc')}
          </p>

          {awaiting.length > 0 && (
            <div className="space-y-2">
              {awaiting.map((p) => (
                <div
                  key={`pending-${p.id}`}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                    p.approval_status === 'rejected'
                      ? isDark ? 'bg-rose-500/10 border-rose-400/30' : 'bg-rose-50 border-rose-200'
                      : isDark ? 'bg-amber-500/10 border-amber-400/30' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <p className={`text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
                      {p.relationship_label ?? p.relationship}
                      {p.approval_status === 'rejected' && p.rejection_reason ? ` • ${p.rejection_reason}` : ''}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      p.approval_status === 'rejected'
                        ? 'text-rose-600 bg-rose-500/10 border-rose-500/30'
                        : 'text-amber-600 bg-amber-500/10 border-amber-500/30'
                    }`}
                  >
                    {p.approval_status === 'rejected'
                      ? isAr ? 'مرفوض' : 'Rejected'
                      : isAr ? 'بانتظار موافقة الإدارة' : 'Awaiting admin approval'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 pt-1">
            {beneficiaries.map((b) => {
              const open = expandedId === b.id;
              const fam = b.id.startsWith('member-') ? people.find((f) => `member-${f.id}` === b.id) : undefined;
              const rows: [string, string | null | undefined][] = [
                [isAr ? 'الاسم' : 'Name', b.name],
                [isAr ? 'الصلة' : 'Relation', b.relation || t('primaryAccount')],
                [isAr ? 'رقم الكرت' : 'Card number', b.cardNumber],
                [isAr ? 'الرقم القومي' : 'National ID', b.nationalId],
                [isAr ? 'تاريخ الميلاد' : 'Date of birth', b.dob],
                [isAr ? 'الحالة' : 'Status', fam ? (fam.is_active ? (isAr ? 'مفعل' : 'Active') : isAr ? 'غير مفعل' : 'Inactive') : b.status === 'active' ? t('activeStatus') : isAr ? 'بانتظار الموافقة' : 'Awaiting approval'],
              ];
              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border transition-all ${
                    selectedBeneficiaryId === b.id
                      ? isDark ? 'bg-[#941946]/20 border-[#941946]' : 'bg-rose-50/80 border-[#941946]/40 shadow-xs'
                      : isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] border-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/70'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => { setExpandedId(open ? null : b.id); setSelectedBeneficiaryId(b.id); }}
                    className="w-full p-3 flex items-center justify-between cursor-pointer text-start"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#941946]/15 text-[#941946] flex items-center justify-center font-bold text-sm shrink-0">
                        {b.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold truncate">{b.name}</p>
                          <span className={`text-[10px] px-2 py-0.2 rounded-md shrink-0 ${isDark ? 'bg-[#252c3d] text-[#94A3B8]' : 'bg-slate-200/80 text-slate-500'}`}>
                            {b.relation || t('primaryAccount')}
                          </span>
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`}>{b.cardNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {t('activeStatus')}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#941946] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {open && (
                    <div className={`px-3 pb-3 pt-1 space-y-2 border-t animate-in fade-in slide-in-from-top-1 duration-150 ${isDark ? 'border-white/[0.08]' : 'border-slate-200/70'}`}>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                        {rows.filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className="min-w-0">
                            <dt className={isDark ? 'text-[#94A3B8]' : 'text-slate-500'}>{k}</dt>
                            <dd className="font-bold truncate" dir={k === 'Name' || k === 'الاسم' || k === 'Relation' || k === 'الصلة' || k === 'Status' || k === 'الحالة' ? undefined : 'ltr'}>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <button
                        type="button"
                        onClick={() => { setSelectedBeneficiaryId(b.id); setActiveSection('card'); }}
                        className="w-full py-2.5 rounded-xl bg-[#941946] hover:bg-[#7b1439] text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>{t('viewCardAction')}</span>
                        <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add member: every field + camera pictures, then waits for admin approval */}
          {showAddMemberModal && (
            token ? (
              <AddChildForm
                token={token}
                isAr={isAr}
                isDark={isDark}
                fatherName={account.name}
                onCancel={() => setShowAddMemberModal(false)}
                onSent={() => {
                  setShowAddMemberModal(false);
                  family.reload();
                }}
              />
            ) : (
              <p className={`p-3 rounded-xl text-[11px] font-bold ${isDark ? 'bg-[#1E2330] text-amber-300' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                {isAr ? 'سجّل الدخول برقم هاتفك أولاً لإضافة فرد جديد.' : 'Sign in with your phone number first to add a family member.'}
              </p>
            )
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
              href={contact.whatsapp ? `https://wa.me/${contact.whatsapp}` : undefined}
              target="_blank"
              rel="noreferrer"
              className={`${contact.whatsapp ? '' : 'opacity-40 pointer-events-none '}py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t('directWhatsapp')}</span>
            </a>

            <a
              href={contact.dial ? `tel:${contact.dial}` : undefined}
              className={`${contact.dial ? '' : 'opacity-40 pointer-events-none '}py-3 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs ${
                isDark ? 'bg-[#1E2330] hover:bg-[#252c3d] text-white border border-white/[0.08]' : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-amber-400" />
              <span>{t('hotlineCall')}</span>
            </a>
          </div>

          {/* Company contact details */}
          <div className={`rounded-2xl border divide-y ${isDark ? 'bg-[#1E2330] border-white/[0.08] divide-white/[0.08]' : 'bg-slate-50 border-slate-200/80 divide-slate-200/80'}`}>
            {[
              ...(contact.phone ? [{ href: `tel:${contact.dial ?? contact.phone}`, Icon: Phone, label: isAr ? 'هاتف الشركة' : 'Company phone', value: contact.phone, plain: false }] : []),
              ...(contact.email ? [{ href: `mailto:${contact.email}`, Icon: Mail, label: isAr ? 'البريد الإلكتروني' : 'Email', value: contact.email, plain: false }] : []),
            ].map(({ href, Icon, label, value, plain }) => (
              <a key={href} href={href} {...(plain ? { target: '_blank', rel: 'noreferrer' } : {})} className="flex items-center gap-3 px-3.5 py-3">
                <span className="w-9 h-9 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>{label}</span>
                  <span dir={plain ? undefined : 'ltr'} className={`block text-xs font-bold ${plain ? 'leading-relaxed' : 'font-mono truncate'}`}>{value}</span>
                </span>
              </a>
            ))}
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
              href={contact.facebook ?? undefined}
              target="_blank"
              rel="noreferrer"
              className={`${contact.facebook ? '' : 'opacity-40 pointer-events-none '}py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs`}
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

              <input
                type="tel"
                required
                dir="ltr"
                inputMode="tel"
                placeholder={isAr ? 'رقم هاتفك للتواصل' : 'Your phone number'}
                value={ticketPhone}
                onChange={(e) => { setTicketPhone(e.target.value); setTicketError(null); }}
                className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                  isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9] placeholder-[#94A3B8]' : 'bg-white border-slate-200 text-slate-900'
                }`}
              />

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
                disabled={ticketBusy}
                className="w-full py-2.5 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('sendTicketBtn')}</span>
              </button>

              {ticketError && (
                <p className="text-[11px] text-rose-500 font-bold" role="alert">
                  {ticketError}
                </p>
              )}

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

          {!account.signedIn || sessionExpired ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#941946]/10 text-[#941946] flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
                {sessionExpired ? (isAr ? 'انتهت جلستك، سجّل الدخول مرة أخرى بكود التحقق.' : 'Your session expired, sign in again with a verification code.') : isAr ? 'سجّل الدخول برقم هاتفك وكود التحقق لتعديل بياناتك الشخصية.' : 'Sign in with your phone number and the verification code to edit your personal data.'}
              </p>
              <button type="button" onClick={onSignIn} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                <Phone className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الدخول برقم الهاتف' : 'Sign in with phone number'}</span>
              </button>
            </div>
          ) : (
          <form onSubmit={handleSavePersonalInfo} className="space-y-3">
            {progress && progress.percent < 100 && (
              <div className={`p-3 rounded-2xl border space-y-2 ${isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{isAr ? 'اكتمال بياناتك' : 'Your profile'}</span>
                  <span dir="ltr">{progress.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-[#941946] transition-all" style={{ width: `${progress.percent}%` }} /></div>
                <p className="text-[11px] leading-relaxed">
                  {isAr ? 'الناقص: ' : 'Missing: '}
                  {progress.missing.map((k) => (FIELD_LABELS[k] ? (isAr ? FIELD_LABELS[k].ar : FIELD_LABELS[k].en) : k)).join(isAr ? '، ' : ', ')}
                </p>
              </div>
            )}
            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                {t('fullNamePrompt')} <span className="text-red-600 font-black" aria-hidden>*</span>
              </label>
              <div className="relative">
                <User className={`w-4 h-4 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 ${isDark ? 'text-[#94A3B8]' : 'text-slate-400'}`} />
                <input
                  type="text"
                  required
                  minLength={3}
                  aria-invalid={nameBad}
                  value={personalInfo.fullName}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                  className={`w-full ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs rounded-xl border focus:outline-none ${
                    nameBad
                      ? 'border-red-500 bg-red-50 text-red-900 focus:border-red-600 ring-1 ring-red-400'
                      : `focus:border-[#941946] ${isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'}`
                  }`}
                />
              </div>
              {nameBad && <p className="mt-1 text-[11px] font-bold text-red-600">{isAr ? 'الاسم مطلوب' : 'Name is required'}</p>}
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
                    readOnly
                    dir="ltr"
                    title={isAr ? 'رقم الهاتف هو وسيلة تسجيل دخولك ولا يمكن تغييره من هنا' : 'Your phone is your sign-in and cannot be changed here'}
                    value={personalInfo.phone}
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
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    className={`w-full ${isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                      isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <span className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'النوع' : 'Gender'}</span>
              <div className="flex gap-2" role="radiogroup" aria-label={isAr ? 'النوع' : 'Gender'}>
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    role="radio"
                    aria-checked={personalInfo.gender === g}
                    onClick={() => setPersonalInfo({ ...personalInfo, gender: g })}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                      personalInfo.gender === g
                        ? 'bg-[#941946] text-white border-[#941946]'
                        : isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {g === 'male' ? (isAr ? 'ذكر' : 'Male') : isAr ? 'أنثى' : 'Female'}
                  </button>
                ))}
              </div>
            </div>

            <AreaPicker
              dark={isDark}
              governorateId={personalInfo.governorateId ? Number(personalInfo.governorateId) : null}
              cityId={personalInfo.cityId ? Number(personalInfo.cityId) : null}
              onChange={(gov, city) => setPersonalInfo({ ...personalInfo, governorateId: gov ? String(gov) : '', cityId: city ? String(city) : '' })}
            />

            {idLocked ? (
              <NationalIdChange
                dark={isDark}
                current={savedNationalId}
                request={idChange}
                token={getSession().token ?? ''}
                onSent={() => setIdChange({ status: 'pending', new_national_id: '', review_note: null })}
              />
            ) : (
              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                  {t('nationalIdPrompt')}
                </label>
                <input
                  type="text"
                  value={personalInfo.nationalId}
                  maxLength={14}
                  inputMode="numeric"
                  onChange={(e) => setPersonalInfo({ ...personalInfo, nationalId: e.target.value.replace(/\D/g, '') })}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] font-mono ${
                    isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            )}

            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'تاريخ الميلاد' : 'Date of birth'}</label>
              <DobPicker dark={isDark} value={personalInfo.dob} onChange={(dob) => setPersonalInfo({ ...personalInfo, dob })} />
            </div>

            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'المسمى الوظيفي' : 'Job title'}</label>
              <input
                type="text"
                value={personalInfo.jobTitle}
                maxLength={255}
                onChange={(e) => setPersonalInfo({ ...personalInfo, jobTitle: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>
                {isAr ? 'جهة العمل (اختياري)' : 'Company name (optional)'}
              </label>
              <input
                type="text"
                value={personalInfo.companyName}
                maxLength={255}
                onChange={(e) => setPersonalInfo({ ...personalInfo, companyName: e.target.value })}
                className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'العنوان (الشارع والمنطقة)' : 'Address (street and area)'}</label>
                <input
                  type="text"
                  value={personalInfo.address}
                  maxLength={255}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
              <div>
                <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'رقم العقار' : 'Building no.'}</label>
                <input
                  type="text"
                  value={personalInfo.building}
                  maxLength={50}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, building: e.target.value })}
                  className={`w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${isDark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
              </div>
            </div>

            <div>
              <label className={`text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'الصورة الشخصية' : 'Profile photo'}</label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border-2 border-[#941946]/30 flex items-center justify-center shrink-0">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-slate-300" />}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-block px-3.5 py-2 rounded-xl bg-[#941946] hover:bg-[#7b1439] text-white text-[11px] font-bold cursor-pointer">
                    {avatarUrl ? (isAr ? 'تغيير الصورة' : 'Change photo') : isAr ? 'اختيار صورة' : 'Choose a photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        if (file.size > 15 * 1024 * 1024) { setAvatarError(isAr ? 'الصورة كبيرة جداً' : 'That photo is too large'); return; }
                        setAvatarError(null);
                        setCropFile(file);
                      }}
                    />
                  </label>
                  {avatarError && <p className="text-[10px] font-bold text-rose-600">{avatarError}</p>}
                </div>
              </div>
            </div>

            {personalError && (
              <p className="text-[11px] text-rose-500 font-bold" role="alert">
                {personalError}
              </p>
            )}

            <button
              type="submit"
              disabled={personalBusy}
              className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
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
          )}
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
