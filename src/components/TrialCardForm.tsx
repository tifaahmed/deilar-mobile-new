import React, { useState } from 'react';
import { IdCard, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { startTrial } from '../api/membership';
import { reportClientError } from '../utils/reportError';

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
export const TrialCardForm: React.FC<TrialCardFormProps> = ({ token, defaultName = '', onCreated }) => {
  const { isAr } = useLanguage();
  const [name, setName] = useState(defaultName);
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const status = await startTrial(token, { name: name.trim(), national_id: nationalId.trim(), gender: gender ?? undefined });
      onCreated(status.membership_number ?? '', name.trim());
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

  const field = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-[#941946]';

  return (
    <form onSubmit={submit} className={`bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4 mt-2 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="text-center space-y-1">
        <div className="w-14 h-14 rounded-2xl bg-[#941946]/10 text-[#941946] flex items-center justify-center mx-auto">
          <Sparkles className="w-7 h-7" />
        </div>
        <h2 className="text-sm font-black text-slate-900">{isAr ? 'احصل على كارت ديلار مجاني لمدة شهر' : 'Get your free 1-month Deilar card'}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isAr ? 'اسمك ورقمك القومي فقط. الكارت يعمل فوراً لمدة شهر.' : 'Only your name and national ID. The card works straight away for one month.'}
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><UserRound className="w-3.5 h-3.5" />{isAr ? 'الاسم بالكامل' : 'Full name'}</span>
        <input type="text" required minLength={3} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1"><IdCard className="w-3.5 h-3.5" />{isAr ? 'الرقم القومي' : 'National ID number'}</span>
        <input type="text" required inputMode="numeric" dir="ltr" maxLength={14} pattern="[23][0-9]{13}" placeholder="14" value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))} className={`${field} font-mono`} />
      </label>

      <div className="flex gap-2" role="radiogroup" aria-label={isAr ? 'النوع' : 'Gender'}>
        {(['male', 'female'] as const).map((g) => (
          <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`flex-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${gender === g ? 'bg-[#941946] text-white border-[#941946]' : 'bg-white text-slate-700 border-slate-300'}`}>
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

      <button type="submit" disabled={busy || !gender} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold cursor-pointer">
        {busy ? '…' : isAr ? 'إنشاء كارتي المجاني' : 'Create my free card'}
      </button>
    </form>
  );
};
