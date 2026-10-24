import React, { useState } from 'react';
import { Clock, MessageCircle, Phone, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { subscribeByNumber, type CardStatus } from '../api/membership';
import type { OnlineChannel } from '../api/orders';
import { PayModal, type PixelSession } from './PayModal';

interface CardStatusBannerProps {
  status: CardStatus | undefined;
  number: string;
}

/**
 * What the card screen says first.
 *
 * An expired card — a trial that ran out, or a paid year that lapsed — gets a big red sign and
 * every way forward: subscribe now with Paymob, call customer services, or message them. A running
 * trial gets a quiet amber reminder. The state is the backend's; this only draws it.
 */
export const CardStatusBanner: React.FC<CardStatusBannerProps> = ({ status, number }) => {
  const { isAr } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pixel, setPixel] = useState<PixelSession | null>(null);

  if (!status) return null;

  const phone = status.contact.phone_international ?? status.contact.phone;
  const whatsapp = (status.contact.whatsapp ?? '').replace(/\D/g, '');

  const buy = async (channel: OnlineChannel) => {
    setBusy(true);
    setFailed(false);
    const result = await subscribeByNumber(number, channel);
    setBusy(false);
    // Wallets (Vodafone Cash…) cannot be drawn by Pixel: they always go to Paymob's own checkout page.
    if (channel !== 'wallet' && result?.client_secret && result.public_key) setPixel({ clientSecret: result.client_secret, publicKey: result.public_key, checkoutUrl: result.checkout_url });
    else if (result?.checkout_url) window.open(result.checkout_url, '_blank');
    else setFailed(true);
  };

  if (status.expired) {
    return (
      <div role="alert" className="rounded-3xl bg-red-600 border-2 border-red-700 text-white p-5 text-center shadow-lg space-y-3">
        <XCircle className="w-10 h-10 mx-auto" />
        <p className="text-3xl font-black tracking-wide">{isAr ? 'الكارت منتهي' : 'CARD EXPIRED'}</p>
        <p className="text-sm">
          {status.is_trial ? (isAr ? 'انتهت الفترة التجريبية' : 'The free trial has ended') : isAr ? 'انتهى اشتراك هذا الكارت' : "This card's subscription has ended"}
          {status.expires_on && <span dir="ltr"> · {status.expires_on}</span>}
        </p>

        <div className="space-y-2 pt-1">
          {status.can_pay_online && (status.online_channels?.length ? status.online_channels : (['card'] as OnlineChannel[])).map((channel) => (
            <button key={channel} onClick={() => buy(channel)} disabled={busy} className="w-full py-3 bg-white text-red-700 rounded-2xl text-sm font-extrabold disabled:opacity-60 cursor-pointer">
              {busy ? '…' : channel === 'wallet' ? (isAr ? 'اشترك الآن — الدفع بالمحفظة' : 'Subscribe now — pay by wallet') : isAr ? 'اشترك الآن — الدفع بالبطاقة' : 'Subscribe now — pay by card'}
              {status.price > 0 && <span dir="ltr"> — {status.price} {isAr ? 'ج.م' : 'EGP'}</span>}
            </button>
          ))}
          {phone && (
            <a href={`tel:${phone}`} className="w-full py-3 border-2 border-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{isAr ? 'اتصل بخدمة العملاء' : 'Call customer service'} <span dir="ltr">{status.contact.phone ?? phone}</span></span>
            </a>
          )}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`${isAr ? 'مرحباً، أريد تجديد كارت ديلار رقم' : "Hello, I'd like to renew Deilar card number"} ${number}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 border-2 border-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isAr ? 'راسل خدمة العملاء' : 'Message customer service'}</span>
            </a>
          )}
        </div>
        {pixel && <PayModal session={pixel} onClose={() => setPixel(null)} onComplete={() => setPixel(null)} />}
        {failed && <p className="text-xs bg-white/15 rounded-xl px-3 py-2">{isAr ? 'تعذر فتح صفحة الدفع. حاول مرة أخرى.' : 'The payment page could not be opened. Please try again.'}</p>}
      </div>
    );
  }

  if (status.state === 'trial') {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {isAr ? `كارت تجريبي — متبقي ${status.days_left} يوم` : `Trial card — ${status.days_left} days left`}
          {status.expires_on && <span dir="ltr"> ({status.expires_on})</span>}
        </span>
        {phone && (
          <a href={`tel:${phone}`} className="text-[11px] font-bold underline">
            {isAr ? 'خدمة العملاء' : 'Customer service'} <span dir="ltr">{status.contact.phone ?? phone}</span>
          </a>
        )}
      </div>
    );
  }

  return null;
};
