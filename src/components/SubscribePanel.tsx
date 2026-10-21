import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { subscribe, type MemberStatus, type PayMethod } from '../api/membership';
import { reportClientError } from '../utils/reportError';
import { PayModal, type PixelSession } from './PayModal';

interface SubscribePanelProps {
  token: string;
  status: MemberStatus;
  /** Called after a request was sent, so the caller can refresh the card state. */
  onDone: () => void;
}

const MANUAL: { value: Exclude<PayMethod, 'paymob'>; ar: string; en: string; receipt: boolean }[] = [
  { value: 'cash_on_delivery', ar: 'الدفع عند الاستلام — ستتصل بك خدمة العملاء', en: 'Cash on delivery — customer service will call you', receipt: false },
  { value: 'vodafone_cash', ar: 'فودافون كاش — ارفع الإيصال', en: 'Vodafone Cash — upload the receipt', receipt: true },
  { value: 'instapay', ar: 'إنستاباي — ارفع الإيصال', en: 'Instapay — upload the receipt', receipt: true },
];

/**
 * Subscribe or renew: pay online with Paymob, or go through customer services (cash on delivery,
 * Vodafone Cash, Instapay with a receipt). A receipt is a claim — customer services checks it and
 * only then is the card extended; nothing here changes the card by itself.
 */
export const SubscribePanel: React.FC<SubscribePanelProps> = ({ token, status, onDone }) => {
  const { isAr } = useLanguage();
  const [method, setMethod] = useState<Exclude<PayMethod, 'paymob'>>('cash_on_delivery');
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState<'online' | 'manual' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pixel, setPixel] = useState<PixelSession | null>(null);

  const chosen = MANUAL.find((m) => m.value === method) ?? MANUAL[0];

  const fail = (err: unknown) => {
    setMessage({
      ok: false,
      text: err instanceof ApiError && err.status === 422 ? err.message : isAr ? 'تعذر إتمام الطلب. حاول مرة أخرى.' : 'The request could not be completed. Please try again.',
    });
    if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Subscription request failed', err, { method });
  };

  const payOnline = async () => {
    setBusy('online');
    setMessage(null);
    try {
      const result = await subscribe(token, { method: 'paymob', email });
      if (result.client_secret && result.public_key) setPixel({ clientSecret: result.client_secret, publicKey: result.public_key, checkoutUrl: result.checkout_url });
      else if (result.checkout_url) window.open(result.checkout_url, '_blank');
      else setMessage({ ok: false, text: isAr ? 'تعذر فتح صفحة الدفع.' : 'The payment page could not be opened.' });
      onDone();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const sendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('manual');
    setMessage(null);
    try {
      await subscribe(token, { method, email, reference, receipt });
      setMessage({ ok: true, text: isAr ? 'شكراً — ستراجع خدمة العملاء الدفع وتفعّل كارتك.' : 'Thanks — customer service will check and activate your card.' });
      setReceipt(null);
      onDone();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const field = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-[#941946]';

  return (
    <section className={`rounded-2xl p-4 border bg-white border-slate-200/90 space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
      <h3 className="text-xs font-bold flex items-center gap-2 text-slate-900">
        <CreditCard className="w-4 h-4 text-[#941946]" />
        {isAr ? 'اشترك في الكارت الكامل' : 'Subscribe to the full card'}
        {status.price > 0 && <span className="text-slate-500 font-mono" dir="ltr">{status.price} {isAr ? 'ج.م' : 'EGP'}</span>}
      </h3>

      {status.open_subscription && (
        <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {isAr ? 'دفعة في انتظار المراجعة.' : 'A payment is waiting for review.'}
        </p>
      )}

      {pixel && <PayModal session={pixel} onClose={() => setPixel(null)} onComplete={() => { setPixel(null); onDone(); }} />}

      {status.can_pay_online && (
        <button type="button" onClick={payOnline} disabled={busy !== null} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold cursor-pointer">
          {busy === 'online' ? '…' : isAr ? 'ادفع الآن بالبطاقة أو المحفظة' : 'Pay now by card or wallet'}
        </button>
      )}

      <form onSubmit={sendManual} className="space-y-2">
        {MANUAL.map((m) => (
          <label key={m.value} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" checked={method === m.value} onChange={() => setMethod(m.value)} className="accent-[#941946]" />
            {isAr ? m.ar : m.en}
          </label>
        ))}

        {chosen.receipt && (
          <>
            <input type="file" required accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} className={field} />
            <input type="text" dir="ltr" placeholder={isAr ? 'مرجع التحويل (اختياري)' : 'Transfer reference (optional)'} value={reference} onChange={(e) => setReference(e.target.value)} className={field} />
          </>
        )}
        <input type="email" dir="ltr" placeholder={isAr ? 'بريدك لاستلام الإيصال (اختياري)' : 'Email for your receipt (optional)'} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />

        {message && (
          <p role="alert" className={`text-[11px] font-bold rounded-xl px-3 py-2 border ${message.ok ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200'}`}>
            {message.text}
          </p>
        )}

        <button type="submit" disabled={busy !== null} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-2xl text-xs font-bold cursor-pointer">
          {busy === 'manual' ? '…' : isAr ? 'إرسال الطلب' : 'Send request'}
        </button>
      </form>
    </section>
  );
};
