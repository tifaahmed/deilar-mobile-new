import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { deleteAccount } from '../api/auth';
import { ApiError } from '../api/http';
import { reportClientError } from '../utils/reportError';
import { LegalSheet, type LegalKind } from './LegalPages';

interface DeleteAccountModalProps {
  token: string;
  /** The card has relatives (or the member holds the primary card): they are deleted with it. */
  hasRelatives: boolean;
  onClose: () => void;
  /** The account is gone on the server: the caller clears the session on this device. */
  onDeleted: () => void;
}

/** App Store 5.1.1(v): deleting the account is possible from inside the app, with a clear warning and one confirmation. */
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ token, hasRelatives, onClose, onDeleted }) => {
  const { isAr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legal, setLegal] = useState<LegalKind | null>(null);
  const [typed, setTyped] = useState('');
  const word = isAr ? 'حذف' : 'DELETE';
  const confirmed = typed.trim().toUpperCase() === word;

  const run = async () => {
    setBusy(true);
    setError(null);

    try {
      await deleteAccount(token);
      onDeleted();
    } catch (e) {
      reportClientError('deleteAccount failed', e);
      setError(e instanceof ApiError && e.status !== 500 ? e.message : isAr ? 'تعذر حذف الحساب الآن. حاول لاحقاً أو تواصل مع خدمة العملاء.' : 'Could not delete the account now. Try again later or contact customer service.');
      setBusy(false);
    }
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} onClick={busy ? undefined : onClose} className="fixed inset-0 z-[999] bg-black/70 flex items-end sm:items-center justify-center p-3">
      <div role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-5 space-y-3.5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-base font-black">{isAr ? 'حذف الحساب نهائياً' : 'Delete account permanently'}</h2>
          </div>
          <button onClick={onClose} disabled={busy} aria-label={isAr ? 'إغلاق' : 'Close'} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="text-[13px] leading-6 text-slate-700 list-disc ps-5 space-y-1">
          <li>{isAr ? 'يُحذف كارتك وبياناتك الشخصية وعناوينك ونقاطك.' : 'Your card, personal data, addresses and points are deleted.'}</li>
          {hasRelatives && <li className="font-bold text-rose-700">{isAr ? 'بصفتك صاحب الكارت الأساسي، سيُحذف معك كل الأقارب التابعين لكارتك.' : 'As the primary card holder, every relative on your card is deleted with you.'}</li>}
          <li>{isAr ? 'تُحفظ نسخة مخفية؛ لو سجلت مجدداً بنفس الرقم تعود بياناتك. للمسح النهائي تواصل مع خدمة العملاء. ولا تُسترد مدة الاشتراك المتبقية.' : 'A hidden copy is kept: if you sign up again with the same number your data comes back. For permanent erasure contact customer service. Remaining subscription time is not refunded.'}</li>
          <li>{isAr ? 'نحتفظ بسجلات الطلبات والمدفوعات فقط بالقدر الذي يفرضه القانون.' : 'Order and payment records are kept only as far as the law requires.'}</li>
        </ul>

        <button type="button" onClick={() => setLegal('privacy')} className="text-xs font-bold underline text-[#941946] cursor-pointer">
          {isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </button>

        <label className="block text-xs font-bold text-slate-700">
          {isAr ? `للتأكيد اكتب «${word}»` : `To confirm, type “${word}”`}
          <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} autoComplete="off" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal" />
        </label>

        {error && <p role="alert" className="text-xs font-bold text-rose-700">{error}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} disabled={busy} className="py-3 rounded-2xl bg-slate-100 text-slate-800 text-sm font-bold cursor-pointer disabled:opacity-40">{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button onClick={run} disabled={busy || !confirmed} className="py-3 rounded-2xl bg-rose-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isAr ? 'احذف حسابي' : 'Delete my account'}</span>
          </button>
        </div>
      </div>
      {legal && <LegalSheet kind={legal} onClose={() => setLegal(null)} />}
    </div>
  );
};
