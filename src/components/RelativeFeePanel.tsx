import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Smartphone, Truck } from 'lucide-react';
import { useIsAr } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { RELATIVE_ADDED_EVENT } from '../api/family';
import { fetchRelativeFees, placeRelativeFeeOrder, type RelativeFeeScreen } from '../api/relativeFees';
import { fetchOrder, payOrder, type OnlineChannel, type PlacedOrder } from '../api/orders';
import { navigate, routeHref } from '../router';
import { formatNumber } from '../utils/formatNumber';
import { reportClientError } from '../utils/reportError';
import { PaymobPixel } from './PaymobPixel';
import { PaymobFrame } from './PaymobFrame';
import type { PixelSession } from './PayModal';

type Choice = 'paymob:card' | 'paymob:wallet' | 'cod';

/**
 * What a relative costs and how to pay it. The backend owns the numbers (`GET /mobile/relative-fees`): an individual pays
 * the whole period at once (5 × 12) and the relative is active right after, for a year; a company card is told the cost,
 * the team calls it (the request is filed when the relative is added), and it may also pay the year at once.
 */
export const RelativeFeePanel: React.FC<{ token: string }> = ({ token }) => {
  const isAr = useIsAr();
  const [screen, setScreen] = useState<RelativeFeeScreen | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [pixel, setPixel] = useState<(PixelSession & { mode?: 'frame' }) | null>(null);

  const load = useCallback(() => { fetchRelativeFees(token).then(setScreen).catch((e) => reportClientError('Relative fee load failed', e)); }, [token]);

  useEffect(() => {
    load();
    window.addEventListener(RELATIVE_ADDED_EVENT, load);
    return () => window.removeEventListener(RELATIVE_ADDED_EVENT, load);
  }, [load]);

  if (!screen || screen.fee.per_relative <= 0) return null;

  const { fee, waiting, payment_methods: pm } = screen;
  const money = (v: number) => `${formatNumber(v, isAr)} ${isAr ? 'ج.م' : 'EGP'}`;
  const total = fee.per_relative * waiting.length;
  const choices: { id: Choice; icon: React.ElementType; ar: string; en: string }[] = [
    ...(pm.online_card ? [{ id: 'paymob:card' as const, icon: CreditCard, ar: 'الدفع بالبطاقة (Paymob)', en: 'Pay by card (Paymob)' }] : []),
    ...(pm.online_wallet ? [{ id: 'paymob:wallet' as const, icon: Smartphone, ar: 'الدفع بمحفظة إلكترونية (Paymob)', en: 'Pay by mobile wallet (Paymob)' }] : []),
    ...(pm.cod ? [{ id: 'cod' as const, icon: Truck, ar: 'الدفع عند الاستلام', en: 'Cash on delivery' }] : []),
  ];

  const pay = async () => {
    if (busy || !choice) { if (!choice) setError(isAr ? 'اختار طريقة الدفع.' : 'Choose how to pay.'); return; }
    setBusy(true);
    setError(null);
    try {
      const order = await placeRelativeFeeOrder(token, waiting.map((w) => w.id), choice === 'cod' ? 'cod' : 'paymob');
      setPlaced(order);

      if (choice !== 'cod') {
        const channel = choice.split(':')[1] as OnlineChannel;
        const link = await payOrder(order.order_code, channel);
        if (channel !== 'wallet' && link.client_secret && link.public_key) setPixel({ clientSecret: link.client_secret, publicKey: link.public_key, checkoutUrl: link.checkout_url });
        else if (link.checkout_url) setPixel({ clientSecret: link.client_secret ?? '', publicKey: link.public_key ?? '', checkoutUrl: link.checkout_url, mode: 'frame' });
        else setError(isAr ? 'الطلب اتسجّل لكن صفحة الدفع مافتحتش. افتح الطلب وجرّب تاني.' : 'The order was placed but the payment page could not be opened. Open the order to try again.');
      }
    } catch (err) {
      setError(err instanceof ApiError && err.message && err.status !== 0 && err.status < 500 ? err.message : isAr ? 'مقدرناش نبعت الطلب، جرّب تاني.' : 'Could not send the order, please try again.');
      if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Relative fee order failed', err);
    } finally {
      setBusy(false);
    }
  };

  const done = () => { setPlaced(null); setPixel(null); load(); if (placed) navigate(routeHref({ orders: { code: placed.order_code } })); };

  return (
    <section data-testid="relative-fee" dir={isAr ? 'rtl' : 'ltr'} className="p-3 rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 text-[11px] space-y-2">
      <p className="font-black text-xs">{isAr ? '👪 رسوم الأقارب' : '👪 Relatives fee'}</p>
      <p data-testid="relative-fee-price" className="font-bold">
        {isAr
          ? `${money(fee.monthly)} في الشهر لكل قريب. الأفراد بيدفعوا السنة كلها مرة واحدة (${money(fee.per_relative)} للقريب) والقريب بيتفعّل فورًا لمدة ${fee.months} شهر.`
          : `${money(fee.monthly)} a month per relative. Individuals pay the whole period at once (${money(fee.per_relative)} each) and the relative is active right away for ${fee.months} months.`}
      </p>
      {fee.request_only && (
        <p data-testid="relative-fee-company" className="font-bold text-amber-800">
          {isAr
            ? 'كارت شركة: لما تضيف قريب بنبعت بياناته لفريق «تواصل معنا» وهيكلموك تتفقوا على الدفع شهريًا (خصم من المرتب أو تقسيط). ولو مش عايز خصم من المرتب تقدر تدفع حق السنة مرة واحدة من هنا.'
            : 'Company card: when you add a relative we send the details to our team, who will call you to agree on paying monthly (salary deduction or instalments). If you prefer not to have it deducted from your salary you can pay the year at once here.'}
        </p>
      )}

      {waiting.length > 0 && !placed && (
        <div className="space-y-2">
          <p className="font-black">{isAr ? 'مستنيين الدفع:' : 'Waiting for payment:'} {waiting.map((w) => w.name).filter(Boolean).join('، ')}</p>
          <div className="space-y-1.5">
            {choices.map((c) => (
              <button key={c.id} type="button" aria-pressed={choice === c.id} onClick={() => setChoice(c.id)}
                className={`w-full p-2.5 rounded-xl border flex items-center gap-2 text-start cursor-pointer ${choice === c.id ? 'border-[#941946] bg-rose-50' : 'border-amber-200 bg-white'}`}>
                <c.icon className="w-4 h-4" /><span className="font-bold">{isAr ? c.ar : c.en}</span>
              </button>
            ))}
            {choices.length === 0 && <p role="alert" className="font-bold">{isAr ? 'مفيش طريقة دفع متاحة دلوقتي. كلّم خدمة العملاء.' : 'No way of paying is available right now. Contact customer service.'}</p>}
          </div>
          {error && <p role="alert" className="font-bold text-rose-600">{error}</p>}
          <button type="button" data-testid="relative-fee-pay" disabled={busy || choices.length === 0} onClick={pay} className="w-full py-2.5 rounded-xl bg-[#941946] text-white text-xs font-black disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isAr ? `ادفع ${money(total)} وفعّل الأقارب` : `Pay ${money(total)} and activate`}
          </button>
        </div>
      )}

      {placed && (
        <div className="space-y-2">
          <p className="font-black">{isAr ? `طلب الدفع اتسجّل (${placed.order_code})` : `Payment order placed (${placed.order_code})`}</p>
          {pixel && (pixel.mode === 'frame' && pixel.checkoutUrl
            ? <PaymobFrame url={pixel.checkoutUrl} check={async () => (await fetchOrder(placed.order_code))?.payment_status.value === 'accepted'} onComplete={done} />
            : <PaymobPixel publicKey={pixel.publicKey} clientSecret={pixel.clientSecret} fallbackUrl={pixel.checkoutUrl} onComplete={done} />)}
          {error && <p role="alert" className="font-bold text-rose-600">{error}</p>}
          {!pixel && <button type="button" onClick={done} className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer">{isAr ? 'افتح الطلب' : 'Open the order'}</button>}
        </div>
      )}
    </section>
  );
};
