import React, { useEffect, useState } from 'react';
import { BadgePercent, X, CheckCircle2 } from 'lucide-react';
import { ApiError, postContactMessage } from '../api/http';
import { useLanguage } from '../context/LanguageContext';
import { useSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';
import { REFERRAL_KINDS, REFERRAL_SUBJECT, type ReferralKind, isValidProviderPhone, referralKindLabel, referralMessage } from '../utils/providerReferral';

/** How often the label beside the icon shows itself (3.5 minutes), when the first one comes, and how long it stays. */
export const NUDGE_EVERY_MS = 210_000;
export const NUDGE_FIRST_MS = 60_000;
export const NUDGE_SHOWN_MS = 9_000;

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
  const [nudge, setNudge] = useState(false);

  // Every few minutes a short line appears beside the icon, so members remember they can recommend a provider for a discount.
  useEffect(() => {
    if (open) { setNudge(false); return; }
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = () => { setNudge(true); clearTimeout(hide); hide = setTimeout(() => setNudge(false), NUDGE_SHOWN_MS); };
    const first = setTimeout(show, NUDGE_FIRST_MS);
    const every = setInterval(show, NUDGE_EVERY_MS);
    return () => { clearTimeout(first); clearInterval(every); clearTimeout(hide); };
  }, [open]);

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
        message: referralMessage({ providerName: name.trim(), providerPhone: phone.trim(), kind, from: { name: session.name, phone: session.phone, card: session.cardNumber }, isAr }),
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
        className={`fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] left-4 sm:left-6 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-2 ring-white flex items-center justify-center active:scale-95 transition-transform ${nudge ? 'animate-bounce' : ''}`}
      >
        <BadgePercent className="w-6 h-6" />
      </button>
      {nudge && (
        <button
          type="button"
          data-testid="referral-nudge"
          onClick={() => setOpen(true)}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed bottom-[calc(10.4rem+env(safe-area-inset-bottom))] left-[4.75rem] sm:left-[5.75rem] z-40 max-w-[11rem] rounded-2xl rounded-bl-sm bg-orange-500 px-3 py-2 text-[11px] font-black leading-snug text-white shadow-lg animate-in fade-in slide-in-from-left-2 duration-300 cursor-pointer"
        >
          {isAr ? 'رشّح مقدم خدمة عايز عليه خصم' : 'Recommend a provider you want a discount on'}
        </button>
      )}

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
