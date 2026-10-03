import React, { useState } from 'react';
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
  ShoppingBag
} from 'lucide-react';
import { Product, CartItem } from '../types';

interface CartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  
  // Payment Method: 'wallet' (محفظة إلكترونية / فودافون كاش) or 'bank' (تحويل بنكي / إنستاباي)
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bank'>('wallet');

  // Customer shipping info
  const [customerName, setCustomerName] = useState('مصطفى مرسي');
  const [customerPhone, setCustomerPhone] = useState('01020709993');
  const [customerCity, setCustomerCity] = useState('القاهرة');
  const [customerAddress, setCustomerAddress] = useState('المعادي - شارع النصر');
  const [customerNotes, setCustomerNotes] = useState('');

  // Payment proof details
  const [senderWalletNumber, setSenderWalletNumber] = useState('');
  const [bankReferenceNumber, setBankReferenceNumber] = useState('');
  
  // Copy to clipboard feedbacks
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedInstapay, setCopiedInstapay] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  // Generated Order ID
  const [orderId, setOrderId] = useState('');

  if (!isOpen) return null;

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCartSavings = cart.reduce(
    (acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity,
    0
  );
  const shippingFee = totalCartPrice > 500 ? 0 : 35; // Free shipping over 500 EGP
  const finalTotal = totalCartPrice + shippingFee;

  const handleCopyWallet = () => {
    navigator.clipboard.writeText('01020709993');
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleCopyInstapay = () => {
    navigator.clipboard.writeText('deilar@instapay');
    setCopiedInstapay(true);
    setTimeout(() => setCopiedInstapay(false), 2000);
  };

  const handleCopyIban = () => {
    navigator.clipboard.writeText('EG5400020001000001020709993');
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    setOrderId(newOrderId);
    setStep('success');
  };

  const handleSendWhatsAppConfirmation = () => {
    const paymentLabel = paymentMethod === 'wallet' 
      ? `تحويل محفظة إلكترونية (فودافون كاش) من رقم: ${senderWalletNumber || 'غير محدد'}`
      : `تحويل بنكي / إنستاباي - مرجع الحوالة: ${bankReferenceNumber || 'غير محدد'}`;

    let message = `🛒 *طلب جديد من متجر ديلار - رقم الطلب: #${orderId}*\n\n`;
    message += `👤 *بيانات العميل:*\n`;
    message += `• الاسم: ${customerName}\n`;
    message += `• الهاتف: ${customerPhone}\n`;
    message += `• العنوان: ${customerCity} - ${customerAddress}\n`;
    if (customerNotes) message += `• ملاحظات: ${customerNotes}\n`;

    message += `\n📦 *المنتجات المطلوبة:*\n`;
    cart.forEach((item, idx) => {
      message += `${idx + 1}. ${item.product.name} (الكمية: ${item.quantity}) - السعر: ${item.product.price * item.quantity} ج.م [المتجر: ${item.product.storeName || 'ديلار'}]\n`;
    });

    message += `\n💰 *الحساب المالي:*\n`;
    message += `• الإجمالي بعد خصم كرت ديلار: ${totalCartPrice} ج.م\n`;
    message += `• مصاريف الشحن: ${shippingFee === 0 ? 'مجاناً (عرض ديلار)' : `${shippingFee} ج.م`}\n`;
    message += `• *المبلغ الإجمالي المطلوب تحويله: ${finalTotal} ج.م*\n`;
    message += `• إجمالي التوفير: ${totalCartSavings} ج.م\n\n`;

    message += `💳 *طريقة الدفع المحددة:*\n${paymentLabel}\n\n`;
    message += `يرجى تأكيد استلام الحوالة والبدء في تجهيز وشحن الطلب. شكراً لكم!`;

    window.open(`https://wa.me/201020709993?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 leading-tight">
                {step === 'cart' && `عربة المشتريات (${totalCartCount} منتجات)`}
                {step === 'checkout' && 'إتمام الشراء والدفع بالتحويل'}
                {step === 'success' && 'تم استلام وتأكيد طلبك بنجاح!'}
              </h2>
              <p className="text-[10px] text-slate-400">
                {step === 'cart' && 'المنتجات التي قمت بتجميعها من المتاجر'}
                {step === 'checkout' && 'اختر التحويل البنكي أو المحفظة الإلكترونية'}
                {step === 'success' && `رقم مرجع الفاتورة: #${orderId}`}
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
                  <h3 className="text-sm font-bold text-slate-800">عربة المشتريات فارغة حالياً</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    تصفح منتجات البن الفاخر، عسل النحل الطبيعي، وزيت الزيتون البكر وأضف ما تحتاجه للسلة.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    تصفح المنتجات الآن
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
                              {item.product.weight && <span>• {item.product.weight}</span>}
                            </div>
                            <div className="text-xs font-black text-[#941946] font-mono mt-1">
                              {item.product.price * item.quantity} ج.م
                              <span className="text-[10px] text-slate-400 font-sans mr-1">
                                ({item.product.price} ج.م للقطعة)
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
                            title="حذف"
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
                      <span>إجمالي قيمة المنتجات:</span>
                      <span>{totalCartPrice + totalCartSavings} ج.م</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>خصم وتوفير كرت ديلار:</span>
                      <span>-{totalCartSavings} ج.م</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>تكلفة الشحن والتوصيل:</span>
                      <span>{shippingFee === 0 ? 'مجاناً (لطلبات فوق 500 ج.م)' : `${shippingFee} ج.م`}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-black border-t border-slate-200 pt-2 text-sm">
                      <span>المبلغ الإجمالي للدفع:</span>
                      <span className="text-[#941946] font-mono">{finalTotal} ج.م</span>
                    </div>
                  </div>

                  {/* Proceed to Checkout Button */}
                  <button
                    onClick={() => setStep('checkout')}
                    className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] active:scale-[0.99] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>متابعة الشراء واختيار طريقة التحويل (بنك / محفظة)</span>
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
                <span>← العودة لتعديل المنتجات</span>
              </button>

              {/* Amount to transfer banner */}
              <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-rose-800 font-bold">المطلوب تحويله بالكامل:</span>
                  <div className="text-base sm:text-lg font-black text-[#941946] font-mono leading-none mt-0.5">
                    {finalTotal} <span className="text-xs font-sans">ج.م فقط</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                  وفرت +{totalCartSavings} ج.م
                </span>
              </div>

              {/* 
                CRITICAL PAYMENT METHOD SELECTOR:
                "طلب المنتجات الى اتجمعت عن طريق تحويل بنكى او تحويل محفظه"
              */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  اختر طريقة التحويل وسداد قيمة المنتجات:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {/* Option A: Mobile Wallet (فودافون كاش ومحافظ الهاتف) */}
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
                        <h4 className="text-xs font-bold text-slate-900">تحويل محفظة</h4>
                        <p className="text-[9.5px] text-slate-500">فودافون كاش / أورنج / اتصالات / وي</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>تحويل فوري وسريع</span>
                    </div>
                  </div>

                  {/* Option B: Bank Transfer / InstaPay */}
                  <div
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethod === 'bank'
                        ? 'border-[#941946] bg-rose-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">تحويل بنكي</h4>
                        <p className="text-[9.5px] text-slate-500">إنستاباي InstaPay / حساب بنكي</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>حساب رسمي معتمد</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAYMENT DETAILS ACCORDING TO SELECTION */}
              {paymentMethod === 'wallet' ? (
                /* WALLET DETAILS */
                <div className="p-3.5 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">بيانات محفظة التحويل (كاش):</span>
                    <span className="text-[9.5px] font-bold text-[#941946] bg-white px-2 py-0.5 rounded-full border border-rose-200">
                      فودافون كاش / إلكتروني
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-rose-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">رقم المحفظة لتحويل المبلغ:</span>
                      <span className="text-sm font-black text-slate-900 font-mono tracking-wider">
                        01020709993
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
                          <span>تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>نسخ الرقم</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      رقم المحفظة التي قمت بالتحويل منها (لتأكيد استلام الحوالة):
                    </label>
                    <input
                      type="text"
                      required
                      value={senderWalletNumber}
                      onChange={(e) => setSenderWalletNumber(e.target.value)}
                      placeholder="مثال: 010xxxxxxxx"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#941946]/20 focus:border-[#941946]"
                    />
                  </div>
                </div>
              ) : (
                /* BANK / INSTAPAY DETAILS */
                <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">بيانات التحويل البنكي وإنستاباي:</span>
                    <span className="text-[9.5px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                      معتمد رسمي
                    </span>
                  </div>

                  {/* InstaPay Handle */}
                  <div className="bg-white p-2.5 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">معرف إنستاباي السريع (InstaPay):</span>
                      <span className="text-xs font-black text-blue-900 font-mono">deilar@instapay</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyInstapay}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      {copiedInstapay ? 'تم النسخ!' : 'نسخ المعرف'}
                    </button>
                  </div>

                  {/* Bank Account */}
                  <div className="bg-white p-2.5 rounded-xl border border-blue-200 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">اسم البنك:</span>
                      <span className="font-bold text-slate-800">البنك الأهلي المصري (NBE)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">اسم الحساب:</span>
                      <span className="font-bold text-slate-800">شركة ديلار للرعاية الصحية</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-slate-500">رقم الحساب / IBAN:</span>
                      <button
                        type="button"
                        onClick={handleCopyIban}
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedIban ? 'تم النسخ!' : 'نسخ الآيبان IBAN'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      رقم مرجع التحويل أو اسم صاحب الحساب المحول منه:
                    </label>
                    <input
                      type="text"
                      required
                      value={bankReferenceNumber}
                      onChange={(e) => setBankReferenceNumber(e.target.value)}
                      placeholder="مثال: حوالة إنستاباي رقم 94812 / اسم المحول"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* SHIPPING DETAILS FORM */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#941946]" />
                  <span>عنوان التوصيل واستلام المنتجات:</span>
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">الاسم ثلاثي:</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">رقم الموبايل / واتساب:</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">المحافظة:</label>
                    <select
                      value={customerCity}
                      onChange={(e) => setCustomerCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:bg-white"
                    >
                      <option value="القاهرة">القاهرة</option>
                      <option value="الجيزة">الجيزة</option>
                      <option value="الإسكندرية">الإسكندرية</option>
                      <option value="القليوبية">القليوبية</option>
                      <option value="الشرقية">الشرقية</option>
                      <option value="الدقهلية">الدقهلية</option>
                      <option value="محافظة أخرى">محافظة أخرى</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 block mb-0.5">العنوان بالتفصيل:</label>
                    <input
                      type="text"
                      required
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="اسم الشارع، رقم العمارة، الشقة"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] active:scale-[0.99] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد تسجيل الطلب وإرسال إشعار التحويل</span>
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
                  تم تسجيل طلبك بنجاح
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  شكراً لتسوقك من متاجر ديلار الطبيعية
                </h3>
                <p className="text-xs text-slate-500">
                  رقم الطلب: <span className="font-mono font-bold text-slate-800">#{orderId}</span>
                </p>
              </div>

              {/* Order summary pill */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-right text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">العميل المستلم:</span>
                  <span className="font-bold text-slate-800">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">العنوان:</span>
                  <span className="font-bold text-slate-800">{customerCity} - {customerAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">طريقة السداد:</span>
                  <span className="font-bold text-[#941946]">
                    {paymentMethod === 'wallet' ? 'تحويل محفظة إلكترونية' : 'تحويل بنكي / إنستاباي'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                  <span>المبلغ المدفوع:</span>
                  <span className="text-emerald-700 font-mono">{finalTotal} ج.م</span>
                </div>
              </div>

              {/* Instant WhatsApp Notification Button */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleSendWhatsAppConfirmation}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>إرسال تفاصيل الطلب وإشعار التحويل عبر واتساب فوراً</span>
                </button>

                <button
                  onClick={() => {
                    onClearCart();
                    onClose();
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  العودة للمتجر
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
