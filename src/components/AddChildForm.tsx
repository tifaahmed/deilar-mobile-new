import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { addFamilyChild } from '../api/family';
import { ApiError } from '../api/http';
import { usePopupHash } from '../utils/popupHash';

interface AddChildFormProps {
  token: string;
  isAr: boolean;
  isDark: boolean;
  /** The father's full name: the child's name on the card is "<first name> <father's name>". */
  fatherName: string;
  /** How many more the card takes and the cap (first-degree relatives), as the backend counted them. */
  remaining?: number;
  max?: number;
  onCancel: () => void;
  /** Called after the server accepted the child (it now waits for approval). */
  onSent: () => void;
}

/** A father adds a son or daughter by FIRST name only; his own name completes it. */
export const AddChildForm: React.FC<AddChildFormProps> = ({ token, isAr, isDark, fatherName, remaining, max, onCancel, onSent }) => {
  const [firstName, setFirstName] = useState('');
  const [relationship, setRelationship] = useState<'son' | 'daughter'>('son');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [tried, setTried] = useState(false);
  usePopupHash('add-child-popup');

  const bad = firstName.trim().length < 2;
  // The backend needs one of phone / birth date / National ID for every relative; a child form offers the birth date.
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneBad = phoneDigits !== '' && !/^01\d{9}$/.test(phoneDigits);
  // One of birth date / phone is enough; a date typed must not be in the future.
  const dobBad = (dob === '' && phoneDigits === '') || (dob !== '' && dob > new Date().toISOString().slice(0, 10));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    if (bad) {
      setError(isAr ? 'الاسم الأول مطلوب' : 'First name is required');
      return;
    }
    if (phoneBad) {
      setError(isAr ? 'أدخل رقم هاتف صحيح من 11 رقم يبدأ بـ 01' : 'Enter a valid 11-digit number starting with 01');
      return;
    }
    if (dobBad) {
      setError(isAr ? 'أدخل تاريخ الميلاد أو رقم الهاتف' : 'Enter the date of birth or a phone number');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addFamilyChild(token, { first_name: firstName.trim(), relationship, ...(dob ? { date_of_birth: dob } : {}), ...(phoneDigits ? { phone: phoneDigits } : {}) });
      setSent(true);
      setTimeout(onSent, 2000);
    } catch (err) {
      if (err instanceof ApiError && err.body?.reason === 'limit_reached') {
        setError(isAr ? `وصلت للحد الأقصى (${max ?? 15} فرداً من الدرجة الأولى). تواصل مع خدمة العملاء.` : `You have reached the limit (${max ?? 15} first-degree relatives). Contact customer service.`);
        return;
      }
      const first = err instanceof ApiError && err.status === 422 ? Object.values((err.body?.errors ?? {}) as Record<string, string[]>)[0]?.[0] : undefined;
      setError(first ?? (isAr ? 'تعذّر إرسال الطلب، حاول مرة أخرى.' : 'Could not send the request, please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const field = `w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:border-[#941946] ${
    tried && bad ? 'border-red-500 bg-red-50 ring-1 ring-red-400 text-red-900' : isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
  }`;

  if (sent) {
    return (
      <div className={`p-5 rounded-2xl border text-center space-y-2 mt-3 ${isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-emerald-50 border-emerald-200'}`}>
        <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
        <p className="text-xs font-black">{isAr ? 'تم إرسال الطلب' : 'Request sent'}</p>
        <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-600'}`}>{isAr ? 'سيظهر الابن على كارتك بعد موافقة الإدارة.' : 'Your child will appear on your card once the admin approves.'}</p>
      </div>
    );
  }

  const full = `${firstName.trim() || (isAr ? 'الاسم' : 'First name')} ${fatherName}`.trim();

  return (
    <form noValidate onSubmit={submit} className={`p-4 rounded-2xl border space-y-3 mt-3 animate-in fade-in ${isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-rose-50/40 border-rose-200'}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold">{isAr ? 'إضافة ابن / ابنة' : 'Add a son / daughter'}</h4>
        <button type="button" onClick={onCancel} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer ${isDark ? 'bg-[#252c3d] text-[#94A3B8]' : 'bg-slate-200 text-slate-600'}`}>✕</button>
      </div>

      {remaining !== undefined && (
        <p className={`text-[11px] font-bold ${remaining === 0 ? 'text-rose-600' : isDark ? 'text-[#c89e43]' : 'text-[#7a5a14]'}`}>
          {isAr ? `الحد الأقصى ${max ?? 15} فرداً من الدرجة الأولى — المتبقي ${remaining}` : `Maximum ${max ?? 15} first-degree relatives — ${remaining} left`}
        </p>
      )}

      <div className="flex gap-2" role="radiogroup">
        {(['son', 'daughter'] as const).map((r) => (
          <button key={r} type="button" role="radio" aria-checked={relationship === r} onClick={() => setRelationship(r)}
            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${relationship === r ? 'bg-[#941946] text-white border-[#941946]' : isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white text-slate-700 border-slate-300'}`}>
            {r === 'son' ? (isAr ? 'ابن' : 'Son') : isAr ? 'ابنة' : 'Daughter'}
          </button>
        ))}
      </div>

      <label className="block space-y-1">
        <span className={`text-[11px] font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'الاسم الأول فقط' : 'First name only'} <span className="text-red-600 font-black">*</span></span>
        <input type="text" autoFocus value={firstName} onChange={(e) => { setFirstName(e.target.value); setError(null); }} aria-invalid={tried && bad} className={field} />
      </label>

      <label className="block space-y-1">
        <span className={`text-[11px] font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'تاريخ الميلاد' : 'Date of birth'}</span>
        <input type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDob(e.target.value); setError(null); }} aria-invalid={tried && dobBad}
          className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:border-[#941946] ${tried && dobBad ? 'border-red-500 bg-red-50 ring-1 ring-red-400 text-red-900' : isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'}`} />
      </label>

      <label className="block space-y-1">
        <span className={`text-[11px] font-bold ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'رقم الهاتف (اختياري إن أدخلت تاريخ الميلاد)' : 'Phone number (optional if you gave the date of birth)'}</span>
        <input type="tel" inputMode="numeric" dir="ltr" maxLength={11} placeholder="010xxxxxxxx" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(null); }} aria-invalid={tried && phoneBad}
          className={`w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:border-[#941946] ${tried && phoneBad ? 'border-red-500 bg-red-50 ring-1 ring-red-400 text-red-900' : isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'}`} />
        <span className={`block text-[10px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>{isAr ? 'يُحفظ الرقم «غير موثق» ولا يُرسل له أي كود الآن؛ يتوثق عندما يدخل صاحبه بكود التأكيد.' : 'The number is saved as "not verified" and no code is sent now; it becomes verified when its owner signs in with the confirmation code.'}</span>
      </label>

      <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
        {isAr ? 'الاسم على الكارت:' : 'Name on the card:'} <span className="font-bold">{full}</span>
      </p>

      {error && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      <button type="submit" disabled={busy || remaining === 0} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isAr ? 'إرسال للموافقة' : 'Send for approval'}</span>
      </button>

      <p role="note" className={`p-2.5 rounded-xl border text-[11px] font-bold leading-5 ${isDark ? 'bg-amber-500/10 border-amber-400/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
        {isAr
          ? 'لإضافة أي فرد آخر من الدرجة الأولى غير الابن والابنة (الزوج/الزوجة أو الأب أو الأم) تواصل مع الدعم الفني.'
          : 'To add any other first-degree relative besides a son or daughter (spouse, father or mother), contact technical support.'}
      </p>
    </form>
  );
};
