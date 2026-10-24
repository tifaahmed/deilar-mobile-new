import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { requestNationalIdChange } from '../api/membership';
import type { Profile } from '../api/auth';
import { usePopupHash } from '../utils/popupHash';
import { reportClientError } from '../utils/reportError';

interface NationalIdChangeProps {
  /** The national ID on the card — shown, never editable. */
  current: string;
  /** The latest change request, if any. */
  request: Profile['idChange'];
  token: string;
  dark?: boolean;
  onSent: () => void;
}

const ID_RE = /^[23]\d{13}$/;

/** The card's national ID is locked: to change it the member files a request with the new number and (optionally) photos of the ID card. */
export const NationalIdChange: React.FC<NationalIdChangeProps> = ({ current, request, token, dark, onSent }) => {
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [tried, setTried] = useState(false);
  usePopupHash('id-change-popup', open);

  const pending = request?.status === 'pending' || done;
  const badId = !ID_RE.test(nationalId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (badId) {
      setError(nationalId.length === 14
        ? isAr ? 'الرقم القومي يجب أن يبدأ بـ 2 أو 3' : 'The national ID must start with 2 or 3'
        : isAr ? 'الرقم القومي الصحيح مطلوب (١٤ رقماً)' : 'The correct national ID is required (14 digits)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestNationalIdChange(token, { nationalId, front, back, note });
      setDone(true);
      setOpen(false);
      onSent();
    } catch (err) {
      const reason = err instanceof ApiError ? err.reason : undefined;
      setError(
        reason === 'national_id_taken' ? (isAr ? 'هذا الرقم القومي مسجل على كارت آخر. تواصل مع خدمة العملاء.' : 'This national ID belongs to another card. Please contact customer service.')
        : reason === 'already_open' ? (isAr ? 'لديك طلب قيد المراجعة بالفعل.' : 'You already have a request waiting for review.')
        : reason === 'same_national_id' ? (isAr ? 'هذا هو رقمك القومي الحالي.' : 'This is already your national ID.')
        : isAr ? 'تعذر إرسال الطلب. حاول مرة أخرى.' : 'The request could not be sent. Please try again.',
      );
      if (!(err instanceof ApiError) || err.status >= 500) reportClientError('National ID change request failed', err);
    } finally {
      setBusy(false);
    }
  };

  const base = dark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900';
  const field = `w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${base}`;
  const red = 'border-red-500 bg-red-50 ring-1 ring-red-400';

  return (
    <div className="space-y-2">
      <label className={`text-[11px] font-bold block ${dark ? 'text-[#F1F5F9]' : 'text-slate-700'}`}>{isAr ? 'الرقم القومي' : 'National ID'}</label>
      <div className="relative">
        <Lock className={`w-4 h-4 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} />
        <input readOnly disabled dir="ltr" value={current} className={`${field} ${isAr ? 'pr-9' : 'pl-9'} font-mono opacity-80`} />
      </div>

      {pending ? (
        <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {isAr ? 'طلب تغيير الرقم القومي قيد المراجعة من خدمة العملاء.' : 'Your national ID change request is waiting for customer service to review it.'}
        </p>
      ) : (
        <>
          {request?.status === 'rejected' && (
            <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {isAr ? 'تم رفض آخر طلب لتغيير الرقم القومي.' : 'Your last national ID change request was declined.'}{request.review_note ? ` ${request.review_note}` : ''}
            </p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isAr ? 'لا يمكن تعديل الرقم القومي مباشرة. لتغييره أرسل طلباً مع صورة البطاقة (وجه وظهر) وسنراجعه ونعتمده.' : 'The national ID cannot be edited directly. To change it, send a request with photos of your ID card (front and back) and we will review and approve it.'}
          </p>
          <button type="button" onClick={() => setOpen(true)} className="w-full py-2.5 rounded-xl border border-[#941946] text-[#941946] text-xs font-bold hover:bg-[#941946]/5 cursor-pointer">
            {isAr ? 'طلب تغيير الرقم القومي' : 'Request a national ID change'}
          </button>
        </>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center" dir={isAr ? 'rtl' : 'ltr'}>
          <form noValidate onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4 space-y-3 text-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black">{isAr ? 'طلب تغيير الرقم القومي' : 'National ID change request'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer" aria-label={isAr ? 'إغلاق' : 'Close'}><X className="w-4 h-4" /></button>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] font-bold">{isAr ? 'الرقم القومي الصحيح' : 'The correct national ID'} <span className="text-red-600 font-black">*</span></span>
              <div className="relative">
                <input
                  type="text" inputMode="numeric" dir="ltr" maxLength={14} value={nationalId} aria-invalid={tried && badId}
                  onChange={(e) => { setNationalId(e.target.value.replace(/\D/g, '')); setError(null); }}
                  className={`w-full px-3 py-2.5 text-sm rounded-xl border font-mono ${isAr ? 'pl-14' : 'pr-14'} focus:outline-none focus:border-[#941946] ${tried && badId ? red : 'border-slate-300 bg-white'}`}
                />
                <span dir="ltr" className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold ${ID_RE.test(nationalId) ? 'text-emerald-600' : nationalId.length ? 'text-amber-600' : 'text-slate-400'}`}>{nationalId.length}/14</span>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {([['front', front, setFront, isAr ? 'وجه البطاقة' : 'ID card front'], ['back', back, setBack, isAr ? 'ظهر البطاقة' : 'ID card back']] as const).map(([key, file, setFile, text]) => (
                <label key={key} className="block space-y-1">
                  <span className="text-[11px] font-bold">{text} <span className="text-slate-400 font-normal">({isAr ? 'اختياري' : 'optional'})</span></span>
                  <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-[11px] file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-[11px] file:font-bold" />
                  {file && <span className="block text-[10px] text-emerald-700 truncate">{file.name}</span>}
                </label>
              ))}
            </div>

            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-[#941946]" />

            {error && <p role="alert" className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}

            <button type="submit" disabled={busy} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold cursor-pointer">
              {busy ? '…' : isAr ? 'إرسال الطلب' : 'Send request'}
            </button>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
};
