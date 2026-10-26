import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, MessageCircle, PhoneCall } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { subscribe, type MemberStatus, type PayMethod } from '../api/membership';
import { reportClientError } from '../utils/reportError';
import { PlanPicker, plansOf } from './PlanPicker';
import { formatNumber } from '../utils/formatNumber';
import { navigate, routeHref } from '../router';

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
  // Only what the admin shows; customer services stays reachable through the card's contact buttons.
  const manual = MANUAL.filter((m) => status.payment_methods?.includes(m.value));
  const [method, setMethod] = useState<Exclude<PayMethod, 'paymob'>>('cash_on_delivery');
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState<'manual' | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);

  const chosen = manual.find((m) => m.value === method) ?? manual[0];
  const plans = plansOf(status);
  const [planKey, setPlanKey] = useState<string | undefined>(plans[0]?.key);
  const plan = plans.find((p) => p.key === planKey) ?? plans[0];

  const fail = (err: unknown) => {
    setMessage({
      ok: false,
      text: err instanceof ApiError && err.status === 422 ? err.message : isAr ? 'تعذر إتمام الطلب. حاول مرة أخرى.' : 'The request could not be completed. Please try again.',
    });
    if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Subscription request failed', err, { method });
  };

  const sendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('manual');
    setMessage(null);
    try {
      await subscribe(token, { method: chosen.value, plan: plan?.key, email, reference, receipt });
      setMessage({ ok: true, text: isAr ? 'شكراً — ستراجع خدمة العملاء الدفع وتفعّل كارتك.' : 'Thanks — customer service will check and activate your card.' });
      setReceipt(null);
      onDone();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  // Tapping the title goes straight to paying: the online payment page when it is on, else the manual form.
  const nothingToPayWith = !status.can_pay_online && manual.length === 0;
  // The status may have been read before the admin switched payments on: ask the server once more.
  React.useEffect(() => {
    if (nothingToPayWith) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const toPayPage = () => navigate(routeHref({ tab: 'mycard', section: 'pay' }));
  const goPay = () => {
    if (busy !== null) return;
    if (status.can_pay_online) toPayPage();
    else if (formRef.current) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    else setMessage({ ok: false, text: isAr ? 'الدفع الإلكتروني غير متاح حالياً. تواصل مع خدمة العملاء لتفعيل اشتراكك.' : 'Online payment is not available right now. Contact customer service to activate your subscription.' });
  };
  const phone = status.contact?.phone_international ?? status.contact?.phone ?? null;
  const whatsapp = (status.contact?.whatsapp ?? '').replace(/\D/g, '');
  const Chevron = isAr ? ChevronLeft : ChevronRight;

  const field = 'w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:outline-none focus:border-[#941946]';

  return (
    <section className={`rounded-2xl p-4 border bg-white border-slate-200/90 space-y-3 ${isAr ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={goPay} className="w-full flex items-center gap-2 text-xs font-bold text-slate-900 text-start cursor-pointer">
        <CreditCard className="w-4 h-4 text-[#941946]" />
        <span>{isAr ? 'اشترك في الكارت الكامل' : 'Subscribe to the full card'}</span>
        {plan && <span className="text-slate-500">{plans.length > 1 ? `${isAr ? 'من' : 'from'} ${formatNumber(Math.min(...plans.map((p) => p.price)), isAr)}` : formatNumber(plan.price, isAr)} {isAr ? 'ج.م' : 'EGP'}</span>}
        <Chevron className="w-4 h-4 text-[#941946] ms-auto" />
      </button>

      {status.open_subscription && (
        <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {isAr ? 'دفعة في انتظار المراجعة.' : 'A payment is waiting for review.'}
        </p>
      )}

      {nothingToPayWith && (
        <div className="space-y-2">
          <p role="alert" className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {message?.text ?? (isAr ? 'الدفع الإلكتروني غير متاح حالياً. تواصل مع خدمة العملاء لتفعيل اشتراكك.' : 'Online payment is not available right now. Contact customer service to activate your subscription.')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {phone && (
              <a href={`tel:${phone}`} className="py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-amber-400" />{isAr ? 'اتصل بنا' : 'Call us'}
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="py-2.5 rounded-2xl bg-[#25D366] text-white text-xs font-bold flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" />{isAr ? 'واتساب' : 'WhatsApp'}
              </a>
            )}
          </div>
        </div>
      )}

      {/* A failed online attempt must be visible even when no manual form is drawn. */}
      {!nothingToPayWith && manual.length === 0 && message && (
        <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 border text-rose-600 bg-rose-50 border-rose-200">{message.text}</p>
      )}

      {status.can_pay_online && (
        <button type="button" onClick={toPayPage} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] text-white rounded-2xl text-xs font-extrabold cursor-pointer">
          {isAr ? 'ادفع الآن — بطاقة أو محفظة إلكترونية' : 'Pay now — card or mobile wallet'}
        </button>
      )}

      {manual.length > 0 && (
      <form ref={formRef} onSubmit={sendManual} className="space-y-2">
        <PlanPicker plans={plans} value={plan?.key} onChange={setPlanKey} />
        {manual.map((m) => (
          <label key={m.value} className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="radio" checked={chosen?.value === m.value} onChange={() => setMethod(m.value)} className="accent-[#941946]" />
            {isAr ? m.ar : m.en}
          </label>
        ))}

        {chosen?.receipt && (
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
      )}
    </section>
  );
};
