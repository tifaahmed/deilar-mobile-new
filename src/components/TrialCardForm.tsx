import React, { useState } from 'react';
import { IdCard, Phone, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { startTrial } from '../api/membership';
import { requestOtp, verifyOtp } from '../api/auth';
import { getSession, updateSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';
import { usePopupHash } from '../utils/popupHash';

interface TrialCardFormProps {
  token: string;
  defaultName?: string;
  /** The card exists now: show it. */
  onCreated: (number: string, name: string) => void;
}

/**
 * The free 1-month card: a name and a national ID, nothing else — the phone is the one already
 * signed in. Whether this person may have one (a single trial per phone and per ID, ever) is the
 * backend's call; every refusal comes back with a `reason` and is worded here.
 */
const PHONE_RE = /^01\d{9}$/;
/** Arabic-Indic (٠-٩) and Persian digits typed on an Arabic keyboard become 0-9; everything else non-numeric is dropped. */
const asDigits = (v: string) => v.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/\D/g, '');

export const TrialCardForm: React.FC<TrialCardFormProps> = ({ token: signedInToken, defaultName = '', onCreated }) => {
  const { isAr } = useLanguage();
  // One name on the card, typed as two boxes: the first name, then the rest (family name).
  const [firstName, setFirstName] = useState(() => defaultName.trim().split(/\s+/)[0] ?? '');
  const [lastName, setLastName] = useState(() => defaultName.trim().split(/\s+/).slice(1).join(' '));
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  // The number the sign-in code proved, shown in the form. Changing it means proving the new one with its own code.
  const [token, setToken] = useState(signedInToken);
  const [confirmedPhone, setConfirmedPhone] = useState(getSession().phone ?? '');
  const [phone, setPhone] = useState(getSession().phone ?? '');
  const [codeSentTo, setCodeSentTo] = useState<{ length: number; masked: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = phone !== confirmedPhone;
  // The form shows in the URL like the popups do: /card#free-card-popup (the code step: #free-card-code-popup).
  usePopupHash(codeSentTo ? 'free-card-code-popup' : 'free-card-popup');

  // Fields that are empty or wrong, shown red with a star once a first submit has been tried.
  const [tried, setTried] = useState(false);
  const bad = {
    firstName: firstName.trim().length < 2,
    lastName: lastName.trim().length < 2,
    phone: !PHONE_RE.test(phone),
    nationalId: !/^[23]\d{13}$/.test(nationalId.trim()),
    gender: !gender,
  };
  const labels = { firstName: isAr ? 'الاسم الأول' : 'first name', lastName: isAr ? 'الاسم الثاني' : 'second name', phone: isAr ? 'رقم الهاتف' : 'phone number', nationalId: nationalId.length === 14 ? (isAr ? 'الرقم القومي يجب أن يبدأ بـ 2 أو 3' : 'national ID must start with 2 or 3') : isAr ? 'الرقم القومي (١٤ رقماً)' : 'national ID (14 digits)', gender: isAr ? 'النوع' : 'gender' };
  const missing = (Object.keys(bad) as (keyof typeof bad)[]).filter((k) => bad[k]);
  const show = (k: keyof typeof bad) => tried && bad[k];

  const sendNewCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const sent = await requestOtp(phone);
      setCodeSentTo({ length: sent.code_length, masked: sent.phone_masked });
      setCode('');
    } catch (err) {
      if (err instanceof ApiError && err.reason === 'cooldown') setCodeSentTo({ length: 4, masked: phone });
      else setError(isAr ? 'تعذر إرسال الكود، حاول مرة أخرى.' : 'Could not send the code, please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyNewCode = async (value: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await verifyOtp(phone, value);
      updateSession({ token: result.token, phone: result.user.phone ?? phone, leadPhone: phone });
      setToken(result.token);
      setConfirmedPhone(phone);
      setCodeSentTo(null);

      // That number already holds a card: it is simply theirs to open.
      if (result.membership && !result.membership.membership_number.startsWith('REG-')) {
        updateSession({ cardNumber: result.membership.membership_number });
        onCreated(result.membership.membership_number, name.trim());
      }
    } catch {
      setCode('');
      setError(isAr ? 'الكود غير صحيح' : 'That code is not right');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    setTried(true);
    if (missing.length) {
      setError(isAr ? `بيانات ناقصة: ${missing.map((k) => labels[k]).join('، ')}` : `Missing: ${missing.map((k) => labels[k]).join(', ')}`);
      return;
    }

    if (changed) {
      if (!PHONE_RE.test(phone)) {
        setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
        return;
      }
      await sendNewCode();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const status = await startTrial(token, { name, national_id: nationalId.trim(), gender: gender ?? undefined });
      onCreated(status.membership_number ?? '', name);
    } catch (err) {
      const reason = err instanceof ApiError ? err.reason : undefined;
      setError(
        reason === 'national_id_taken'
          ? isAr ? 'هذا الرقم القومي لديه كارت بالفعل. يرجى التواصل مع خدمة العملاء.' : 'This ID number already has a card. Please contact customer service.'
          : reason === 'phone_taken'
            ? isAr ? 'رقم الهاتف هذا لديه كارت بالفعل. يرجى التواصل مع خدمة العملاء.' : 'This phone number already has a card. Please contact customer service.'
            : reason === 'already_has_card'
              ? isAr ? 'لديك كارت بالفعل.' : 'You already have a card.'
              : err instanceof ApiError && err.status === 422
                ? isAr ? 'تحقق من الاسم والرقم القومي (١٤ رقماً).' : 'Check your name and national ID (14 digits).'
                : isAr ? 'تعذر إنشاء الكارت الآن. حاول مرة أخرى.' : 'The card could not be created. Please try again.',
      );
      if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Trial card request failed', err);
    } finally {
      setBusy(false);
    }
  };

  if (codeSentTo) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (code.length === codeSentTo.length) verifyNewCode(code); }} className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 mt-2 ${isAr ? 'text-right' : 'text-left'}`}>
        <h2 className="text-sm font-black text-slate-900">{isAr ? `أدخل الكود المرسل إلى ${codeSentTo.masked}` : `Enter the code sent to ${codeSentTo.masked}`}</h2>
        <input
          type="text" inputMode="numeric" autoComplete="one-time-code" dir="ltr" autoFocus maxLength={codeSentTo.length} value={code} placeholder={'•'.repeat(codeSentTo.length)}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setCode(v); setError(null); if (v.length === codeSentTo.length && !busy) verifyNewCode(v); }}
          className="w-full text-center text-lg py-2.5 rounded-xl border border-slate-300 font-mono tracking-[0.6em] focus:outline-none focus:border-[#941946]"
        />
        {error && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
        <button type="submit" disabled={busy || code.length !== codeSentTo.length} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold cursor-pointer">
          {busy ? '…' : isAr ? 'تأكيد الرقم' : 'Verify number'}
        </button>
        <button type="button" onClick={() => { setCodeSentTo(null); setError(null); }} className="w-full text-[11px] font-bold text-slate-500 cursor-pointer">{isAr ? 'رجوع' : 'Back'}</button>
      </form>
    );
  }

  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#941946]';
  const red = 'border-red-500 bg-red-50 ring-1 ring-red-400 focus:border-red-600';
  const star = <span className="text-red-600 font-black" aria-hidden>*</span>;

  return (
    <form onSubmit={submit} noValidate className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 mt-2 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="text-center space-y-1">
        <div className="w-14 h-14 rounded-2xl bg-[#941946]/10 text-[#941946] flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-sm font-black text-slate-900">{isAr ? 'احصل على كارت ديلار مجاني لمدة شهر' : 'Get your free 1-month Deilar card'}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isAr ? 'اسمك ورقمك القومي فقط. الكارت يعمل فوراً لمدة شهر.' : 'Only your name and national ID. The card works straight away for one month.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><UserRound className="w-3.5 h-3.5" />{isAr ? 'الاسم الأول' : 'First name'} {star}</span>
          <input type="text" required minLength={2} autoComplete="given-name" aria-invalid={show('firstName')} value={firstName} onChange={(e) => { setFirstName(e.target.value); setError(null); }} className={`${field} ${show('firstName') ? red : ''}`} />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><UserRound className="w-3.5 h-3.5" />{isAr ? 'الاسم الثاني' : 'Second name'} {star}</span>
          <input type="text" required minLength={2} autoComplete="family-name" aria-invalid={show('lastName')} value={lastName} onChange={(e) => { setLastName(e.target.value); setError(null); }} className={`${field} ${show('lastName') ? red : ''}`} />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{isAr ? 'رقم الهاتف' : 'Phone number'} {star}</span>
        <input type="tel" required inputMode="numeric" dir="ltr" maxLength={11} placeholder="010xxxxxxxx" autoComplete="tel" value={phone} onChange={(e) => { setPhone(asDigits(e.target.value).slice(0, 11)); setError(null); }} aria-invalid={show('phone')} className={`${field} font-mono ${show('phone') ? red : ''}`} />
        {changed && <span className="block text-[10px] text-amber-700">{isAr ? 'رقم جديد — سنرسل إليه كود تحقق جديد قبل إنشاء الكارت.' : 'A new number — we will send it a new verification code before the card is created.'}</span>}
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><IdCard className="w-3.5 h-3.5" />{isAr ? 'الرقم القومي' : 'National ID number'} {star}</span>
        <div className="relative">
          <input type="text" required inputMode="numeric" dir="ltr" maxLength={14} pattern="[23][0-9]{13}" placeholder="14" value={nationalId} onChange={(e) => { setNationalId(asDigits(e.target.value).slice(0, 14)); setError(null); }} aria-invalid={show('nationalId')} className={`${field} font-mono ${isAr ? 'pl-14' : 'pr-14'} ${show('nationalId') ? red : ''}`} />
          <span dir="ltr" className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold ${/^[23]\d{13}$/.test(nationalId) ? 'text-emerald-600' : nationalId.length ? 'text-amber-600' : 'text-slate-400'}`}>
            {nationalId.length}/14
          </span>
        </div>
      </label>

      <div className={`flex gap-2 rounded-2xl ${show('gender') ? 'ring-1 ring-red-400 bg-red-50 p-1' : ''}`} role="radiogroup" aria-label={isAr ? 'النوع' : 'Gender'}>
        {(['male', 'female'] as const).map((g) => (
          <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => { setGender(g); setError(null); }} className={`flex-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${gender === g ? 'bg-[#941946] text-white border-[#941946]' : 'bg-white text-slate-700 border-slate-300'}`}>
            {g === 'male' ? (isAr ? 'ذكر' : 'Male') : isAr ? 'أنثى' : 'Female'}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        {isAr
          ? 'الكارت التجريبي خاص بك وحدك. لإضافة أفراد العائلة اطلب من خدمة العملاء الاتصال بك — أو اشترك في الكارت الكامل.'
          : 'A trial card holds you only. To add family, ask customer service to call you — or subscribe to the full card.'}
      </p>

      {error && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      <button type="submit" disabled={busy} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold cursor-pointer">
        {busy ? '…' : changed ? (isAr ? 'تأكيد الرقم الجديد' : 'Verify the new number') : isAr ? 'إنشاء كارتي المجاني' : 'Create my free card'}
      </button>
    </form>
  );
};
