import React from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApi } from '../hooks/useApi';
import { fetchOrder, type OrderDetail, type StatusMove } from '../api/orders';
import { usePopupHash } from '../utils/popupHash';
import { Skeleton } from './ui/Feedback';

export type StatusKind = 'payment' | 'delivery';

/** What each status means for the buyer. The label itself is the backend's; this only explains it. */
const MEANING: Record<StatusKind, Record<string, { ar: string; en: string }>> = {
  payment: {
    pending: { ar: 'لم يصلنا الدفع بعد. إن اخترت الدفع عند الاستلام فستدفع للمندوب، وإن اخترت الدفع الإلكتروني أو التحويل فبانتظار إتمامه أو مراجعة الإيصال.', en: 'We have not received the payment yet. For cash on delivery you pay the courier; for online payment or a transfer it is waiting to be completed or for the receipt to be checked.' },
    accepted: { ar: 'تم استلام الدفع وتأكيده. لا يلزمك دفع أي شيء آخر.', en: 'The payment was received and confirmed. You owe nothing more.' },
    rejected: { ar: 'لم تتم عملية الدفع (رُفضت من البنك أو لم تكتمل). يمكنك المحاولة مرة أخرى.', en: 'The payment did not go through (declined or not completed). You can try again.' },
    canceled: { ar: 'تم إلغاء الطلب فلن يتم تحصيل أي مبلغ.', en: 'The order was cancelled, so nothing will be charged.' },
    refunded: { ar: 'تم رد المبلغ إليك. قد يستغرق ظهوره في حسابك عدة أيام حسب البنك أو المحفظة.', en: 'Your money was refunded. It may take a few days to show in your account or wallet.' },
  },
  delivery: {
    pending: { ar: 'استلمنا طلبك وهو في انتظار التجهيز.', en: 'We received your order and it is waiting to be prepared.' },
    processing: { ar: 'طلبك قيد التجهيز والشحن.', en: 'Your order is being prepared and shipped.' },
    'on-delivery': { ar: 'طلبك مع مندوب التوصيل في الطريق إليك.', en: 'Your order is with the courier, on its way to you.' },
    completed: { ar: 'تم تسليم الطلب.', en: 'The order was delivered.' },
  },
};

export const statusTone = (kind: StatusKind, value?: string) => {
  const good = kind === 'payment' ? value === 'accepted' : value === 'completed';
  const bad = value === 'rejected' || value === 'canceled' || value === 'cancelled';
  if (good) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (bad) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (value === 'refunded') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (value === 'processing' || value === 'on-delivery') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
};

interface OrderStatusSheetProps {
  code: string;
  kind: StatusKind;
  value: string;
  label: string;
  onClose: () => void;
}

/** A status tapped: what it means, and how it changed over time (each change with its date). */
export const OrderStatusSheet: React.FC<OrderStatusSheetProps> = ({ code, kind, value, label, onClose }) => {
  const { isAr } = useLanguage();
  usePopupHash('order-status-popup');
  const detail = useApi<OrderDetail | null>(`order-status:${code}:${isAr}`, () => fetchOrder(code));
  const order = detail.data;

  const moves: StatusMove[] = (order?.status_history ?? []).filter((m) => m.kind === kind);
  const meaning = MEANING[kind][value];
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className={`bg-white w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4 space-y-4 ${isAr ? 'text-right' : 'text-left'}`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900">{kind === 'payment' ? (isAr ? 'حالة الدفع' : 'Payment status') : isAr ? 'حالة الطلب' : 'Order status'}</h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="text-slate-500 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2">
          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${statusTone(kind, value)}`}>{label}</span>
          {meaning && <p className="text-xs text-slate-600 leading-relaxed">{isAr ? meaning.ar : meaning.en}</p>}
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-black text-slate-900">{isAr ? 'سجل التغييرات' : 'History'}</h4>
          {detail.loading && <Skeleton className="h-16 w-full rounded-xl" />}
          {!detail.loading && (
            <ol className="space-y-3 border-s-2 border-slate-200 ps-3">
              {order?.placed_at && (
                <li className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">{isAr ? 'تم تسجيل الطلب' : 'Order placed'}</p>
                  <p className="text-[11px] text-slate-400">{when(order.placed_at)}</p>
                </li>
              )}
              {moves.map((m, i) => (
                <li key={i} className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                    {m.from && <><span className="text-slate-400">{m.from.label}</span><ArrowRight className={`w-3 h-3 text-slate-400 ${isAr ? 'rotate-180' : ''}`} /></>}
                    <span>{m.to?.label}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">{when(m.at)}</p>
                </li>
              ))}
              {!detail.loading && order && moves.length === 0 && (
                <li className="text-[11px] text-slate-400">{isAr ? 'لم تتغير الحالة منذ تسجيل الطلب.' : 'The status has not changed since the order was placed.'}</li>
              )}
            </ol>
          )}
          {!detail.loading && !order && <p className="text-[11px] text-slate-400">{isAr ? 'تعذر تحميل السجل.' : 'Could not load the history.'}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
};
