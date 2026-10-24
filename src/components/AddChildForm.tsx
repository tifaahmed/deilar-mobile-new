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
  onCancel: () => void;
  /** Called after the server accepted the child (it now waits for approval). */
  onSent: () => void;
}

/** A father adds a son or daughter by FIRST name only; his own name completes it. */
export const AddChildForm: React.FC<AddChildFormProps> = ({ token, isAr, isDark, fatherName, onCancel, onSent }) => {
  const [firstName, setFirstName] = useState('');
  const [relationship, setRelationship] = useState<'son' | 'daughter'>('son');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [tried, setTried] = useState(false);
  usePopupHash('add-child-popup');

  const bad = firstName.trim().length < 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    if (bad) {
      setError(isAr ? 'الاسم الأول مطلوب' : 'First name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addFamilyChild(token, { first_name: firstName.trim(), relationship });
      setSent(true);
      setTimeout(onSent, 2000);
    } catch (err) {
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
        <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-600'}`}>{isAr ? 'سيظهر الابن على كرتك بعد موافقة الإدارة.' : 'Your child will appear on your card once the admin approves.'}</p>
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

      <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
        {isAr ? 'الاسم على الكرت:' : 'Name on the card:'} <span className="font-bold">{full}</span>
      </p>

      {error && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

      <button type="submit" disabled={busy} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isAr ? 'إرسال للموافقة' : 'Send for approval'}</span>
      </button>
    </form>
  );
};
