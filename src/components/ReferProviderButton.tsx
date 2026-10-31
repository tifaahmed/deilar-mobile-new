import React, { useState } from 'react';
import { Gift, X, CheckCircle2 } from 'lucide-react';
import { ApiError, postContactMessage } from '../api/http';
import { useLanguage } from '../context/LanguageContext';
import { useSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';
import { REFERRAL_KINDS, REFERRAL_SUBJECT, type ReferralKind, isValidProviderPhone, referralKindLabel, referralMessage } from '../utils/providerReferral';

/** A fixed icon: tap it, type the name and phone of a place you deal with and its kind; the team rings them and you get the discount. */
export const ReferProviderButton: React.FC = () => {
  const { isAr } = useLanguage();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<ReferralKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => { setOpen(false); setSent(false); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim()) { setError(isAr ? 'اكتب اسم مقدم الخدمة' : 'Enter the provider\'s name'); return; }
    if (!isValidProviderPhone(phone)) { setError(isAr ? 'اكتب رقم تليفون صحيح لمقدم الخدمة' : 'Enter a valid phone number for the provider'); return; }
    if (!kind) { setError(isAr ? 'اختر نوع المكان' : 'Pick the kind of place'); return; }
    setBusy(true);
    setError(null);
    try {
      await postContactMessage({
        phone: phone.replace(/[\s-]/g, ''),
        name: name.trim(),
        subject: REFERRAL_SUBJECT,
        message: referralMessage({ providerName: name.trim(), providerPhone: phone.trim(), kind, from: { name: session.name, phone: session.phone, card: session.cardNumber } }),
        source: 'provider_referral',
      });
      setSent(true);
      setName(''); setPhone(''); setKind(null);
    } catch (err) {
      reportClientError('Provider referral failed', { message: String(err) });
      setError(err instanceof ApiError && err.status === 429 ? (isAr ? 'محاولات كثيرة، حاول لاحقاً' : 'Too many attempts, try later') : isAr ? 'تعذر الإرسال، حاول مرة أخرى' : 'Could not send, please try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={isAr ? 'رشّح مقدم خدمة' : 'Recommend a provider'}
        onClick={() => setOpen(true)}
        className="fixed bottom-36 left-4 sm:left-6 z-40 w-12 h-12 rounded-full bg-[#941946] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Gift className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 space-y-3 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-800">{isAr ? 'رشّح مقدم خدمة واستفد بخصم' : 'Recommend a provider, get a discount'}</h2>
              <button type="button" aria-label={isAr ? 'إغلاق' : 'Close'} onClick={close} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
            </div>

            {sent ? (
              <div className="py-6 text-center space-y-2" data-testid="referral-sent">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-800">{isAr ? 'وصلنا ترشيحك، هنكلّمه ونبلّغك.' : 'We got your recommendation and will call them.'}</p>
                <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">{isAr ? 'تمام' : 'OK'}</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <p className="text-[11px] text-slate-500">{isAr ? 'اكتب بيانات مقدم الخدمة اللي بتتعامل معاه، ولما ينضم معانا هتستفيد بنسبة خصم.' : 'Enter the provider you deal with; when they join us you get a discount.'}</p>
                <div className="flex gap-1.5" role="group" aria-label={isAr ? 'نوع المكان' : 'Kind of place'}>
                  {REFERRAL_KINDS.map((k) => (
                    <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${kind === k ? 'bg-[#941946] text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {referralKindLabel(k, isAr)}
                    </button>
                  ))}
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={isAr ? 'اسم مقدم الخدمة' : 'Provider name'} aria-label={isAr ? 'اسم مقدم الخدمة' : 'Provider name'} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" maxLength={20} placeholder={isAr ? 'رقم تليفون مقدم الخدمة' : 'Provider phone'} aria-label={isAr ? 'رقم تليفون مقدم الخدمة' : 'Provider phone'} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
                {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
                <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl bg-[#941946] text-white text-sm font-black disabled:opacity-60">{busy ? '…' : isAr ? 'إرسال الترشيح' : 'Send'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
