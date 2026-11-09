import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Smartphone, 
  Truck, 
  ShieldCheck, 
  ExternalLink,
  MessageCircle,
  X,
  AlertCircle,
  Sparkles,
  ShoppingBag,
  Download,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { Product, CartItem } from '../types';
import { ApiError } from '../api/http';
import { fetchOrder, payOrder, placeOrder, uploadReceipt, type OnlineChannel, type PlacedOrder } from '../api/orders';
import { useSession } from '../utils/session';
import { useLoyalty } from '../utils/quizStore';
import { PaymobPixel } from './PaymobPixel';
import { PaymobFrame } from './PaymobFrame';
import { reportClientError } from '../utils/reportError';
import { fetchAddresses, type MemberAddress } from '../api/auth';
import { fetchLocations, fetchShopSettings } from '../api/endpoints';
import { useApi } from '../hooks/useApi';
import { rememberOrder } from '../utils/orders';
import { getArea } from '../utils/area';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { navigate, routeHref } from '../router';
import { PointsBadge } from './PointsBadge';
import { pointsEligibleEgp } from '../utils/pointsCaps';
import { useLanguage } from '../context/LanguageContext';

interface CartCheckoutModalProps {
  /** Rendered as a full page (`/cart`, `/checkout`) rather than a popup. */
  asPage?: boolean;
  /** The step the page opens on — the URL decides. */
  initialStep?: 'cart' | 'checkout';
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  asPage = false,
  initialStep = 'cart',
  isOpen,
  onClose,
  cart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
}) => {
  const { isAr } = useLanguage();
  const [step, setStepState] = useState<'cart' | 'checkout' | 'success'>(initialStep);

  // As a page, moving between the basket and the payment is moving between URLs, so back/refresh/links work.
  const setStep = (next: 'cart' | 'checkout' | 'success') => {
    if (asPage && next !== 'success') navigate(routeHref({ checkout: next }));
    setStepState(next);
  };

  useEffect(() => {
    if (asPage) setStepState((current) => (current === 'success' ? current : initialStep));
  }, [asPage, initialStep]);
  
  // Payment Method: 'wallet' (محفظة إلكترونية / فودافون كاش) or 'cod' (الدفع عند الاستلام)
  // Spend loyalty points on the products that accept them (on by default; the buyer may switch it off).
  // Neither points nor the wallet are spent unless the buyer presses for it: someone may want to keep them.
  const [usePoints, setUsePoints] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'cod' | 'online'>('online');
  // With `online`: Paymob's bank-card form or its mobile-wallet page.
  const [onlineChannel, setOnlineChannel] = useState<OnlineChannel>('card');
  const session = useSession();

  // Customer shipping info
  const [customerName, setCustomerName] = useState(session.name ?? '');
  const [customerPhone, setCustomerPhone] = useState(session.phone ?? session.leadPhone ?? '');
  const [addressType, setAddressType] = useState<'home' | 'work' | 'other'>('home');
  // Opens on the area the visitor picked when the app first asked for their location.
  const [customerGovernorate, setCustomerGovernorate] = useState(() => getArea()?.governorate.name ?? '');
  const [customerCity, setCustomerCity] = useState(() => getArea()?.city?.name ?? '');
  const [customerStreet, setCustomerStreet] = useState('');
  const [buildingNumber, setBuildingNumber] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [specialMark, setSpecialMark] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  // The address as one line, smallest to largest — for the WhatsApp summary and the review.
  const customerAddress = [customerStreet, buildingNumber, floorNumber, apartmentNumber, customerCity, customerGovernorate, specialMark].map((part) => part.trim()).filter(Boolean).join('، ');
  // A signed-in member's saved addresses (home, work, other — managed in the profile's Addresses tab). The home one,
  // else the first, opens the form filled in; picking another type fills it from that address. All of it stays editable.
  const saved = useApi(isOpen && session.token ? `saved-addresses:${session.token}` : null, () => fetchAddresses(session.token!));
  const [prefilled, setPrefilled] = useState(false);

  const fillFrom = (address: MemberAddress) => {
    setAddressType(address.type);
    setCustomerGovernorate(address.governorate_name ?? '');
    setCustomerCity(address.city_name ?? '');
    setCustomerStreet(address.street ?? '');
    setBuildingNumber(address.building_number ?? '');
    setFloorNumber(address.floor_number ?? '');
    setApartmentNumber(address.apartment_number ?? '');
    setSpecialMark(address.special_mark ?? '');
  };

  useEffect(() => {
    const list = saved.data;
    if (!list || list.length === 0 || prefilled) return;
    setPrefilled(true);
    fillFrom(list.find((a) => a.type === 'home') ?? list[0]);
  }, [saved.data, prefilled]);

  const chooseAddressType = (value: 'home' | 'work' | 'other') => {
    setAddressType(value);
    const match = saved.data?.find((a) => a.type === value);
    if (match) fillFrom(match);
  };

  const governorates = useApi(isOpen ? 'all-governorates-checkout' : null, (signal) => fetchLocations(signal));

  // Payment proof details
  // The wallet the money comes from defaults to the card owner's own number (their sign-in phone, else the phone typed
  // above); it only stops following that once the buyer types a different one.
  const [typedSenderWallet, setSenderWalletNumber] = useState<string | null>(null);
  const senderWalletNumber = typedSenderWallet ?? (session.phone || customerPhone);
  
  // Copy to clipboard feedbacks
  const [copiedWallet, setCopiedWallet] = useState(false);

  // Generated Order ID
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const orderId = placed?.order_code ?? '';
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const shop = useApi(isOpen ? 'shop-settings' : null, (signal) => fetchShopSettings(signal));
  const [isPlacing, setIsPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptFailed, setReceiptFailed] = useState(false);
  // Online payment: the page the buyer pays on, and what the server last said about it.
  // What the embedded card form (Paymob Pixel) mounts with, and the hosted page as its fallback.
  const [pixel, setPixel] = useState<{ clientSecret: string; publicKey: string; checkoutUrl: string | null; mode?: 'pixel' | 'frame' } | null>(null);
  const [payMessage, setPayMessage] = useState<string | null>(null);
  const [paidOnline, setPaidOnline] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  if (!isOpen) return null;

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCartSavings = cart.reduce(
    (acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity,
    0
  );
  // The website's own shipping rule (its shop settings): a flat fee, free from the threshold up. The server decides for real.
  const walletNumber = shop.data?.wallet_number ?? null;
  // No wallet number set in the backend (/admin/setting): a transfer has nowhere to go, so only pay-on-delivery is offered.
  // The admin's payment switches (/admin/setting) decide what is drawn; before the answer arrives nothing is offered.
  const methods = shop.data?.payment_methods;
  const walletAvailable = !!methods?.wallet && !!walletNumber;
  const codAvailable = !!methods?.cod;
  const whatsappTo = (shop.data?.contact.whatsapp ?? '').replace(/\D/g, '');
  const deliveryPrice = shop.data?.delivery_price ?? 35;
  const freeFrom = shop.data ? shop.data.free_delivery_threshold : 500;
  const shippingFee = freeFrom !== null && totalCartPrice >= freeFrom ? 0 : deliveryPrice;
  // Pay-on-delivery fee from the admin; 0 means nothing is shown anywhere.
  const codFee = paymentMethod === 'cod' ? shop.data?.cod_fee ?? 0 : 0;
  const cardAvailable = !!methods?.online_card;
  const onlineWalletAvailable = !!methods?.online_wallet;
  const onlineAvailable = cardAvailable || onlineWalletAvailable;
  const remainingForFree = freeFrom !== null && shippingFee > 0 ? Math.max(0, freeFrom - totalCartPrice) : 0;
  // Loyalty points cut the price of the products that accept them, then the wallet pays for ANY product (never delivery): both are
  // estimates while shopping, mirroring the server's rule (whole pounds); the server's figures replace them once the order is placed.
  const loyalty = useLoyalty();
  const pointsRate = loyalty.money?.points_per_egp ?? 0;
  // Only what the backend holds counts: points still waiting on this phone are not the server's yet.
  const pointsHeld = session.token ? Math.max(0, loyalty.total - loyalty.pending) : 0;
  const pointsEligible = pointsEligibleEgp(cart, pointsRate, loyalty.money?.points_max_per_order);
  const orderPointsCap = loyalty.money?.points_max_per_order ?? null;
  const pointsEgpAvailable = pointsRate > 0 ? Math.floor(Math.min(pointsHeld / pointsRate, pointsEligible)) : 0;
  const canUsePoints = pointsEgpAvailable > 0;
  const pointsEgp = placed ? placed.points_amount ?? 0 : usePoints ? pointsEgpAvailable : 0;
  const pointsSpent = placed ? placed.points_used ?? 0 : pointsEgp * pointsRate;
  const walletBalance = session.token ? loyalty.money?.wallet_balance ?? 0 : 0;
  const walletUsable = Math.min(walletBalance, Math.max(0, totalCartPrice - pointsEgp));
  const walletShown = placed ? placed.wallet_amount ?? 0 : useWallet ? walletUsable : 0;
  // An estimate while shopping; once the order is placed the server's figures replace it.
  const finalTotal = placed ? placed.amount_due ?? placed.total_amount : Math.max(0, totalCartPrice + shippingFee + codFee - pointsEgp - walletShown);

  useEffect(() => {
    if (!shop.data) return;
    if (onlineChannel === 'card' && !cardAvailable && onlineWalletAvailable) setOnlineChannel('wallet');
    if (onlineChannel === 'wallet' && !onlineWalletAvailable && cardAvailable) setOnlineChannel('card');
    const ok = { online: onlineAvailable, wallet: walletAvailable, cod: codAvailable };
    if (!ok[paymentMethod]) {
      const first = (['online', 'wallet', 'cod'] as const).find((m) => ok[m]);
      if (first) setPaymentMethod(first);
    }
  }, [walletAvailable, onlineAvailable, codAvailable, shop.data, paymentMethod, cardAvailable, onlineWalletAvailable, onlineChannel]);

  const [pdfBusy, setPdfBusy] = useState(false);

  // The basket (or, once placed, the order with the server's own figures) as a PDF on the device.
  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadInvoicePdf({
        code: placed?.order_code ?? null,
        customer: { name: customerName, phone: customerPhone, address: customerAddress },
        items: cart.map((item) => ({ name: item.product.name, quantity: item.quantity, unit: item.product.price, total: item.product.price * item.quantity })),
        saved: totalCartSavings,
        delivery: placed ? placed.delivery_price : shippingFee,
        total: placed ? placed.total_amount : totalCartPrice + shippingFee + codFee,
        wallet: walletShown,
        due: finalTotal,
        payment: paymentMethod === 'wallet' ? 'تحويل محفظة إلكترونية' : paymentMethod === 'online' ? 'دفع إلكتروني' : 'الدفع عند الاستلام',
        member: totalCartSavings > 0 ? session.cardNumber : null,
      });
    } catch {
      setSubmitError((isAr ? 'تعذر إنشاء ملف PDF، حاول مرة أخرى' : 'Could not create the PDF, please try again'));
    } finally {
      setPdfBusy(false);
    }
  };

  const handleCopyWallet = () => {
    if (walletNumber) navigator.clipboard.writeText(walletNumber);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  // Re-reads the order: the server's signed callback is what decides whether the money arrived.
  const checkPayment = async () => {
    if (!placed) return;
    setPayBusy(true);
    try {
      const fresh = await fetchOrder(placed.order_code);
      if (fresh?.payment_status.value === 'accepted') {
        setPaidOnline(true);
      } else if (fresh?.payment_status.value === 'rejected') {
        // A declined attempt needs a fresh form, not the old one.
        setPixel(null);
        setPayMessage((isAr ? 'لم تتم عملية الدفع. يمكنك المحاولة مرة أخرى.' : 'The payment did not go through. You can try again.'));
      } else {
        setPayMessage((isAr ? 'لم يصل تأكيد الدفع بعد. انتظر لحظات ثم اضغط «تحديث حالة الدفع».' : 'Payment confirmation has not arrived yet. Wait a moment, then press “Refresh payment status”.'));
      }
    } catch (err) {
      setPayMessage((isAr ? 'تعذر التحقق من حالة الدفع الآن.' : 'Could not check the payment status now.'));
      reportClientError('Payment status check failed', err, { order: placed.order_code });
    } finally {
      setPayBusy(false);
    }
  };

  // A new attempt at the gateway (declined card, closed form): a fresh one-hour form for the same order.
  const retryPayment = async () => {
    if (!placed) return;
    setPayBusy(true);
    try {
      const link = await payOrder(placed.order_code, onlineChannel);
      if (link.client_secret && link.public_key) {
        setPixel(onlineChannel === 'wallet' && link.checkout_url
          ? { clientSecret: link.client_secret, publicKey: link.public_key, checkoutUrl: link.checkout_url, mode: 'frame' }
          : { clientSecret: link.client_secret, publicKey: link.public_key, checkoutUrl: link.checkout_url });
        setPayMessage(null);
      } else {
        setPayMessage((isAr ? 'تعذر فتح نموذج الدفع. حاول مرة أخرى.' : 'Could not open the payment form. Please try again.'));
      }
    } catch (err) {
      setPayMessage((isAr ? 'تعذر فتح نموذج الدفع. حاول مرة أخرى.' : 'Could not open the payment form. Please try again.'));
      reportClientError('Payment form could not be reopened', err, { order: placed.order_code });
    } finally {
      setPayBusy(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacing) return;

    setIsPlacing(true);
    setSubmitError(null);
    setReceiptFailed(false);

    // The wallet number the buyer typed travels in the order notes, where the team reconciles transfers.
    const transferNote =
      paymentMethod === 'wallet' ? `محفظة المرسل: ${senderWalletNumber}` : '';

    try {
      const order = await placeOrder(
        {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          addressType,
          governorate: customerGovernorate,
          city: customerCity.trim(),
          street: customerStreet.trim(),
          buildingNumber,
          floorNumber,
          apartmentNumber,
          specialMark,
          notes: [customerNotes.trim(), transferNote].filter(Boolean).join('\n'),
          payment: paymentMethod === 'cod' ? 'cod' : paymentMethod === 'online' ? 'paymob' : 'transfer-wallet',
          paymobChannel: paymentMethod === 'online' ? onlineChannel : undefined,
          membershipNumber: session.cardNumber,
          usePoints: usePoints && canUsePoints,
          useWallet: useWallet && walletUsable > 0,
          items: cart.map((item) => ({ slug: item.product.slug, quantity: item.quantity })),
        },
        session.token,
      );

      if (receiptFile && paymentMethod === 'wallet') {
        await uploadReceipt(order.order_code, receiptFile).catch(() => setReceiptFailed(true));
      }

      // Kept on this device so the order can be followed from "My orders" without logging in.
      rememberOrder({
        code: order.order_code,
        placedAt: new Date().toISOString(),
        total: order.total_amount,
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        summary: cart[0]?.product.name ?? '',
        image: cart[0]?.product.image ?? null,
      });

      setPlaced(order);
      setPixel(order.payment?.client_secret && order.payment.public_key
        ? { clientSecret: order.payment.client_secret, publicKey: order.payment.public_key, checkoutUrl: order.payment.checkout_url, ...(onlineChannel === 'wallet' && order.payment.checkout_url ? { mode: 'frame' as const } : {}) }
        : null);
      setPayMessage(order.payment?.message ?? null);
      setStep('success');
    } catch (err) {
      const errors = err instanceof ApiError ? (err.body?.errors as Record<string, string[]> | undefined) : undefined;
      setSubmitError(
        err instanceof ApiError && err.status === 422
          ? errors ? Object.values(errors).flat()[0] ?? err.message : err.message
          : err instanceof ApiError && err.status === 429
            ? (isAr ? 'محاولات كثيرة، انتظر قليلاً ثم حاول مرة أخرى' : 'Too many attempts, wait a little then try again')
            : (isAr ? 'تعذر تسجيل الطلب، تأكد من اتصالك بالإنترنت وحاول مرة أخرى' : 'Could not place the order, check your connection and try again'),
      );
    } finally {
      setIsPlacing(false);
    }
  };

  const handleSendWhatsAppConfirmation = () => {
    const paymentLabel = paymentMethod === 'wallet'
      ? `تحويل محفظة إلكترونية (فودافون كاش) من رقم: ${senderWalletNumber || 'غير محدد'}`
      : (isAr ? 'الدفع عند الاستلام' : 'Cash on delivery');

    let message = `🛒 *طلب جديد من متجر ديلر - رقم الطلب: #${orderId}*\n\n`;
    message += `👤 *بيانات العميل:*\n`;
    message += `• الاسم: ${customerName}\n`;
    message += `• الهاتف: ${customerPhone}\n`;
    message += `• العنوان: ${customerAddress}\n`;
    if (customerNotes) message += `• ملاحظات: ${customerNotes}\n`;

    message += `\n📦 *المنتجات المطلوبة:*\n`;
    cart.forEach((item, idx) => {
      message += `${idx + 1}. ${item.product.name} (الكمية: ${item.quantity}) - السعر: ${item.product.price * item.quantity} {isAr ? 'ج.م' : 'EGP'} [المتجر: ${item.product.storeName || 'ديلر'}]\n`;
    });

    message += `\n💰 *الحساب المالي:*\n`;
    message += `• الإجمالي بعد خصم كارت ديلر: ${totalCartPrice} ج.م\n`;
    message += `• مصاريف الشحن: ${shippingFee === 0 ? 'مجاناً (عرض ديلر)' : `${shippingFee} ج.م`}\n`;
    message += `• *المبلغ الإجمالي المطلوب تحويله: ${finalTotal} ج.م*\n`;
    message += `• إجمالي التوفير: ${totalCartSavings} ج.م\n\n`;

    message += `💳 *طريقة الدفع المحددة:*\n${paymentLabel}\n\n`;
    message += `يرجى تأكيد استلام الحوالة والبدء في تجهيز وشحن الطلب. شكراً لكم!`;

    if (whatsappTo) window.open(`https://wa.me/${whatsappTo}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className={asPage ? 'animate-in fade-in duration-200' : 'fixed inset-0 z-[999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in'}>
      <div className={asPage ? 'bg-white rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col' : 'bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col'}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                {step === 'cart' && (isAr ? `عربة المشتريات (${totalCartCount} منتجات)` : `Shopping cart (${totalCartCount} items)`)}
                {step === 'checkout' && (isAr ? 'إتمام الشراء والدفع بالتحويل' : 'Checkout and payment by transfer')}
                {step === 'success' && (isAr ? 'تم استلام وتأكيد طلبك بنجاح!' : 'Your order was received and confirmed!')}
              </h2>
              <p className="text-[10px] text-slate-400">
                {step === 'cart' && (isAr ? 'المنتجات التي قمت بتجميعها من المتاجر' : 'The products you collected from the stores')}
                {step === 'checkout' && (isAr ? 'اختر التحويل البنكي أو المحفظة الإلكترونية' : 'Choose bank transfer or e-wallet')}
                {step === 'success' && (isAr ? `رقم مرجع الفاتورة: #${orderId}` : `Invoice reference: #${orderId}`)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 flex-1">
          {/* ================= STEP 1: CART ITEMS ================= */}
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-50 text-[#941946] flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{isAr ? 'عربة المشتريات فارغة حالياً' : 'Your shopping cart is empty'}</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    {isAr ? 'تصفح منتجات البن الفاخر، عسل النحل الطبيعي، وزيت الزيتون البكر وأضف ما تحتاجه للسلة.' : 'Browse the products and add what you need to your cart.'}
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    {isAr ? 'تصفح المنتجات الآن' : 'Browse products now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* List of gathered items */}
                  <div className="space-y-2.5 divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.product.id} className="pt-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                              {item.product.name}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              {item.product.storeName && (
                                <span className="bg-rose-50 text-[#941946] px-1.5 py-0.2 rounded font-medium">
                                  {item.product.storeName}
                                </span>
                              )}
                            </div>
                            <div className="mt-1"><PointsBadge product={item.product} compact /></div>
                            <div className="text-xs font-black text-[#941946] font-mono mt-1">
                              {item.product.price * item.quantity} {isAr ? 'ج.م' : 'EGP'}
                              <span className="text-[10px] text-slate-400 font-sans mr-1">
                                ({item.product.price} {isAr ? 'ج.م للقطعة' : 'EGP each'})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controller */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onUpdateCartQty(item.product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => onUpdateCartQty(item.product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onRemoveFromCart(item.product.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 mr-1"
                            title={isAr ? 'حذف' : 'Remove'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Summary Box */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>{isAr ? 'إجمالي قيمة المنتجات:' : 'Products total:'}</span>
                      <span>{totalCartPrice + totalCartSavings} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                    {totalCartSavings > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>{isAr ? 'خصم وتوفير كارت ديلر:' : 'Deilar card discount:'}</span>
                        <span>-{totalCartSavings} {isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>{isAr ? 'تكلفة الشحن والتوصيل:' : 'Shipping & delivery:'}</span>
                      <span>{shippingFee === 0 ? (isAr ? `مجاناً (لطلبات ${freeFrom} ج.م فأكثر)` : `Free (orders of ${freeFrom} EGP or more)`) : `${shippingFee} ${isAr ? 'ج.م' : 'EGP'}`}</span>
                    </div>
                    {codFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>{isAr ? 'رسوم الدفع عند الاستلام:' : 'Cash on delivery fee:'}</span>
                        <span>{codFee} {isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    )}
                    {canUsePoints && !placed && (
                      <label data-testid="points-toggle" className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-900">
                        <span>{isAr ? `⭐ استخدم نقاط الولاء (${pointsEgpAvailable * pointsRate} نقطة = ${pointsEgpAvailable} ج.م خصم)` : `⭐ Use my loyalty points (${pointsEgpAvailable * pointsRate} points = ${pointsEgpAvailable} EGP off)`}</span>
                        <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="h-4 w-4 accent-amber-600" />
                      </label>
                    )}
                    {orderPointsCap != null && orderPointsCap > 0 && !placed && (
                      <p data-testid="points-order-cap" className="text-[10px] font-bold text-amber-700">{isAr ? `⭐ الحد الأقصى لنقاط الولاء في الطلب الواحد: ${orderPointsCap} نقطة` : `⭐ Most loyalty points one order may use: ${orderPointsCap} points`}</p>
                    )}
                    {walletUsable > 0 && !placed && (
                      <label data-testid="wallet-toggle" className="flex items-center justify-between gap-2 rounded-xl border border-violet-300 bg-violet-50 px-2.5 py-2 text-[11px] font-bold text-violet-900">
                        <span>{isAr ? `👛 ادفع من محفظتي (${walletUsable} ج.م من رصيد ${walletBalance} ج.م)` : `👛 Pay from my wallet (${walletUsable} EGP of ${walletBalance} EGP)`}</span>
                        <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} className="h-4 w-4 accent-violet-600" />
                      </label>
                    )}
                    {pointsEgp > 0 && (
                      <div data-testid="points-line-cart" className="flex justify-between text-amber-800 font-bold">
                        <span>{isAr ? `⭐ خصم نقاط الولاء (${pointsSpent} نقطة):` : `⭐ Loyalty points discount (${pointsSpent} points):`}</span>
                        <span>-{pointsEgp} {isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    )}
                    {walletShown > 0 && (
                      <div data-testid="wallet-line-cart" className="flex justify-between text-violet-800 font-bold">
                        <span>{isAr ? '👛 مدفوع من محفظتك:' : '👛 Paid from your wallet:'}</span>
                        <span>-{walletShown} {isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    )}
                    {remainingForFree > 0 && <p className="text-[10px] text-amber-700 font-bold">{isAr ? `أضف منتجات بـ ${remainingForFree} ج.م لتحصل على توصيل مجاني` : `Add ${remainingForFree} EGP more to get free delivery`}</p>}
                    <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-2 text-sm">
                      <span>{isAr ? 'المبلغ الإجمالي للدفع:' : 'Total to pay:'}</span>
                      <span className="text-[#941946] font-mono">{finalTotal} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  {/* Proceed to Checkout Button */}
                  <button
                    onClick={() => setStep('checkout')}
                    className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] active:scale-[0.99] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>{isAr ? 'متابعة الشراء واختيار طريقة التحويل (بنك / محفظة)' : 'Continue and choose the transfer method (bank / wallet)'}</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ================= STEP 2: CHECKOUT & PAYMENT METHOD ================= */}
          {step === 'checkout' && (
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              {/* Back to Cart link */}
              <button
                type="button"
                onClick={() => setStep('cart')}
                className="text-xs font-bold text-[#941946] hover:underline flex items-center gap-1"
              >
                <span>{isAr ? '← العودة لتعديل المنتجات' : '← Back to edit products'}</span>
              </button>

              {/* Amount to transfer banner */}
              <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-center justify-between">
                <div>
                  {pointsEgp > 0 && <span data-testid="points-line-checkout" className="block text-[10px] text-amber-800 font-bold">{isAr ? `⭐ بعد خصم ${pointsEgp} ج.م من نقاط الولاء (${pointsSpent} نقطة)` : `⭐ After ${pointsEgp} EGP off from loyalty points (${pointsSpent} points)`}</span>}
                  {walletShown > 0 && <span data-testid="wallet-line-checkout" className="block text-[10px] text-violet-800 font-bold">{isAr ? `👛 بعد خصم ${walletShown} ج.م من محفظتك تلقائياً` : `👛 After ${walletShown} EGP is taken from your wallet automatically`}</span>}
                  <span className="text-[10px] text-rose-800 font-bold">{isAr ? 'المطلوب تحويله بالكامل:' : 'Total to transfer:'}</span>
                  <div className="text-base sm:text-lg font-black text-[#941946] font-mono leading-none mt-0.5">
                    {finalTotal} <span className="text-xs font-sans">{isAr ? 'ج.م فقط' : 'EGP only'}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                  {isAr ? 'وفرت' : 'You saved'} +{totalCartSavings} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>

              {/* 
                CRITICAL PAYMENT METHOD SELECTOR:
                "طلب المنتجات الى اتجمعت عن طريق تحويل بنكى او تحويل محفظه"
              */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  {isAr ? 'اختر طريقة التحويل وسداد قيمة المنتجات:' : 'Choose how to pay for the products:'}
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {/* Option A: Mobile Wallet (فودافون كاش ومحافظ الهاتف) */}
                  {walletAvailable && (
                  <div
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethod === 'wallet'
                        ? 'border-[#941946] bg-rose-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-100 text-[#941946] flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{isAr ? 'تحويل محفظة' : 'Wallet transfer'}</h4>
                        <p className="text-[9.5px] text-slate-500">{isAr ? 'فودافون كاش / أورنج / اتصالات / وي' : 'Vodafone Cash / Orange / Etisalat / WE'}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>{isAr ? 'تحويل فوري وسريع' : 'Instant, fast transfer'}</span>
                    </div>
                  </div>
                  )}
                </div>

                {/* Option B: pay the courier */}
                {codAvailable && (
                <div
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-2 ${
                    paymentMethod === 'cod' ? 'border-[#941946] bg-rose-50/50 shadow-xs' : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{isAr ? 'الدفع عند الاستلام' : 'Cash on delivery'}</h4>
                    <p className="text-[9.5px] text-slate-500">{isAr ? 'ادفع للمندوب عند وصول الطلب' : 'Pay the courier when the order arrives'}</p>
                    {(shop.data?.cod_fee ?? 0) > 0 && <p className="text-[9.5px] font-bold text-amber-700">+ {shop.data?.cod_fee} ج.م رسوم {isAr ? 'الدفع عند الاستلام' : 'Cash on delivery'}</p>}
                  </div>
                </div>
                )}

                {/* Option C: pay online with Paymob — its bank-card form, or a mobile wallet (Vodafone Cash…) */}
                {([
                  { channel: 'card' as const, on: cardAvailable, icon: <CreditCard className="w-4 h-4" />, title: (isAr ? 'الدفع بالبطاقة' : 'Pay by card'), note: (isAr ? 'فيزا / ماستركارد / ميزة — دفع آمن عبر Paymob' : 'Visa / Mastercard / Meeza — secure payment via Paymob'), tone: 'bg-indigo-100 text-indigo-700' },
                  { channel: 'wallet' as const, on: onlineWalletAvailable, icon: <Smartphone className="w-4 h-4" />, title: (isAr ? 'الدفع بالمحفظة الإلكترونية' : 'Pay by e-wallet'), note: (isAr ? 'فودافون كاش وباقي المحافظ — دفع آمن عبر Paymob' : 'Vodafone Cash and other wallets — secure payment via Paymob'), tone: 'bg-rose-100 text-[#941946]' },
                ]).map((o) => {
                  const selected = paymentMethod === 'online' && onlineChannel === o.channel;
                  return (
                    <div
                      key={o.channel}
                      aria-disabled={!o.on}
                      onClick={() => { if (!o.on) return; setPaymentMethod('online'); setOnlineChannel(o.channel); }}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-2 ${
                        !o.on ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : selected ? 'border-[#941946] bg-rose-50/50 shadow-xs cursor-pointer' : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${o.tone}`}>{o.icon}</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{o.title}</h4>
                        <p className="text-[9.5px] text-slate-500">{o.on ? o.note : (isAr ? 'غير متاحة حالياً' : 'Not available now')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PAYMENT DETAILS ACCORDING TO SELECTION */}
              {paymentMethod === 'wallet' ? (
                /* WALLET DETAILS */
                <div className="p-3.5 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{isAr ? 'بيانات محفظة التحويل (كاش):' : 'Transfer wallet details (cash):'}</span>
                    <span className="text-[9.5px] font-bold text-[#941946] bg-white px-2 py-0.5 rounded-full border border-rose-200">
                      {isAr ? 'فودافون كاش / إلكتروني' : 'Vodafone Cash / electronic'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'رقم المحفظة لتحويل المبلغ:' : 'Wallet number to transfer to:'}</span>
                      <span dir="ltr" className="text-sm font-black text-slate-900 font-mono tracking-wider">
                        {walletNumber ?? '—'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyWallet}
                      className="px-3 py-1.5 bg-[#941946] hover:bg-[#7b1439] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      {copiedWallet ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isAr ? 'نسخ الرقم' : 'Copy number'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      {isAr ? 'رقم المحفظة التي قمت بالتحويل منها (لتأكيد استلام الحوالة):' : 'The wallet number you transferred from (to confirm we received it):'}
                    </label>
                    <input
                      type="text"
                      required
                      value={senderWalletNumber}
                      onChange={(e) => setSenderWalletNumber(e.target.value)}
                      placeholder={isAr ? 'مثال: 010xxxxxxxx' : 'e.g. 010xxxxxxxx'}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#941946]/20 focus:border-[#941946]"
                    />
                  </div>
                </div>
              ) : paymentMethod === 'online' ? (
                /* PAYING ONLINE WITH PAYMOB */
                <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200 text-[11px] text-indigo-900 leading-relaxed">
                  {onlineChannel === 'wallet'
                    ? (isAr ? 'ستدفع بالمحفظة الإلكترونية (فودافون كاش وغيرها) عبر Paymob بعد تأكيد الطلب. لا حاجة لأي تحويل يدوي ولا لرفع إيصال.' : 'You will pay by e-wallet (Vodafone Cash and others) through Paymob after confirming the order. No manual transfer or receipt upload is needed.')
                    : (isAr ? 'ستدفع بالبطاقة (فيزا / ماستركارد / ميزة) عبر Paymob بعد تأكيد الطلب. بيانات بطاقتك تُدخل لدى Paymob ولا تصل إلى خوادمنا، ولا حاجة لرفع إيصال.' : 'You will pay by card (Visa / Mastercard / Meeza) through Paymob after confirming the order. Your card details are entered at Paymob and never reach our servers; no receipt upload is needed.')}
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
                  {isAr ? 'ستدفع قيمة الطلب للمندوب عند الاستلام. لا حاجة لأي تحويل الآن.' : 'You will pay the courier on delivery. No transfer is needed now.'}
                </div>
              )}

              {paymentMethod === 'wallet' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">{isAr ? 'صورة إيصال التحويل (اختياري - يمكن إرسالها لاحقاً):' : 'Transfer receipt photo (optional — can be sent later):'}</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                    className="w-full text-[11px] text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-white"
                  />
                </div>
              )}

              {/* SHIPPING DETAILS FORM */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#941946]" />
                  <span>{isAr ? 'عنوان التوصيل واستلام المنتجات:' : 'Delivery address:'}</span>
                </span>

                {(() => {
                  const input = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:bg-white focus:border-[#941946]';
                  const label = 'text-[11px] font-bold text-slate-700 block mb-1';
                  const star = <span className="text-rose-500">*</span>;
                  const kinds: ['home' | 'work' | 'other', string][] = [['home', (isAr ? 'المنزل' : 'Home')], ['work', (isAr ? 'العمل' : 'Work')], ['other', (isAr ? 'آخر' : 'Other')]];
                  return (
                    <div className="space-y-2.5">
                      <div>
                        <label className={label}>{isAr ? 'الاسم بالكامل' : 'Full name'} {star}</label>
                        <input type="text" required minLength={3} autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={isAr ? 'الاسم الذي نسأل عنه عند التوصيل' : 'The name we ask for on delivery'} className={input} />
                      </div>

                      <div>
                        <label className={label}>{isAr ? 'رقم الهاتف' : 'Phone number'} {star}</label>
                        <input type="tel" required inputMode="tel" dir="ltr" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01X XXXX XXXX" className={`${input} font-mono text-right`} />
                      </div>


                      <div>
                        <span className={label}>{isAr ? 'نوع العنوان' : 'Address type'}</span>
                        <div className="flex flex-wrap gap-2">
                          {kinds.map(([value, text]) => (
                            <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${addressType === value ? 'border-[#941946] bg-rose-50 text-[#941946]' : 'border-slate-200 text-slate-500 hover:border-[#941946]/40'}`}>
                              <input type="radio" name="address_type" value={value} checked={addressType === value} onChange={() => chooseAddressType(value)} className="accent-[#941946]" />
                              {text}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={label}>{isAr ? 'المحافظة' : 'Governorate'} {star}</label>
                          <select required value={customerGovernorate} onChange={(e) => setCustomerGovernorate(e.target.value)} className={input}>
                            <option value="">{isAr ? 'مثال: القاهرة' : 'e.g. Cairo'}</option>
                            {(governorates.data ?? []).map((g) => (
                              <option key={g.id} value={g.name}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={label}>{isAr ? 'المدينة' : 'City'} {star}</label>
                          <input type="text" required autoComplete="address-level2" value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} placeholder={isAr ? 'مثال: مدينة نصر' : 'e.g. Nasr City'} className={input} />
                        </div>
                      </div>

                      <div>
                        <label className={label}>{isAr ? 'الشارع' : 'Street'} {star}</label>
                        <input type="text" required autoComplete="street-address" value={customerStreet} onChange={(e) => setCustomerStreet(e.target.value)} placeholder={isAr ? 'اسم الشارع' : 'Street name'} className={input} />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className={label}>{isAr ? 'رقم العمارة' : 'Building number'}</label>
                          <input type="text" inputMode="numeric" value={buildingNumber} onChange={(e) => setBuildingNumber(e.target.value)} placeholder={isAr ? 'اختياري' : 'Optional'} className={input} />
                        </div>
                        <div>
                          <label className={label}>{isAr ? 'الدور' : 'Floor'}</label>
                          <input type="text" value={floorNumber} onChange={(e) => setFloorNumber(e.target.value)} placeholder={isAr ? 'اختياري' : 'Optional'} className={input} />
                        </div>
                        <div>
                          <label className={label}>{isAr ? 'رقم الشقة' : 'Apartment number'}</label>
                          <input type="text" value={apartmentNumber} onChange={(e) => setApartmentNumber(e.target.value)} placeholder={isAr ? 'اختياري' : 'Optional'} className={input} />
                        </div>
                      </div>

                      <div>
                        <label className={label}>{isAr ? 'علامة مميزة' : 'Landmark'}</label>
                        <input type="text" value={specialMark} onChange={(e) => setSpecialMark(e.target.value)} placeholder={isAr ? 'اختياري — جوار الصيدلية مثلًا' : 'Optional — e.g. next to the pharmacy'} className={input} />
                      </div>

                      <div>
                        <label className={label}>{isAr ? 'ملاحظات' : 'Notes'}</label>
                        <textarea rows={2} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder={isAr ? 'اختياري — موعد توصيل مناسب لك مثلًا' : 'Optional — e.g. a delivery time that suits you'} className={input} />
                      </div>
                    </div>
                  );
                })()}
              </div>

              {submitError && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2" role="alert">
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfBusy || cart.length === 0}
                className="w-full py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-300 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {pdfBusy ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isAr ? 'تحميل ملخص الطلب PDF' : 'Download order summary PDF'}</span>
              </button>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPlacing}
                className="disabled:opacity-60 w-full py-3 bg-[#941946] hover:bg-[#7b1439] active:scale-[0.99] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isPlacing ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{isPlacing ? (isAr ? 'جاري تسجيل الطلب...' : 'Placing the order...') : paymentMethod === 'cod' ? (isAr ? 'تأكيد الطلب' : 'Confirm order') : paymentMethod === 'online' ? (isAr ? 'تأكيد الطلب والدفع الآن' : 'Confirm order and pay now') : (isAr ? 'تأكيد تسجيل الطلب وإرسال إشعار التحويل' : 'Confirm the order and send the transfer notice')}</span>
              </button>
            </form>
          )}

          {/* ================= STEP 3: ORDER SUCCESS ================= */}
          {step === 'success' && (
            <div className="text-center py-5 space-y-4 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {isAr ? 'تم تسجيل طلبك بنجاح' : 'Your order was placed successfully'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {isAr ? 'شكراً لتسوقك من متاجر ديلر الطبيعية' : 'Thank you for shopping at Deilar stores'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'رقم الطلب:' : 'Order number:'} <span className="font-mono font-bold text-slate-800">#{orderId}</span>
                </p>
              </div>

              {/* Order summary pill */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-right text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAr ? 'العميل المستلم:' : 'Recipient:'}</span>
                  <span className="font-bold text-slate-800">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAr ? 'العنوان:' : 'Address:'}</span>
                  <span className="font-bold text-slate-800">{customerAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAr ? 'طريقة السداد:' : 'Payment method:'}</span>
                  <span className="font-bold text-[#941946]">
                    {paymentMethod === 'wallet' ? (isAr ? 'تحويل محفظة إلكترونية' : 'E-wallet transfer') : paymentMethod === 'online' ? (isAr ? 'دفع إلكتروني' : 'Online payment') : (isAr ? 'الدفع عند الاستلام' : 'Cash on delivery')}
                  </span>
                </div>
                {placed && placed.cod_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'رسوم الدفع عند الاستلام:' : 'Cash on delivery fee:'}</span>
                    <span className="font-bold text-slate-800 font-mono">{placed.cod_fee} {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}
                {placed && placed.delivery_price > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'مصاريف الشحن:' : 'Shipping:'}</span>
                    <span className="font-bold text-slate-800 font-mono">{placed.delivery_price} {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}
                {placed && placed.delivery_price === 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{isAr ? 'مصاريف الشحن:' : 'Shipping:'}</span>
                    <span className="font-bold text-emerald-700">{isAr ? 'مجاناً' : 'Free'}</span>
                  </div>
                )}
                {walletShown > 0 && (
                  <div data-testid="wallet-line" className="flex justify-between text-violet-800">
                    <span>👛 {placed ? (isAr ? 'دفعت من المحفظة:' : 'Paid from the wallet:') : (isAr ? 'هيتخصم تلقائياً من محفظتك:' : 'Taken automatically from your wallet:')}</span>
                    <span className="font-bold font-mono">- {walletShown} {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                  <span>{paymentMethod === 'cod' ? (isAr ? 'المبلغ المطلوب عند الاستلام:' : 'Amount due on delivery:') : paymentMethod === 'online' ? (isAr ? 'المبلغ المطلوب دفعه:' : 'Amount to pay:') : (isAr ? 'المبلغ المطلوب تحويله:' : 'Amount to transfer:')}</span>
                  <span className="text-emerald-700 font-mono">{finalTotal} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              {paymentMethod === 'online' && (
                <div className="p-3 rounded-2xl border border-indigo-200 bg-indigo-50 text-right space-y-3">
                  {paidOnline ? (
                    <p className="text-xs font-bold text-emerald-700">{isAr ? 'تم استلام الدفع بنجاح ✓' : 'Payment received ✓'}</p>
                  ) : (
                    <>
                      {pixel ? (
                        // The card form is Paymob's, shown here: card details never reach our code or server.
                        pixel.mode === 'frame' && pixel.checkoutUrl ? (
                          <PaymobFrame
                            url={pixel.checkoutUrl}
                            check={async () => (placed ? (await fetchOrder(placed.order_code))?.payment_status.value === 'accepted' : false)}
                            onComplete={checkPayment}
                          />
                        ) : (
                          <PaymobPixel publicKey={pixel.publicKey} clientSecret={pixel.clientSecret} fallbackUrl={pixel.checkoutUrl} onComplete={checkPayment} />
                        )
                      ) : (
                        <p className="text-xs font-bold text-indigo-900">{payMessage ?? (isAr ? 'تعذر فتح نموذج الدفع. حاول مرة أخرى.' : 'Could not open the payment form. Please try again.')}</p>
                      )}
                      {payMessage && pixel && <p className="text-[11px] font-bold text-indigo-900">{payMessage}</p>}
                      <div className="flex gap-2">
                        {!pixel && (
                          <button
                            type="button"
                            disabled={payBusy}
                            onClick={retryPayment}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>{isAr ? 'حاول الدفع مرة أخرى' : 'Try paying again'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={payBusy || !placed}
                          onClick={checkPayment}
                          className="flex-1 py-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 border border-indigo-300 text-indigo-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>{isAr ? 'تحديث حالة الدفع' : 'Refresh payment status'}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {receiptFailed && (
                <p className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {isAr ? 'تم تسجيل طلبك لكن تعذر رفع صورة الإيصال. أرسلها لنا عبر واتساب برقم الطلب.' : 'Your order was placed but the receipt photo could not be uploaded. Send it to us on WhatsApp with the order number.'}
                </p>
              )}

              {/* Instant WhatsApp Notification Button */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSendWhatsAppConfirmation}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{paymentMethod === 'cod' ? (isAr ? 'إرسال تفاصيل الطلب عبر واتساب' : 'Send order details on WhatsApp') : (isAr ? 'إرسال تفاصيل الطلب وإشعار التحويل عبر واتساب فوراً' : 'Send order details and transfer notice on WhatsApp now')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfBusy}
                  className="w-full py-3 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-300 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {pdfBusy ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isAr ? 'تحميل الفاتورة PDF' : 'Download invoice PDF'}</span>
                </button>

                <button
                  onClick={() => {
                    const code = placed?.order_code;
                    onClearCart();
                    setPlaced(null);
                    setStep('cart');
                    setReceiptFile(null);
                    if (!asPage) onClose();
                    if (code) navigate(routeHref({ orders: { code } }));
                  }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-colors"
                >
                  {isAr ? 'تتبع طلبي' : 'Track my order'}
                </button>

                <button
                  onClick={() => {
                    onClearCart();
                    setPlaced(null);
                    setStep('cart');
                    setReceiptFile(null);
                    onClose();
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  {isAr ? 'العودة للمتجر' : 'Back to the store'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
