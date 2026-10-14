import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, Download, Loader2, PackageSearch, Search, Trash2, Upload } from 'lucide-react';
import { fetchMyOrders, fetchOrder, uploadReceipt, type OrderDetail } from '../api/orders';
import { useApi } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import { forgetOrder, rememberOrder, snapshotOf, useStoredOrders, type StoredOrder } from '../utils/orders';
import { useSession } from '../utils/session';
import { navigate, routeHref } from '../router';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { ErrorState, ListSkeleton, Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';

const toRow = (o: OrderDetail): StoredOrder => ({ ...snapshotOf(o), savedAt: o.placed_at ?? '' });

const statusTone = (value?: string) =>
  value === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : value === 'cancelled' || value === 'canceled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200';

/** "My orders": this device's orders (kept locally, found again by their code) plus, when signed in, the member's own list from the server. */
const OrdersList: React.FC = () => {
  const { isAr } = useLanguage();
  const session = useSession();
  const local = useStoredOrders();
  const [code, setCode] = useState('');
  const currency = isAr ? 'ج.م' : 'EGP';

  const mine = useApi(session.token ? `my-orders:${session.token}:${isAr}` : null, () => fetchMyOrders(session.token!));

  // The member's server list and this device's snapshots, one row per code, newest first.
  const rows = useMemo(() => {
    const byCode = new Map<string, StoredOrder>();
    for (const o of local) byCode.set(o.code, o);
    for (const o of mine.data ?? []) byCode.set(o.order_code, { ...toRow(o), savedAt: byCode.get(o.order_code)?.savedAt ?? o.placed_at ?? '' });
    return [...byCode.values()].sort((a, b) => (b.placedAt ?? b.savedAt).localeCompare(a.placedAt ?? a.savedAt));
  }, [local, mine.data]);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed) navigate(routeHref({ orders: { code: trimmed } }));
  };

  return (
    <div className={`space-y-4 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">{isAr ? 'طلباتي' : 'My orders'}</h1>
            <p className="text-[11px] text-slate-500">{isAr ? 'تابع طلباتك برقم الطلب، أو سجّل الدخول لتجد كل طلباتك.' : 'Track an order by its code, or sign in to see all your orders.'}</p>
          </div>
        </div>

        <form onSubmit={find} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            dir="ltr"
            placeholder={isAr ? 'رقم الطلب' : 'Order code'}
            className="flex-1 min-w-0 px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-mono uppercase focus:outline-none focus:border-[#941946]"
          />
          <button type="submit" disabled={!code.trim()} className="px-4 py-2.5 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Search className="w-3.5 h-3.5" />
            <span>{isAr ? 'تتبع' : 'Track'}</span>
          </button>
        </form>
      </div>

      {session.token && mine.loading && rows.length === 0 && <ListSkeleton rows={3} />}
      {mine.error && <ErrorState onRetry={mine.reload} />}

      {rows.length === 0 && !mine.loading ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <PackageSearch className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">{isAr ? 'لا توجد طلبات على هذا الجهاز' : 'No orders on this device yet'}</h3>
          <p className="text-xs text-slate-500 mt-1">{isAr ? 'عندما تطلب ستجد طلبك هنا لتتابعه.' : 'When you order, it will appear here so you can follow it.'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((o) => (
            <a
              key={o.code}
              href={routeHref({ orders: { code: o.code } })}
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey) return;
                e.preventDefault();
                navigate(routeHref({ orders: { code: o.code } }));
              }}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all p-2.5 flex items-center gap-3"
            >
              <Thumb src={o.image ?? undefined} alt={o.summary} kind="product" className="w-16 h-16 rounded-xl shrink-0 border border-slate-100" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="text-xs font-black font-mono text-slate-900">{o.code}</span>
                  {o.deliveryStatus && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusTone(o.deliveryValue)}`}>{o.deliveryStatus}</span>}
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1">
                  {o.summary}
                  {o.itemCount > 1 ? (isAr ? ` +${o.itemCount - 1}` : ` +${o.itemCount - 1} more`) : ''}
                </p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-black text-[#941946] font-mono">{o.total} {currency}</span>
                  {o.placedAt && <span className="text-slate-400">{new Date(o.placedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')}</span>}
                </div>
              </div>
              <ChevronLeft className={`w-4 h-4 text-slate-300 shrink-0 ${isAr ? '' : 'rotate-180'}`} />
            </a>
          ))}

        </div>
      )}
    </div>
  );
};

/** One order by its code. */
const OrderDetailView: React.FC<{ code: string }> = ({ code }) => {
  const { isAr } = useLanguage();
  const currency = isAr ? 'ج.م' : 'EGP';
  const detail = useApi<OrderDetail | null>(`order:${code}:${isAr}`, () => fetchOrder(code));
  const order = detail.data;
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<'ok' | 'fail' | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  // Opening an order refreshes this device's snapshot, so the list follows the order as it moves along.
  useEffect(() => {
    if (order) rememberOrder(snapshotOf(order));
  }, [order]);

  const sendReceipt = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      await uploadReceipt(code, file);
      setUploadMsg('ok');
      detail.reload();
    } catch {
      setUploadMsg('fail');
    } finally {
      setUploading(false);
    }
  };

  const downloadPdf = async () => {
    if (!order) return;
    setPdfBusy(true);
    setPdfFailed(false);
    try {
      await downloadInvoicePdf(
        {
          code: order.order_code,
          date: order.placed_at,
          customer: { name: order.customer_full_name, phone: order.customer_phone, address: order.customer_address },
          items: order.items.map((line) => ({ name: line.name, quantity: line.quantity, unit: line.quantity > 0 ? Math.round((line.line_total / line.quantity) * 100) / 100 : null, total: line.line_total })),
          saved: order.total_amount_before_discount != null ? order.total_amount_before_discount - order.total_amount : 0,
          delivery: order.delivery_price,
          total: order.total_amount,
          payment: `${order.payment_type.label} — ${order.payment_status.label}`,
          member: order.membership_number,
        },
        isAr,
      );
    } catch {
      setPdfFailed(true);
    } finally {
      setPdfBusy(false);
    }
  };

  const back = () => (history.length > 1 ? history.back() : navigate(routeHref({ orders: { code: null } })));
  const savedAmount = order?.total_amount_before_discount != null ? order.total_amount_before_discount - (order.total_amount - order.delivery_price) : 0;

  return (
    <div className={`space-y-4 pb-24 pt-1 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button onClick={back} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#941946] rounded-xl cursor-pointer">
          <ArrowRight className={`w-4 h-4 text-[#941946] ${isAr ? '' : 'rotate-180'}`} />
          <span>{isAr ? 'طلباتي' : 'My orders'}</span>
        </button>
        <span dir="ltr" className="text-xs font-black font-mono text-slate-700 px-2">{code}</span>
      </div>

      {detail.loading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {detail.error && <ErrorState onRetry={detail.reload} />}

      {!detail.loading && !detail.error && order === null && (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-2">
          <PackageSearch className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">{isAr ? 'لا يوجد طلب بهذا الرقم' : 'No order with that code'}</h3>
          <p className="text-xs text-slate-500">{isAr ? 'تأكد من كتابة الرقم بشكل صحيح.' : 'Check the code and try again.'}</p>
          <button onClick={() => { forgetOrder(code); navigate(routeHref({ orders: { code: null } })); }} className="text-xs font-bold text-[#941946] cursor-pointer">
            {isAr ? 'العودة للقائمة' : 'Back to the list'}
          </button>
        </div>
      )}

      {order && (
        <>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statusTone(order.delivery_status.value)}`}>{order.delivery_status.label}</span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">{order.payment_type.label}</span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">{order.payment_status.label}</span>
            </div>
            {order.cancel_reason && <p className="text-xs text-rose-600">{order.cancel_reason}</p>}
            {order.placed_at && <p className="text-[11px] text-slate-400">{new Date(order.placed_at).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}</p>}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
            <h2 className="text-xs font-black text-slate-900">{isAr ? 'المنتجات' : 'Items'}</h2>
            {order.items.map((line) => (
              <div key={line.id} className="flex items-center gap-3">
                <Thumb src={line.image ?? undefined} alt={line.name} kind="product" className="w-12 h-12 rounded-lg shrink-0 border border-slate-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 line-clamp-2">{line.name}</p>
                  <p className="text-[11px] text-slate-500">{isAr ? `الكمية ${line.quantity}` : `Qty ${line.quantity}`}</p>
                </div>
                <span className="text-xs font-black font-mono text-slate-800 shrink-0">{line.line_total} {currency}</span>
              </div>
            ))}

            <div className="pt-2.5 border-t border-slate-100 space-y-1 text-xs">
              {savedAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>{isAr ? 'وفّرت بكرت ديلار' : 'You saved with your card'}</span>
                  <span className="font-mono">{savedAmount} {currency}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>{isAr ? 'التوصيل' : 'Delivery'}</span>
                <span className="font-mono">{order.delivery_price > 0 ? `${order.delivery_price} ${currency}` : isAr ? 'مجاناً' : 'Free'}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900">
                <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                <span className="font-mono text-[#941946]">{order.total_amount} {currency}</span>
              </div>
              {order.membership_number ? (
                <p className="text-[10px] text-emerald-700 font-bold pt-1">{isAr ? `سعر العضو — كرت ${order.membership_number}` : `Member price — card ${order.membership_number}`}</p>
              ) : (
                <p className="text-[10px] text-slate-400 pt-1">{isAr ? 'طُلب بالسعر الكامل (بدون كرت).' : 'Ordered at full price (no card).'}</p>
              )}
            </div>
          </div>

          {(order.customer_address || order.customer_phone) && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-1 text-xs text-slate-600">
              <h2 className="text-xs font-black text-slate-900 mb-1">{isAr ? 'بيانات التوصيل' : 'Delivery details'}</h2>
              {order.customer_full_name && <p className="font-bold text-slate-800">{order.customer_full_name}</p>}
              {order.customer_phone && <p dir="ltr" className={`font-mono ${isAr ? 'text-right' : ''}`}>{order.customer_phone}</p>}
              {order.customer_address && <p>{order.customer_address}</p>}
            </div>
          )}

          <button onClick={downloadPdf} disabled={pdfBusy} className="w-full py-3 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-300 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isAr ? 'تحميل الفاتورة PDF' : 'Download invoice (PDF)'}</span>
          </button>
          {pdfFailed && <p className="text-[11px] text-rose-500 font-bold text-center">{isAr ? 'تعذر إنشاء ملف PDF، حاول مرة أخرى' : 'Could not create the PDF, try again'}</p>}

          {order.accepts_receipts && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
              <h2 className="text-xs font-black text-slate-900">{isAr ? 'إيصال التحويل' : 'Transfer receipt'}</h2>
              <p className="text-[11px] text-slate-500">
                {order.awaiting_receipt
                  ? isAr ? 'أرسل صورة إيصال التحويل ليتم تأكيد طلبك.' : 'Send a photo of your transfer receipt so we can confirm the order.'
                  : isAr ? `تم استلام ${order.receipts.length} إيصال. يمكنك إرسال المزيد.` : `${order.receipts.length} receipt(s) received. You can send more.`}
              </p>
              <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { void sendReceipt(e.target.files?.[0]); e.target.value = ''; }} />
              <button onClick={() => fileInput.current?.click()} disabled={uploading} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isAr ? 'رفع إيصال' : 'Upload a receipt'}</span>
              </button>
              {uploadMsg === 'ok' && (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'تم إرسال الإيصال' : 'Receipt sent'}</p>
              )}
              {uploadMsg === 'fail' && <p className="text-[11px] text-rose-500 font-bold">{isAr ? 'تعذر رفع الإيصال، حاول مرة أخرى' : 'Could not send the receipt, try again'}</p>}
            </div>
          )}

          <button onClick={() => { forgetOrder(code); navigate(routeHref({ orders: { code: null } })); }} className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center justify-center gap-1 cursor-pointer">
            <Trash2 className="w-3 h-3" />
            {isAr ? 'إزالة من قائمة هذا الجهاز' : 'Remove from this device’s list'}
          </button>
        </>
      )}
    </div>
  );
};

export const OrdersPage: React.FC<{ code: string | null }> = ({ code }) => (code ? <OrderDetailView key={code} code={code} /> : <OrdersList />);
