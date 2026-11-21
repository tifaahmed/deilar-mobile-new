import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Smartphone, Truck } from 'lucide-react';
import { useIsAr } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { RELATIVE_ADDED_EVENT } from '../api/family';
import { fetchRelativeFees, placeRelativeFeeOrder, type RelativeFeeScreen } from '../api/relativeFees';
import { fetchOrder, payOrder, type OnlineChannel, type PlacedOrder } from '../api/orders';
import { navigate, routeHref } from '../router';
import { formatNumber } from '../utils/formatNumber';
import { refreshLoyalty, useLoyalty } from '../utils/quizStore';
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
  const [plan, setPlan] = useState<'month' | 'year'>('year');
  const [usePoints, setUsePoints] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const loyalty = useLoyalty();
  const [picked, setPicked] = useState<number[] | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [pixel, setPixel] = useState<(PixelSession & { mode?: 'frame' }) | null>(null);

  const load = useCallback(() => {
    fetchRelativeFees(token).then((next) => {
      setScreen(next);
      const ids = new Set(next.waiting.map((w) => w.id));
      // A relative who was removed leaves the ticked list; with nobody left to pay for, an unpaid order / payment page for them goes too.
      setPicked((now) => (now ? now.filter((id) => ids.has(id)) : now));
      if (ids.size === 0) { setPlaced(null); setPixel(null); setError(null); }
    }).catch((e) => reportClientError('Relative fee load failed', e));
  }, [token]);

  useEffect(() => { void refreshLoyalty(); }, []);

  useEffect(() => {
    load();
    window.addEventListener(RELATIVE_ADDED_EVENT, load);
    return () => window.removeEventListener(RELATIVE_ADDED_EVENT, load);
  }, [load]);

  if (!screen || screen.fee.per_relative <= 0) return null;

  const { fee, payment_methods: pm } = screen;
  const money = (v: number) => `${formatNumber(v, isAr)} ${isAr ? 'ج.م' : 'EGP'}`;
  const plans = fee.plans ?? [{ key: 'year' as const, price: fee.per_relative, months: fee.months }];
  const chosenPlan = plans.find((p) => p.key === plan) ?? plans[plans.length - 1];
  const canPay = screen.can_pay !== false;
  // Everybody on the list can be paid for (a first payment or a renewal); the ones not yet active start ticked.
  const waiting = canPay ? screen.waiting : [];
  const ids = picked ?? waiting.filter((w) => w.state !== 'active').map((w) => w.id);
  const chosen = waiting.filter((w) => ids.includes(w.id));
  const total = chosenPlan.price * chosen.length;
  // What the member's points and wallet could take off. Estimates mirroring the backend (whole pounds of points, then the wallet on the rest);
  // the backend decides at checkout and its figures replace these.
  const rate = loyalty.money?.points_per_egp ?? 0;
  const orderCapEgp = rate > 0 && loyalty.money?.points_max_per_order ? loyalty.money.points_max_per_order / rate : Infinity;
  const pointsHeld = Math.max(0, loyalty.total - loyalty.pending);
  const pointsBlocked = !!loyalty.money?.points_blocked;
  const pointsEgpAvailable = rate > 0 && !pointsBlocked ? Math.floor(Math.min(pointsHeld / rate, orderCapEgp, total)) : 0;
  const pointsEgp = usePoints ? pointsEgpAvailable : 0;
  const walletBalance = loyalty.money?.wallet_balance ?? 0;
  const walletUsable = Math.max(0, Math.floor(Math.min(walletBalance, total - pointsEgp) * 100) / 100);
  const walletEgp = useWallet ? walletUsable : 0;
  const due = Math.max(0, Math.round((total - pointsEgp - walletEgp) * 100) / 100);
  const choices: { id: Choice; icon: React.ElementType; ar: string; en: string }[] = [
    ...(pm.online_card ? [{ id: 'paymob:card' as const, icon: CreditCard, ar: 'الدفع بالبطاقة (Paymob)', en: 'Pay by card (Paymob)' }] : []),
    ...(pm.online_wallet ? [{ id: 'paymob:wallet' as const, icon: Smartphone, ar: 'الدفع بمحفظة إلكترونية (Paymob)', en: 'Pay by mobile wallet (Paymob)' }] : []),
    ...(pm.cod ? [{ id: 'cod' as const, icon: Truck, ar: 'الدفع عند الاستلام', en: 'Cash on delivery' }] : []),
  ];

  const pay = async () => {
    // When points and the wallet cover everything there is nothing left to pay, so no payment method is asked for.
    const method: Choice | null = choice ?? (due === 0 ? choices[0]?.id ?? 'cod' : null);
    if (busy || !method) { if (!method) setError(isAr ? 'اختار طريقة الدفع.' : 'Choose how to pay.'); return; }
    if (chosen.length === 0) { setError(isAr ? 'اختار قريب واحد على الأقل.' : 'Pick at least one relative.'); return; }
    setBusy(true);
    setError(null);
    try {
      const order = await placeRelativeFeeOrder(token, chosen.map((w) => w.id), method === 'cod' ? 'cod' : 'paymob', { plan: chosenPlan.key, usePoints, useWallet });
      setPlaced(order);

      // Points and the wallet paid it all: the backend has already switched the relatives on, there is no payment page.
      if ((order.amount_due ?? order.total_amount) <= 0) { setPlaced(null); load(); navigate(routeHref({ orders: { code: order.order_code } })); return; }

      if (method !== 'cod') {
        const channel = method.split(':')[1] as OnlineChannel;
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
          ? `${money(fee.monthly)} في الشهر لكل قريب، أو ${money(fee.per_relative)} للسنة (${fee.months} شهر). القريب بيتفعّل فورًا بعد الدفع.`
          : `${money(fee.monthly)} a month per relative, or ${money(fee.per_relative)} for the year (${fee.months} months). The relative is active right after payment.`}
      </p>
      {screen.reason === 'trial' && (
        <p data-testid="relative-fee-trial" className="font-bold text-amber-800">
          {isAr ? 'أقاربك بيجرّبوا معاك لحد ما التجربة تخلص. بعد ما تدفع اشتراكك بتدفع لكل قريب (5 جنيه في الشهر أو 60 في السنة).' : 'Your relatives try the card with you until the trial ends. After you subscribe, each relative has their own fee (5 a month or 60 a year).'}
        </p>
      )}
      {screen.reason === 'parent_not_paid' && (
        <div data-testid="relative-fee-own-plan" className="space-y-1.5">
          <p className="font-bold text-amber-800">
            {isAr ? 'الكارت اللي إنت تابع ليه لسه مدفعش، فمش هتدفع رسوم القريب. اشترك اشتراك عادي (شهري أو نصف سنوي أو سنوي) وتبقى عضو أساسي.' : 'The card you belong to has not paid, so there is no relative fee. Buy a normal subscription (monthly, half-yearly or yearly) and become a primary member.'}
          </p>
          <button type="button" onClick={() => navigate(routeHref({ tab: 'mycard', section: 'pay' }))} className="px-3.5 py-2 rounded-xl bg-[#941946] text-white font-bold cursor-pointer">{isAr ? 'اشترك دلوقتي' : 'Subscribe now'}</button>
        </div>
      )}
      {fee.request_only && (
        <p data-testid="relative-fee-company" className="font-bold text-amber-800">
          {isAr
            ? 'كارت شركة: لما تضيف قريب بنبعت بياناته لفريق «تواصل معنا» وهيكلموك تتفقوا على الدفع شهريًا (خصم من المرتب أو تقسيط). ولو مش عايز خصم من المرتب تقدر تدفع حق السنة مرة واحدة من هنا.'
            : 'Company card: when you add a relative we send the details to our team, who will call you to agree on paying monthly (salary deduction or instalments). If you prefer not to have it deducted from your salary you can pay the year at once here.'}
        </p>
      )}

      {waiting.length > 0 && canPay && !placed && (
        <div className="space-y-2">
          <p className="font-black">{isAr ? 'ادفع لـ:' : 'Pay for:'}</p>
          <div className="space-y-1">
            {waiting.map((w) => (
              <label key={w.id} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-amber-200 cursor-pointer">
                <input type="checkbox" checked={ids.includes(w.id)} onChange={(e) => setPicked(e.target.checked ? [...ids, w.id] : ids.filter((i) => i !== w.id))} />
                <span className="font-bold">{w.name}</span>
                {w.expiration_date && <span className="ms-auto text-[10px] text-slate-500">{isAr ? `لحد ${w.expiration_date}` : `until ${w.expiration_date}`}</span>}
              </label>
            ))}
          </div>
          {plans.length > 1 && (
            <div className="flex gap-1.5" role="group" aria-label={isAr ? 'الخطة' : 'Plan'}>
              {plans.map((p) => (
                <button key={p.key} type="button" aria-pressed={plan === p.key} onClick={() => setPlan(p.key)}
                  className={`flex-1 py-2 rounded-xl border font-bold cursor-pointer ${plan === p.key ? 'border-[#941946] bg-rose-50' : 'border-amber-200 bg-white'}`}>
                  {p.key === 'month' ? (isAr ? `شهر — ${money(p.price)}` : `1 month — ${money(p.price)}`) : (isAr ? `سنة — ${money(p.price)}` : `Year — ${money(p.price)}`)}
                </button>
              ))}
            </div>
          )}
          {pointsEgpAvailable > 0 && (
            <label data-testid="relative-points-toggle" className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-white px-2.5 py-2.5 font-bold text-amber-900 cursor-pointer">
              <span>{isAr ? `⭐ استخدم نقاط الولاء (${formatNumber(pointsEgpAvailable * rate, true)} نقطة = ${money(pointsEgpAvailable)} خصم)` : `⭐ Use my loyalty points (${pointsEgpAvailable * rate} points = ${money(pointsEgpAvailable)} off)`}</span>
              <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="h-5 w-5 accent-amber-600" />
            </label>
          )}
          {walletUsable > 0 && (
            <label data-testid="relative-wallet-toggle" className="flex items-center justify-between gap-2 rounded-xl border border-violet-300 bg-white px-2.5 py-2.5 font-bold text-violet-900 cursor-pointer">
              <span>{isAr ? `👛 ادفع من محفظة ديلر (${money(walletUsable)} من رصيد ${money(walletBalance)})` : `👛 Pay from my Deilar wallet (${money(walletUsable)} of ${money(walletBalance)})`}</span>
              <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="h-5 w-5 accent-violet-600" />
            </label>
          )}
          {(pointsEgp > 0 || walletEgp > 0) && (
            <div data-testid="relative-fee-breakdown" className="rounded-xl bg-white border border-amber-200 p-2 space-y-0.5">
              <div className="flex justify-between"><span>{isAr ? 'رسوم الأقارب' : 'Relatives fee'}</span><span>{money(total)}</span></div>
              {pointsEgp > 0 && <div className="flex justify-between text-amber-800 font-bold"><span>{isAr ? '⭐ خصم نقاط الولاء' : '⭐ Loyalty points'}</span><span>-{money(pointsEgp)}</span></div>}
              {walletEgp > 0 && <div className="flex justify-between text-violet-800 font-bold"><span>{isAr ? '👛 من المحفظة' : '👛 From the wallet'}</span><span>-{money(walletEgp)}</span></div>}
              <div className="flex justify-between font-black border-t border-amber-100 pt-0.5"><span>{isAr ? 'المتبقي تدفعه' : 'Left to pay'}</span><span>{money(due)}</span></div>
            </div>
          )}
          {due > 0 && <div className="space-y-1.5">
            {choices.map((c) => (
              <button key={c.id} type="button" aria-pressed={choice === c.id} onClick={() => setChoice(c.id)}
                className={`w-full p-2.5 rounded-xl border flex items-center gap-2 text-start cursor-pointer ${choice === c.id ? 'border-[#941946] bg-rose-50' : 'border-amber-200 bg-white'}`}>
                <c.icon className="w-4 h-4" /><span className="font-bold">{isAr ? c.ar : c.en}</span>
              </button>
            ))}
            {choices.length === 0 && <p role="alert" className="font-bold">{isAr ? 'مفيش طريقة دفع متاحة دلوقتي. كلّم خدمة العملاء.' : 'No way of paying is available right now. Contact customer service.'}</p>}
          </div>}
          {error && <p role="alert" className="font-bold text-rose-600">{error}</p>}
          <button type="button" data-testid="relative-fee-pay" disabled={busy || (choices.length === 0 && due > 0)} onClick={pay} className="w-full py-2.5 rounded-xl bg-[#941946] text-white text-xs font-black disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
              <span className="inline-flex items-center justify-center gap-2">
                {due < total && <s className="opacity-60 font-bold" data-testid="relative-fee-old-price">{money(total)}</s>}
                <span data-testid="relative-fee-due">{isAr ? `ادفع ${money(due)}` : `Pay ${money(due)}`}</span>
              </span>
            )}
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
