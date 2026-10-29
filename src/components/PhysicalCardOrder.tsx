import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Loader2, Minus, Plus, Smartphone, Truck, Wallet } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { fetchProfile, fetchSavedAddress } from '../api/auth';
import { fetchPhysicalCards, placePhysicalCardOrder, type PhysicalCardInfo } from '../api/physicalCards';
import { fetchOrder, payOrder, uploadReceipt, type OnlineChannel, type PlacedOrder } from '../api/orders';
import { fetchShopSettings } from '../api/endpoints';
import { navigate, routeHref } from '../router';
import { reportClientError } from '../utils/reportError';
import { formatNumber } from '../utils/formatNumber';
import { PaymobPixel } from './PaymobPixel';
import { PaymobFrame } from './PaymobFrame';
import type { PixelSession } from './PayModal';

type Choice = 'paymob:card' | 'paymob:wallet' | 'cod' | 'transfer-wallet';

/**
 * /card/physical — order plastic cards for yourself and the family (the same number can be ordered several times).
 * Who may order and every price come from the backend (`/mobile/physical-cards`, edited at /admin/setting); the order is an
 * ordinary order paid with the ways the admin switched on. The totals shown here are only a preview: the server's figure
 * on the confirmation is the one charged.
 */
export const PhysicalCardOrder: React.FC<{ token: string }> = ({ token }) => {
  const { isAr } = useLanguage();
  const Back = isAr ? ArrowRight : ArrowLeft;
  const [info, setInfo] = useState<PhysicalCardInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: '', phone: '', governorate: '', city: '', street: '', specialMark: '', notes: '', email: '' });
  const [choice, setChoice] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [pixel, setPixel] = useState<PixelSession | null>(null);
  const [walletNumber, setWalletNumber] = useState<string | null>(null);
  const [receiptSent, setReceiptSent] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPhysicalCards(token).then(
      (d) => {
        if (!alive) return;
        setInfo(d);
        // Everyone starts with one card for the holder.
        const me = d.cards.find((c) => c.is_me);
        if (me) setCopies({ [me.membership_number]: 1 });
      },
      (e) => { reportClientError('fetchPhysicalCards failed', e); if (alive) setFailed(true); },
    );
    // Name, phone, e-mail and the saved address come from the member's profile; they can be changed here.
    Promise.all([fetchProfile(token).catch(() => null), fetchSavedAddress(token).catch(() => null)]).then(([p, a]) => {
      if (!alive) return;
      setForm((f) => ({
        ...f,
        name: f.name || p?.name || '',
        phone: f.phone || (p?.phone ?? '').replace(/\D/g, ''),
        email: f.email || p?.email || '',
        governorate: f.governorate || a?.governorate || '',
        city: f.city || a?.city || '',
        street: f.street || a?.street || '',
      }));
    });
    fetchShopSettings().then((s) => alive && setWalletNumber(s.wallet_number), () => undefined);
    return () => { alive = false; };
  }, [token]);

  const toCard = () => navigate(routeHref({ tab: 'mycard' }));
  const input = (bad: boolean) => `w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#941946] ${bad ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-300 bg-white text-slate-900'}`;

  if (failed) return <p role="alert" className="p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">{isAr ? 'تعذر تحميل الصفحة. حاول مرة أخرى.' : 'Could not load the page. Please try again.'}</p>;
  if (!info) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const header = (
    <button type="button" onClick={toCard} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#941946] cursor-pointer">
      <Back className="w-4 h-4" />{isAr ? 'رجوع إلى كارتي' : 'Back to my card'}
    </button>
  );

  if (!info.eligible) {
    const text = info.reason === 'relative'
      ? isAr ? 'أنت عضو قريب على كارت عائلتك. اشترك في كارتك الخاص لتصبح عضواً أساسياً ثم اطلب كارتاً فيزيكال.' : 'You are a relative on your family\'s card. Subscribe to your own card to become a primary member, then order a physical card.'
      : info.reason === 'not_current'
        ? isAr ? 'الكارت الفيزيكال متاح للكارت المدفوع الساري فقط. اشترك أو جدّد كارتك أولاً.' : 'Physical cards are for a paid, current card only. Subscribe or renew your card first.'
        : isAr ? 'لا يوجد كارت على حسابك بعد.' : 'There is no card on your account yet.';

    return (
      <section className="rounded-2xl p-4 border bg-white border-slate-200/90 space-y-3">
        {header}
        <h2 className="text-base font-black text-slate-900">{isAr ? 'اطلب كارتاً فيزيكال' : 'Order a physical card'}</h2>
        <p role="alert" className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{text}</p>
        {info.reason !== 'no_card' && (
          <button type="button" onClick={() => navigate(routeHref({ tab: 'mycard', section: 'pay' }))} className="w-full py-3 rounded-2xl bg-[#941946] text-white text-sm font-bold cursor-pointer">{isAr ? 'اشترك الآن' : 'Subscribe now'}</button>
        )}
      </section>
    );
  }

  const count = Object.values(copies).reduce((n, q) => n + q, 0);
  // A preview from the backend's own unit prices; the order answers with the real total.
  const fee = choice === 'cod' ? info.cod_fee : 0;
  const preview = count * info.price + info.shipping_price + fee;
  const money = (v: number) => `${formatNumber(v, isAr)} ${isAr ? 'ج.م' : 'EGP'}`;

  const choices: { id: Choice; icon: React.ElementType; ar: string; en: string }[] = [
    ...(info.payment_methods.online_card ? [{ id: 'paymob:card' as const, icon: CreditCard, ar: 'الدفع بالبطاقة (Paymob)', en: 'Pay by card (Paymob)' }] : []),
    ...(info.payment_methods.online_wallet ? [{ id: 'paymob:wallet' as const, icon: Smartphone, ar: 'الدفع بمحفظة إلكترونية (Paymob)', en: 'Pay by mobile wallet (Paymob)' }] : []),
    ...(info.payment_methods.cod ? [{ id: 'cod' as const, icon: Truck, ar: 'الدفع عند الاستلام', en: 'Cash on delivery' }] : []),
    ...(info.payment_methods.wallet && walletNumber ? [{ id: 'transfer-wallet' as const, icon: Wallet, ar: 'تحويل على محفظة (فودافون كاش…)', en: 'Wallet transfer (Vodafone Cash…)' }] : []),
  ];

  const bad = {
    name: form.name.trim().length < 3,
    phone: !/^01\d{9}$/.test(form.phone),
    governorate: form.governorate.trim() === '',
    city: form.city.trim() === '',
    street: form.street.trim() === '',
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    setError(null);
    if (count === 0) { setError(isAr ? 'اختر كارتاً واحداً على الأقل.' : 'Choose at least one card.'); return; }
    if (Object.values(bad).some(Boolean)) { setError(isAr ? 'أكمل بيانات التوصيل (الاسم، رقم هاتف من 11 رقم، المحافظة، المدينة، العنوان).' : 'Complete the delivery details (name, an 11-digit phone, governorate, city, address).'); return; }
    if (!choice) { setError(isAr ? 'اختر طريقة الدفع.' : 'Choose how to pay.'); return; }

    setBusy(true);
    try {
      const order = await placePhysicalCardOrder(token, {
        items: Object.entries(copies).filter(([, q]) => q > 0).map(([membership_number, quantity]) => ({ membership_number, quantity })),
        name: form.name.trim(), phone: form.phone, governorate: form.governorate.trim(), city: form.city.trim(), street: form.street.trim(),
        specialMark: form.specialMark, notes: form.notes, email: form.email,
        payment: choice.startsWith('paymob') ? 'paymob' : (choice as 'cod' | 'transfer-wallet'),
      });
      setPlaced(order);

      if (choice.startsWith('paymob')) {
        const channel = choice.split(':')[1] as OnlineChannel;
        const link = await payOrder(order.order_code, channel);
        if (channel !== 'wallet' && link.client_secret && link.public_key) setPixel({ clientSecret: link.client_secret, publicKey: link.public_key, checkoutUrl: link.checkout_url });
        else if (link.checkout_url) setPixel({ clientSecret: link.client_secret ?? '', publicKey: link.public_key ?? '', checkoutUrl: link.checkout_url, mode: 'frame' });
        else setError(isAr ? 'تم تسجيل الطلب لكن تعذر فتح صفحة الدفع. افتح الطلب لإعادة المحاولة.' : 'The order was placed but the payment page could not be opened. Open the order to try again.');
      }
    } catch (err) {
      setError(err instanceof ApiError && err.message && err.status !== 0 && err.status < 500 ? err.message : isAr ? 'تعذر إرسال الطلب، حاول مرة أخرى.' : 'Could not send the order, please try again.');
      if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Physical card order failed', err);
    } finally {
      setBusy(false);
    }
  };

  const toOrder = () => placed && navigate(routeHref({ orders: { code: placed.order_code } }));

  if (placed) {
    return (
      <section className="rounded-2xl p-4 border bg-white border-slate-200/90 space-y-3 text-slate-900">
        {header}
        <div className="text-center space-y-1">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h2 className="text-base font-black">{isAr ? 'تم تسجيل طلب الكروت' : 'Your card order is placed'}</h2>
          <p dir="ltr" className="font-mono text-sm font-bold text-[#941946]">{placed.order_code}</p>
          <p className="text-sm font-bold">{isAr ? 'الإجمالي:' : 'Total:'} {money(placed.total_amount)}</p>
        </div>

        {pixel && (
          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            {pixel.mode === 'frame' && pixel.checkoutUrl ? (
              <PaymobFrame url={pixel.checkoutUrl} check={async () => (await fetchOrder(placed.order_code))?.payment_status.value === 'accepted'} onComplete={toOrder} />
            ) : (
              <PaymobPixel publicKey={pixel.publicKey} clientSecret={pixel.clientSecret} fallbackUrl={pixel.checkoutUrl} onComplete={toOrder} />
            )}
          </div>
        )}

        {choice === 'transfer-wallet' && (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-2">
            <p className="font-bold">{isAr ? `حوّل ${money(placed.total_amount)} إلى المحفظة:` : `Transfer ${money(placed.total_amount)} to the wallet:`}</p>
            <p dir="ltr" className="font-mono text-base font-black">{walletNumber}</p>
            <p>{isAr ? 'ثم ارفع صورة إيصال التحويل. يؤكد فريقنا الدفع ثم نجهز الكروت.' : 'Then upload the transfer receipt. Our team confirms the payment and prepares your cards.'}</p>
            {receiptSent ? (
              <p className="font-black text-emerald-700">{isAr ? 'تم رفع الإيصال ✓' : 'Receipt uploaded ✓'}</p>
            ) : (
              <input type="file" accept="image/*" onChange={async (ev) => {
                const file = ev.target.files?.[0];
                if (!file) return;
                try { await uploadReceipt(placed.order_code, file); setReceiptSent(true); } catch (err) { reportClientError('Receipt upload failed', err); setError(isAr ? 'تعذر رفع الإيصال.' : 'Could not upload the receipt.'); }
              }} />
            )}
          </div>
        )}

        {choice === 'cod' && <p className="text-xs font-bold text-slate-700 text-center">{isAr ? 'ستدفع عند استلام الكروت.' : 'You will pay when the cards arrive.'}</p>}
        {error && <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 border text-rose-600 bg-rose-50 border-rose-200">{error}</p>}
        <button type="button" onClick={toOrder} className="w-full py-3 rounded-2xl bg-[#941946] text-white text-sm font-bold cursor-pointer">{isAr ? 'عرض الطلب' : 'View the order'}</button>
      </section>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="rounded-2xl p-4 border bg-white border-slate-200/90 space-y-4 text-slate-900">
      {header}
      <div className="space-y-1">
        <h2 className="text-base font-black">{isAr ? 'اطلب كارتاً فيزيكال' : 'Order a physical card'}</h2>
        <p className="text-xs text-slate-500">{isAr ? 'يصلك كارت حقيقي أنت وأفراد أسرتك، ويمكنك طلب أكثر من كارت لنفس الرقم.' : 'A real card is delivered to you and your family; you can order several copies of the same number.'}</p>
        <p className="text-sm font-bold text-[#941946]">{money(info.price)} {isAr ? 'للكارت' : 'per card'} · {isAr ? 'الشحن' : 'Shipping'} {money(info.shipping_price)}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-black">{isAr ? 'لمن الكروت؟' : 'Who are the cards for?'}</h3>
        {info.cards.map((c) => {
          const q = copies[c.membership_number] ?? 0;
          const set = (n: number) => setCopies((m) => ({ ...m, [c.membership_number]: Math.max(0, Math.min(info.max_per_card, n)) }));
          return (
            <div key={c.membership_number} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate">{c.name}{c.is_me && <span className="ms-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-[#941946] text-white">{isAr ? 'أنت' : 'You'}</span>}</p>
                <p dir="ltr" className="text-[10px] font-mono text-slate-500">#{c.membership_number}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" aria-label="-" onClick={() => set(q - 1)} className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center cursor-pointer"><Minus className="w-4 h-4" /></button>
                <span className="w-6 text-center text-sm font-black" aria-live="polite">{q}</span>
                <button type="button" aria-label="+" onClick={() => set(q + 1)} className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center cursor-pointer"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-black">{isAr ? 'بيانات التوصيل' : 'Delivery details'}</h3>
        <input className={input(tried && bad.name)} placeholder={isAr ? 'الاسم' : 'Name'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={input(tried && bad.phone)} dir="ltr" inputMode="numeric" maxLength={11} placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={input(tried && bad.governorate)} placeholder={isAr ? 'المحافظة' : 'Governorate'} value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
          <input className={input(tried && bad.city)} placeholder={isAr ? 'المدينة' : 'City'} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <input className={input(tried && bad.street)} placeholder={isAr ? 'العنوان (الشارع، العمارة، الدور، الشقة)' : 'Address (street, building, floor, flat)'} value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
        <input className={input(false)} placeholder={isAr ? 'علامة مميزة (اختياري)' : 'Landmark (optional)'} value={form.specialMark} onChange={(e) => setForm({ ...form, specialMark: e.target.value })} />
        <input className={input(false)} dir="ltr" type="email" placeholder={isAr ? 'بريدك لاستلام الإيصال (اختياري)' : 'Email for the receipt (optional)'} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-black">{isAr ? 'طريقة الدفع' : 'How to pay'}</h3>
        {choices.length === 0 && <p role="alert" className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{isAr ? 'لا توجد طريقة دفع متاحة الآن. تواصل مع خدمة العملاء.' : 'No way of paying is available right now. Contact customer service.'}</p>}
        {choices.map(({ id, icon: Icon, ar, en }) => (
          <button key={id} type="button" role="radio" aria-checked={choice === id} onClick={() => setChoice(id)}
            className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-start cursor-pointer ${choice === id ? 'border-[#941946] bg-rose-50' : 'border-slate-200 bg-white'}`}>
            <span className="w-9 h-9 rounded-xl bg-[#941946] text-white flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
            <span className="text-xs font-bold">{isAr ? ar : en}</span>
          </button>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
        <p className="flex justify-between"><span>{isAr ? `${count} كارت × ${money(info.price)}` : `${count} card(s) × ${money(info.price)}`}</span><span className="font-bold">{money(count * info.price)}</span></p>
        <p className="flex justify-between"><span>{isAr ? 'الشحن' : 'Shipping'}</span><span className="font-bold">{money(info.shipping_price)}</span></p>
        {fee > 0 && <p className="flex justify-between"><span>{isAr ? 'رسوم الدفع عند الاستلام' : 'Cash on delivery fee'}</span><span className="font-bold">{money(fee)}</span></p>}
        <p className="flex justify-between text-sm font-black border-t border-slate-200 pt-1"><span>{isAr ? 'الإجمالي' : 'Total'}</span><span>{money(preview)}</span></p>
      </div>

      {error && <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 border text-rose-600 bg-rose-50 border-rose-200">{error}</p>}

      <button type="submit" disabled={busy || choices.length === 0} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{isAr ? 'تأكيد الطلب والدفع' : 'Confirm the order and pay'}</span>
      </button>
    </form>
  );
};
