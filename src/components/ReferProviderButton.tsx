import { useFab } from '../utils/floatingFabs';
import React, { useEffect, useState } from 'react';
import { BadgePercent, X, CheckCircle2 } from 'lucide-react';
import { ApiError, postContactMessage } from '../api/http';
import { useLanguage } from '../context/LanguageContext';
import { useSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';
import { usePopupHash } from '../utils/popupHash';
import { REFERRAL_SUBJECT, isValidProviderPhone, referralMessage } from '../utils/providerReferral';

/** How often the label beside the icon shows itself (3.5 minutes), when the first one comes, and how long it stays. */
export const NUDGE_EVERY_MS = 210_000;
export const NUDGE_FIRST_MS = 60_000;
export const NUDGE_SHOWN_MS = 9_000;

/** Opens the «recommend a provider» popup from anywhere (e.g. a kind of place the map cannot find nearby). */
export const OPEN_REFER_PROVIDER_EVENT = 'deilar:open-refer-provider';
export const openReferProvider = (): void => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_REFER_PROVIDER_EVENT)); };

/** A fixed icon: tap it, type the name and phone of a place you deal with and its kind; the team rings them and you get the discount. */
export const ReferProviderButton: React.FC = () => {
  const { isAr } = useLanguage();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const fab = useFab('refer');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [nudge, setNudge] = useState(false);

  // An open popup is named in the URL (…#refer-provider-popup), like the other popups.
  usePopupHash('refer-provider-popup', open);

  // Every few minutes a short line appears beside the icon, so members remember they can recommend a provider for a discount.
  useEffect(() => {
    if (open) { setNudge(false); return; }
    let hide: ReturnType<typeof setTimeout> | undefined;
    const show = () => { setNudge(true); clearTimeout(hide); hide = setTimeout(() => setNudge(false), NUDGE_SHOWN_MS); };
    const first = setTimeout(show, NUDGE_FIRST_MS);
    const every = setInterval(show, NUDGE_EVERY_MS);
    return () => { clearTimeout(first); clearInterval(every); clearTimeout(hide); };
  }, [open]);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_REFER_PROVIDER_EVENT, show);
    return () => window.removeEventListener(OPEN_REFER_PROVIDER_EVENT, show);
  }, []);

  const close = () => { setOpen(false); setSent(false); setError(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!isValidProviderPhone(phone)) { setError(isAr ? 'اكتب رقم تليفون صحيح لمقدم الخدمة' : 'Enter a valid phone number for the provider'); return; }
    setBusy(true);
    setError(null);
    try {
      await postContactMessage({
        phone: phone.replace(/[\s-]/g, ''),
        ...(name.trim() ? { name: name.trim() } : {}),
        subject: REFERRAL_SUBJECT,
        message: referralMessage({ providerName: name.trim(), providerPhone: phone.trim(), from: { name: session.name, phone: session.phone, card: session.cardNumber }, isAr }),
        source: 'provider_referral',
      });
      setSent(true);
      setName(''); setPhone('');
    } catch (err) {
      reportClientError('Provider referral failed', { message: String(err) });
      setError(err instanceof ApiError && err.status === 429 ? (isAr ? 'حاولت كتير، جرّب بعدين' : 'Too many attempts, try later') : isAr ? 'مقدرناش نبعت، جرّب تاني' : 'Could not send, please try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        {...fab.props()}
        aria-label={isAr ? 'رشّح مقدم خدمة' : 'Recommend a provider'}
        onClick={() => setOpen(true)}
        className={`fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] left-4 sm:left-6 z-40 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg ring-2 ring-white flex items-center justify-center active:scale-95 transition-transform ${nudge ? 'animate-bounce' : ''}`}
      >
        <BadgePercent className="w-5 h-5" />
      </button>
      {nudge && (
        <button
          type="button"
          data-testid="referral-nudge"
          style={fab.pos ? { left: fab.pos.left + 52, bottom: fab.pos.bottom + 4, top: 'auto', right: 'auto' } : undefined}
          onClick={() => setOpen(true)}
          dir={isAr ? 'rtl' : 'ltr'}
          className="fixed bottom-[calc(7.8rem+env(safe-area-inset-bottom))] left-[4.25rem] sm:left-[5.25rem] z-40 max-w-[11rem] rounded-2xl rounded-bl-sm bg-orange-500 px-3 py-2 text-[11px] font-black leading-snug text-white shadow-lg animate-in fade-in slide-in-from-left-2 duration-300 cursor-pointer"
        >
          {isAr ? 'رشّح مقدم خدمة عايز عليه خصم' : 'Recommend a provider you want a discount on'}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] overflow-y-auto" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 space-y-3 text-right ">
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
                <p className="text-[11px] text-slate-500">{isAr ? 'اكتب تليفون مقدم الخدمة اللي بتتعامل معاه (والاسم لو حابب)، ولما ينضم معانا هتستفيد بنسبة خصم.' : 'Enter the phone of a provider you deal with (name optional); when they join us you get a discount.'}</p>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={isAr ? 'اسم مقدم الخدمة (اختياري)' : 'Provider name (optional)'} aria-label={isAr ? 'اسم مقدم الخدمة' : 'Provider name'} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
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
