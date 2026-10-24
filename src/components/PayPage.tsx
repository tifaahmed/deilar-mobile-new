import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CreditCard, Loader2, MessageCircle, PhoneCall, ShieldCheck, Smartphone } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { subscribe, type MemberStatus } from '../api/membership';
import { fetchProfile } from '../api/auth';
import type { OnlineChannel } from '../api/orders';
import { navigate, routeHref } from '../router';
import { reportClientError } from '../utils/reportError';
import { PaymobPixel } from './PaymobPixel';
import type { PixelSession } from './PayModal';

interface PayPageProps {
  token: string;
  status: MemberStatus;
  /** Called after a payment finished (or a request was filed) so the card state is re-read. */
  onDone: () => void;
}

const CHANNELS: { id: OnlineChannel; icon: React.ElementType; ar: string; en: string; arHint: string; enHint: string }[] = [
  { id: 'card', icon: CreditCard, ar: 'الدفع بالبطاقة', en: 'Pay by card', arHint: 'فيزا / ماستركارد / ميزة', enHint: 'Visa / Mastercard / Meeza' },
  { id: 'wallet', icon: Smartphone, ar: 'الدفع بالمحفظة الإلكترونية', en: 'Pay by mobile wallet', arHint: 'فودافون كاش وباقي المحافظ', enHint: 'Vodafone Cash and other wallets' },
];

/**
 * The page behind "Pay now": the two ways of paying online with Paymob — card or mobile wallet. Which of them are
 * available (and the price) is the backend's call (`can_pay_online`, `online_channels`); a method that is off is
 * drawn disabled, never hidden, so the member sees why. Paymob opens the embedded form, or its hosted page.
 */
export const PayPage: React.FC<PayPageProps> = ({ token, status, onDone }) => {
  const { isAr } = useLanguage();
  const [busy, setBusy] = useState<OnlineChannel | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pixel, setPixel] = useState<PixelSession | null>(null);
  const Back = isAr ? ArrowRight : ArrowLeft;

  // The email saved on the member's profile is already filled in; typing a different one here wins.
  useEffect(() => {
    let alive = true;
    fetchProfile(token).then(
      (p) => {
        if (alive && p.email) setEmail((current) => current || p.email!);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [token]);

  const available = new Set<OnlineChannel>(status.can_pay_online ? status.online_channels ?? ['card'] : []);
  const phone = status.contact?.phone_international ?? status.contact?.phone ?? null;
  const whatsapp = (status.contact?.whatsapp ?? '').replace(/\D/g, '');

  const pay = async (channel: OnlineChannel) => {
    if (busy) return;
    setBusy(channel);
    setError(null);
    try {
      const result = await subscribe(token, { method: 'paymob', paymobChannel: channel, email: email.trim() || undefined });
      if (result.client_secret && result.public_key) {
        setPixel({ clientSecret: result.client_secret, publicKey: result.public_key, checkoutUrl: result.checkout_url });
      } else if (result.checkout_url) {
        // Paymob's own page (wallets always, and the card form when the embedded one is unavailable).
        window.location.assign(result.checkout_url);
        return;
      } else {
        setError(isAr ? 'تعذر فتح صفحة الدفع. حاول مرة أخرى.' : 'The payment page could not be opened. Please try again.');
      }
      // The card status is re-read when the form FINISHES (onComplete below), not now: a refresh while the form is
      // opening must never tear it down.
    } catch (err) {
      setError(err instanceof ApiError && err.message && err.status !== 0 && err.status < 500 ? err.message : isAr ? 'تعذر فتح صفحة الدفع. حاول مرة أخرى.' : 'The payment page could not be opened. Please try again.');
      if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Paymob payment page failed', err, { channel });
    } finally {
      setBusy(null);
    }
  };

  const toCard = () => navigate(routeHref({ tab: 'profile' }));

  return (
    <section className={`rounded-2xl p-4 border bg-white border-slate-200/90 space-y-4 ${isAr ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={toCard} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#941946] cursor-pointer">
        <Back className="w-4 h-4" />
        {isAr ? 'رجوع إلى كرتي' : 'Back to my card'}
      </button>

      <div className="space-y-1">
        <h2 className="text-base font-black text-slate-900">{isAr ? 'الدفع للاشتراك في الكارت الكامل' : 'Pay for the full card'}</h2>
        {status.price > 0 && (
          <p className="text-sm font-bold text-[#941946]" dir="ltr">
            {status.price} {isAr ? 'ج.م' : 'EGP'}
            <span className="text-slate-500 font-medium"> · {isAr ? `${status.months} شهراً` : `${status.months} months`}</span>
          </p>
        )}
        <p className="text-xs text-slate-500">{isAr ? 'اختر طريقة الدفع. تتم العملية بأمان عبر Paymob ويُفعَّل كرتك تلقائياً بعد نجاحها.' : 'Choose how to pay. The payment is handled securely by Paymob and your card is activated automatically once it succeeds.'}</p>
      </div>

      {available.size === 0 && (
        <div className="space-y-2">
          <p role="alert" className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {isAr ? 'الدفع الإلكتروني غير متاح حالياً. تواصل مع خدمة العملاء لتفعيل اشتراكك.' : 'Online payment is not available right now. Contact customer service to activate your subscription.'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {phone && <a href={`tel:${phone}`} className="py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5"><PhoneCall className="w-4 h-4 text-amber-400" />{isAr ? 'اتصل بنا' : 'Call us'}</a>}
            {whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="py-2.5 rounded-2xl bg-[#25D366] text-white text-xs font-bold flex items-center justify-center gap-1.5"><MessageCircle className="w-4 h-4" />{isAr ? 'واتساب' : 'WhatsApp'}</a>}
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${pixel ? 'hidden' : ''}`}>
        {CHANNELS.map(({ id, icon: Icon, ar, en, arHint, enHint }) => {
          const on = available.has(id);
          return (
            <button
              key={id}
              type="button"
              disabled={!on || busy !== null}
              onClick={() => pay(id)}
              className={`w-full p-4 rounded-2xl border flex items-center gap-3 text-start transition-all ${
                on ? 'border-[#941946]/40 bg-rose-50/60 hover:border-[#941946] active:scale-[0.99] cursor-pointer' : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
              }`}
            >
              <span className="w-12 h-12 rounded-2xl bg-[#941946] text-white flex items-center justify-center shrink-0">
                {busy === id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-slate-900">{isAr ? ar : en}</span>
                <span className="block text-[11px] text-slate-500">{on ? (isAr ? arHint : enHint) : isAr ? 'غير متاحة حالياً' : 'Not available right now'}</span>
              </span>
            </button>
          );
        })}
      </div>

      <input type="email" dir="ltr" placeholder={isAr ? 'بريدك لاستلام الإيصال (اختياري)' : 'Email for your receipt (optional)'} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-[#941946]" />

      {error && <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 border text-rose-600 bg-rose-50 border-rose-200">{error}</p>}

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" />{isAr ? 'لا نحتفظ ببيانات بطاقتك.' : 'We never store your card details.'}</p>

      {/* The card form is Paymob's, drawn right here in the page (like checkout) — card details never reach our servers. */}
      {pixel && (
        <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
          <PaymobPixel
            publicKey={pixel.publicKey}
            clientSecret={pixel.clientSecret}
            fallbackUrl={pixel.checkoutUrl}
            onComplete={() => { onDone(); toCard(); }}
          />
          <button type="button" onClick={() => setPixel(null)} className="w-full text-[11px] font-bold text-slate-500 hover:text-[#941946] cursor-pointer">
            {isAr ? 'إلغاء والرجوع لاختيار طريقة الدفع' : 'Cancel and choose another way to pay'}
          </button>
        </div>
      )}
    </section>
  );
};
