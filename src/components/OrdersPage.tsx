import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, Download, Loader2, PackageSearch, Search, Upload } from 'lucide-react';
import { cancelOrder, fetchMyOrders, hideOrder, fetchOrder, invoiceLink, payOrder, type OnlineChannel, requestOrderRefund, uploadReceipt, type OrderDetail } from '../api/orders';
import { useApi } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import { forgetOrder, rememberOrder, snapshotOf, useStoredOrders, type StoredOrder } from '../utils/orders';
import { useSession } from '../utils/session';
import { navigate, routeHref } from '../router';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { ErrorState, ListSkeleton, Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { PayModal, type PixelSession } from './PayModal';
import { OrderStatusSheet, statusTone, type StatusKind } from './OrderStatusSheet';

const toRow = (o: OrderDetail): StoredOrder => ({ ...snapshotOf(o), savedAt: o.placed_at ?? '' });

/** A status chip that opens its explanation and history when tapped. */
const StatusChip: React.FC<{ kind: StatusKind; value?: string; label?: string; onOpen: (kind: StatusKind) => void; size?: 'sm' | 'md' }> = ({ kind, value, label, onOpen, size = 'sm' }) =>
  label && value ? (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(kind); }}
      className={`font-bold rounded-full border cursor-pointer ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'} ${statusTone(kind, value)}`}
    >
      {label}
    </button>
  ) : null;

/** "My orders": this device's orders (kept locally, found again by their code) plus, when signed in, the member's own list from the server. */
const OrdersList: React.FC = () => {
  const { isAr } = useLanguage();
  const session = useSession();
  const local = useStoredOrders();
  const [code, setCode] = useState('');
  const [sheet, setSheet] = useState<{ code: string; kind: StatusKind; value: string; label: string } | null>(null);
  const currency = isAr ? 'ج.م' : 'EGP';

  const mine = useApi(session.token ? `my-orders:${session.token}:${isAr}` : null, () => fetchMyOrders(session.token!));

  // The member's server list and this device's snapshots, one row per code, newest first.
  const rows = useMemo(() => {
    const byCode = new Map<string, StoredOrder>();
    for (const o of local) byCode.set(o.code, o);
    for (const o of mine.data ?? []) if (!o.hidden_by_buyer) byCode.set(o.order_code, { ...toRow(o), savedAt: byCode.get(o.order_code)?.savedAt ?? o.placed_at ?? '' });
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
            <p className="text-[11px] text-slate-500">{isAr ? 'تابع طلباتك برقم الطلب، أو سجّل دخول عشان تلاقي كل طلباتك.' : 'Track an order by its code, or sign in to see all your orders.'}</p>
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
          <h3 className="text-sm font-bold text-slate-800">{isAr ? 'مفيش طلبات على الموبايل ده' : 'No orders on this device yet'}</h3>
          <p className="text-xs text-slate-500 mt-1">{isAr ? 'أول ما تطلب هتلاقي طلبك هنا تتابعه.' : 'When you order, it will appear here so you can follow it.'}</p>
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
                </div>
                <div className="flex flex-wrap gap-1">
                  <StatusChip kind="delivery" value={o.deliveryValue} label={o.deliveryStatus} onOpen={(kind) => setSheet({ code: o.code, kind, value: o.deliveryValue ?? '', label: o.deliveryStatus ?? '' })} />
                  <StatusChip kind="payment" value={o.paymentValue} label={o.paymentStatus} onOpen={(kind) => setSheet({ code: o.code, kind, value: o.paymentValue ?? '', label: o.paymentStatus ?? '' })} />
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

      {sheet && <OrderStatusSheet {...sheet} onClose={() => setSheet(null)} />}
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
  const session = useSession();
  const [sheetKind, setSheetKind] = useState<StatusKind | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundMsg, setRefundMsg] = useState<'ok' | 'fail' | null>(null);

  const askRefund = async () => {
    if (!session.token) return;
    if (!window.confirm(isAr ? 'تبعت طلب استرداد الفلوس لخدمة العملاء؟' : 'Send a refund request to customer service?')) return;
    setRefundBusy(true);
    setRefundMsg(null);
    try {
      await requestOrderRefund(session.token, code);
      setRefundMsg('ok');
      detail.reload();
    } catch {
      setRefundMsg('fail');
    } finally {
      setRefundBusy(false);
    }
  };

  // An order left unpaid: pay it again (a fresh form each time) or drop it (cancelled, never deleted).
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [pixel, setPixel] = useState<PixelSession | null>(null);

  const payAgain = async (channel: OnlineChannel) => {
    setPayBusy(true);
    setPayMsg(null);
    try {
      const link = await payOrder(code, channel);
      if (link.client_secret && link.public_key) {
        setPixel({ clientSecret: link.client_secret, publicKey: link.public_key, checkoutUrl: link.checkout_url, ...(channel === 'wallet' && link.checkout_url ? { mode: 'frame' as const } : {}) });
      } else if (link.checkout_url) {
        window.open(link.checkout_url, '_blank');
      } else {
        setPayMsg(isAr ? 'مقدرناش نفتح صفحة الدفع، جرّب تاني' : 'Could not open the payment page, please try again');
      }
    } catch {
      setPayMsg(isAr ? 'مقدرناش نفتح صفحة الدفع، جرّب تاني أو الطريقة التانية' : 'Could not open the payment page, try again or the other way');
    } finally {
      setPayBusy(false);
    }
  };

  const [hideAsk, setHideAsk] = useState(false);
  const [hideBusy, setHideBusy] = useState(false);
  const [hideMsg, setHideMsg] = useState<string | null>(null);

  const confirmHide = async () => {
    setHideBusy(true);
    setHideMsg(null);
    try {
      await hideOrder(code);
      forgetOrder(code);
      navigate(routeHref({ orders: { code: null } }));
    } catch (e) {
      // The order moved on (422) or the call failed: say why and refresh what the order is now.
      setHideMsg(e instanceof Error && e.message ? e.message : isAr ? 'مقدرناش نخفي الطلب، جرّب تاني' : 'Could not hide the order, please try again');
      setHideAsk(false);
      detail.reload();
    } finally {
      setHideBusy(false);
    }
  };

  const dropOrder = async () => {
    if (!window.confirm(isAr ? 'تلغي الطلب ده؟ لسه ما اتدفعش وهيتقفل.' : 'Cancel this order? It is unpaid and will be closed.')) return;
    setPayBusy(true);
    setPayMsg(null);
    try {
      await cancelOrder(code, session.token);
      detail.reload();
    } catch {
      setPayMsg(isAr ? 'مقدرناش نلغي الطلب، جرّب تاني' : 'Could not cancel the order, please try again');
    } finally {
      setPayBusy(false);
    }
  };

  // Opening an order refreshes this device's snapshot, so the list follows the order as it moves along.
  useEffect(() => {
    if (!order) return;
    if (order.hidden_by_buyer) forgetOrder(order.order_code);
    else rememberOrder(snapshotOf(order));
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
          wallet: order.wallet_amount,
          points: order.points_amount,
          due: order.amount_due,
          paid: order.total_paid,
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
          <h3 className="text-sm font-bold text-slate-800">{isAr ? 'مفيش طلب بالرقم ده' : 'No order with that code'}</h3>
          <p className="text-xs text-slate-500">{isAr ? 'اتأكد إنك كتبت الرقم صح.' : 'Check the code and try again.'}</p>
          <button onClick={() => navigate(routeHref({ orders: { code: null } }))} className="text-xs font-bold text-[#941946] cursor-pointer">
            {isAr ? 'رجوع للقائمة' : 'Back to the list'}
          </button>
        </div>
      )}

      {order && (
        <>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <StatusChip size="md" kind="delivery" value={order.delivery_status.value} label={order.delivery_status.label} onOpen={setSheetKind} />
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-slate-50 text-slate-600 border-slate-200">{order.payment_type.label}</span>
              <StatusChip size="md" kind="payment" value={order.payment_status.value} label={order.payment_status.label} onOpen={setSheetKind} />
            </div>
            {order.cancel_reason && <p className="text-xs text-rose-600">{order.cancel_reason}</p>}
            {['pending', 'rejected'].includes(order.payment_status.value) && order.delivery_status.value === 'pending' && (
              <div data-testid="order-unpaid" className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 space-y-2">
                <p className="text-[11px] font-bold text-amber-900">{isAr ? 'الطلب ده لسه ما اتدفعش.' : 'This order has not been paid yet.'}</p>
                <div className="flex flex-wrap gap-2">
                  {order.payment_type.value === 'paymob' && (
                    <>
                      <button disabled={payBusy} onClick={() => payAgain('card')} className="px-3 py-1.5 rounded-xl bg-[#941946] text-white text-[11px] font-extrabold cursor-pointer disabled:opacity-60">{isAr ? 'ادفع بالكارت' : 'Pay by card'}</button>
                      <button disabled={payBusy} onClick={() => payAgain('wallet')} className="px-3 py-1.5 rounded-xl bg-violet-700 text-white text-[11px] font-extrabold cursor-pointer disabled:opacity-60">{isAr ? 'ادفع بمحفظة موبايل' : 'Pay by mobile wallet'}</button>
                    </>
                  )}
                  <button data-testid="order-cancel" disabled={payBusy} onClick={dropOrder} className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-700 text-[11px] font-extrabold cursor-pointer disabled:opacity-60">{isAr ? 'إلغاء الطلب' : 'Cancel order'}</button>
                </div>
                {payMsg && <p className="text-[11px] font-bold text-rose-600">{payMsg}</p>}
              </div>
            )}
            {order.can_hide && !order.hidden_by_buyer && (
              <div data-testid="order-hide-box" className="flex flex-wrap items-center gap-2">
                <button data-testid="order-hide" disabled={hideBusy} onClick={() => setHideAsk(true)} className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-[11px] font-extrabold cursor-pointer disabled:opacity-60">{isAr ? 'إخفاء الطلب' : 'Hide order'}</button>
                {hideMsg && <p className="text-[11px] font-bold text-rose-600">{hideMsg}</p>}
              </div>
            )}
            {hideAsk && (
              <div role="dialog" aria-modal="true" data-testid="order-hide-dialog" className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={() => !hideBusy && setHideAsk(false)}>
                <div className="bg-white rounded-2xl p-4 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-extrabold text-slate-900">{isAr ? 'مش عايز الطلب ده؟' : 'Don’t want this order?'}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{isAr ? 'هيختفي من طلباتك. لو غيرت رأيك كلّم خدمة العملاء.' : 'It will disappear from your orders. If you change your mind, contact customer service.'}</p>
                  <div className="flex gap-2 justify-end">
                    <button data-testid="order-hide-cancel" disabled={hideBusy} onClick={() => setHideAsk(false)} className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer">{isAr ? 'رجوع' : 'Cancel'}</button>
                    <button data-testid="order-hide-confirm" disabled={hideBusy} onClick={confirmHide} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60">{isAr ? 'تأكيد الإخفاء' : 'Yes, hide it'}</button>
                  </div>
                </div>
              </div>
            )}
            {pixel && <PayModal session={pixel} onClose={() => setPixel(null)} onComplete={() => { setPixel(null); detail.reload(); }} check={async () => (await fetchOrder(code))?.payment_status.value === 'accepted'} />}
            {order.placed_at && <p className="text-[11px] text-slate-400">{new Date(order.placed_at).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}</p>}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
            <h2 className="text-xs font-black text-slate-900">{isAr ? 'المنتجات' : 'Items'}</h2>
            {order.items.map((line) => (
              <button
                type="button"
                key={line.id}
                data-testid="order-line-link"
                onClick={() => line.slug && navigate(routeHref({ product: line.slug }))}
                className="w-full flex items-center gap-3 text-start cursor-pointer"
              >
                <Thumb src={line.image ?? undefined} alt={line.name} kind="product" className="w-12 h-12 rounded-lg shrink-0 border border-slate-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 line-clamp-2">{line.name}</p>
                  <p className="text-[11px] text-slate-500">{isAr ? `الكمية ${line.quantity}` : `Qty ${line.quantity}`}</p>
                </div>
                <span className="text-xs font-black font-mono text-slate-800 shrink-0">{line.line_total} {currency}</span>
              </button>
            ))}

            {(order.shipments?.length ?? 0) > 0 && (
              <div data-testid="order-parcels" className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                <p className="font-black text-slate-900">{isAr ? `الطلب اتقسم على ${order.shipments!.length} شحنات` : `Shipped in ${order.shipments!.length} parcel(s)`}</p>
                {order.shipments!.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{p.store_name || (isAr ? 'شحنة' : 'Parcel')}</p>
                      <p className="text-[11px] text-slate-500">{isAr ? 'المنتجات' : 'Goods'} {p.subtotal} {currency} · {isAr ? 'الشحن' : 'Shipping'} {p.delivery_price > 0 ? `${p.delivery_price} ${currency}` : isAr ? 'مجاناً' : 'Free'}</p>
                    </div>
                    <a href={invoiceLink(p.invoice_url, isAr)} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-800">{isAr ? 'فاتورة' : 'Invoice'}</a>
                  </div>
                ))}
                {order.invoice_all_url && (
                  <a data-testid="invoice-all" href={invoiceLink(order.invoice_all_url, isAr)} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-2 rounded-xl bg-slate-900 text-white text-[11px] font-bold">{isAr ? 'فاتورة الطلب كله' : 'Invoice — whole order'}</a>
                )}
              </div>
            )}

            <div className="pt-2.5 border-t border-slate-100 space-y-1 text-xs">
              {savedAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>{isAr ? 'وفّرت بكارت ديلر' : 'You saved with your card'}</span>
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
              {((order.wallet_amount ?? 0) > 0 || (order.points_amount ?? 0) > 0) && (
                <div data-testid="order-split" className="rounded-xl bg-violet-50 border border-violet-200 p-2 text-xs font-bold text-violet-900 space-y-0.5">
                  {(order.points_amount ?? 0) > 0 && <div data-testid="order-points" className="flex justify-between text-amber-800"><span>{isAr ? `⭐ خصم نقاط الولاء (${order.points_used ?? 0} نقطة)` : `⭐ Loyalty points discount (${order.points_used ?? 0} points)`}</span><span className="font-mono">-{order.points_amount} {currency}</span></div>}
                  {(order.wallet_amount ?? 0) > 0 && <div className="flex justify-between"><span>{isAr ? '👛 دفعت من المحفظة' : '👛 Paid from wallet'}</span><span className="font-mono">{order.wallet_amount} {currency}</span></div>}
                  <div className="flex justify-between"><span>{isAr ? '💵 دفعت من الفلوس الحقيقية' : '💵 Paid in real money'}</span><span className="font-mono">{order.amount_due ?? Math.max(0, order.total_amount - (order.wallet_amount ?? 0) - (order.points_amount ?? 0))} {currency}</span></div>
                  {order.wallet_refunded && <p className="text-emerald-700">{isAr ? 'الفلوس رجعت لمحفظتك (والنقاط لرصيدك).' : 'The money was returned to your wallet (and the points to your balance).'}</p>}
                </div>
              )}
              {order.membership_number ? (
                <p className="text-[10px] text-emerald-700 font-bold pt-1">{isAr ? `سعر العضو — كارت ${order.membership_number}` : `Member price — card ${order.membership_number}`}</p>
              ) : (
                <p className="text-[10px] text-slate-400 pt-1">{isAr ? 'اتطلب بالسعر الكامل (من غير كارت).' : 'Ordered at full price (no card).'}</p>
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

          {sheetKind && order && (
            <OrderStatusSheet
              code={code}
              kind={sheetKind}
              value={sheetKind === 'payment' ? order.payment_status.value : order.delivery_status.value}
              label={sheetKind === 'payment' ? order.payment_status.label : order.delivery_status.label}
              onClose={() => setSheetKind(null)}
            />
          )}

          <button onClick={downloadPdf} disabled={pdfBusy} className="w-full py-3 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-300 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer">
            {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isAr ? 'تحميل الفاتورة PDF' : 'Download invoice (PDF)'}</span>
          </button>
          {pdfFailed && <p className="text-[11px] text-rose-500 font-bold text-center">{isAr ? 'معرفناش نعمل ملف الـ PDF، جرّب تاني' : 'Could not create the PDF, try again'}</p>}

          {(order.can_request_refund || order.refund_requested) && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
              <h2 className="text-xs font-black text-slate-900">{isAr ? 'رجّع فلوسي' : 'Refund'}</h2>
              {order.refund_requested || refundMsg === 'ok' ? (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'طلب الاسترداد اتبعت، فريقنا هيتواصل معاك.' : 'Refund requested — customer service will contact you.'}</p>
              ) : session.token ? (
                <>
                  <p className="text-[11px] text-slate-500">{isAr ? 'طلبك مدفوع ولسه ماتشحنش، تقدر تطلب فلوسك ترجع.' : 'Your order is paid and has not shipped yet, so you can ask for your money back.'}</p>
                  <button onClick={askRefund} disabled={refundBusy} className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    {refundBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isAr ? 'طلب استرجاع الفلوس' : 'Request a refund'}</span>
                  </button>
                  {refundMsg === 'fail' && <p className="text-[11px] text-rose-500 font-bold">{isAr ? 'مقدرناش نبعت الطلب، جرّب تاني' : 'Could not send the request, try again'}</p>}
                </>
              ) : (
                <p className="text-[11px] text-slate-500">{isAr ? 'سجّل دخول عشان تطلب استرجاع الفلوس.' : 'Sign in to request a refund.'}</p>
              )}
            </div>
          )}

          {order.accepts_receipts && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
              <h2 className="text-xs font-black text-slate-900">{isAr ? 'إيصال التحويل' : 'Transfer receipt'}</h2>
              <p className="text-[11px] text-slate-500">
                {order.awaiting_receipt
                  ? isAr ? 'ابعت صورة إيصال التحويل عشان نأكد طلبك.' : 'Send a photo of your transfer receipt so we can confirm the order.'
                  : isAr ? `وصلنا ${order.receipts.length} إيصال. تقدر تبعت أكتر.` : `${order.receipts.length} receipt(s) received. You can send more.`}
              </p>
              <input ref={fileInput} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => { void sendReceipt(e.target.files?.[0]); e.target.value = ''; }} />
              <button onClick={() => fileInput.current?.click()} disabled={uploading} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isAr ? 'ارفع إيصال' : 'Upload a receipt'}</span>
              </button>
              {uploadMsg === 'ok' && (
                <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'الإيصال اتبعت' : 'Receipt sent'}</p>
              )}
              {uploadMsg === 'fail' && <p className="text-[11px] text-rose-500 font-bold">{isAr ? 'الإيصال ماترفعش، جرّب تاني' : 'Could not send the receipt, try again'}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const OrdersPage: React.FC<{ code: string | null }> = ({ code }) => (code ? <OrderDetailView key={code} code={code} /> : <OrdersList />);
