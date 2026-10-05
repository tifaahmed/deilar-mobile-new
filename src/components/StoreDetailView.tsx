import React, { useState } from 'react';
import { 
  ArrowRight, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Percent, 
  Star, 
  Check, 
  ShoppingBag, 
  Package, 
  ShoppingCart,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  X
} from 'lucide-react';
import { Store, Product, CartItem } from '../types';

interface StoreDetailViewProps {
  store: Store;
  products: Product[];
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  onOpenCart?: () => void;
}

export const StoreDetailView: React.FC<StoreDetailViewProps> = ({
  store,
  products,
  onBack,
  onAddToCart,
  cart,
  onOpenCart,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const storeProducts = products.filter((p) => p.storeId === store.id);
  const hasProducts = storeProducts.length > 0;
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `مرحباً ${store.name}، أنا من مشتركي كرت ديلار الطبي وأرغب في الاستفسار عن منتجاتكم والعروض المتاحة.`
    );
    window.open(`https://wa.me/${store.whatsapp || '201020709993'}?text=${text}`, '_blank');
  };

  const handleAdd = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(prod);
    setAddedNotice(prod.name);
    setTimeout(() => setAddedNotice(null), 2000);
  };

  return (
    <div className="space-y-4 pb-28 pt-1 animate-in fade-in duration-200">
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#941946] hover:bg-rose-50/50 rounded-xl transition-all"
        >
          <ArrowRight className="w-4 h-4 text-[#941946]" />
          <span>الرجوع إلى المتاجر</span>
        </button>

        {onOpenCart && (
          <button
            onClick={onOpenCart}
            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
            <span>السلة</span>
            {totalCartCount > 0 && (
              <span className="bg-[#941946] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {totalCartCount}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Added to cart toast */}
      {addedNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>تمت إضافة «{addedNotice}» إلى السلة!</span>
        </div>
      )}

      {/* 2. Hero Cover & Store Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white shadow-md border border-slate-200/50">
        <div className="relative aspect-[2.2/1] sm:aspect-[2.6/1] w-full overflow-hidden">
          <img
            src={store.image}
            alt={store.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>

        {/* Floating Top Badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="px-2.5 py-1 bg-[#941946] text-white text-[11px] font-black rounded-xl shadow-xs">
            {store.categoryAr}
          </span>
          <div className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-xs">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{store.rating}</span>
          </div>
        </div>

        {/* Store Title & Description on Cover */}
        <div className="absolute bottom-3 right-4 left-4 text-white">
          <h1 className="text-lg sm:text-xl font-black text-white drop-shadow-md">
            {store.name}
          </h1>
          <p className="text-[11px] text-slate-300 font-mono mt-0.5">{store.nameEn}</p>
        </div>
      </div>

      {/* 3. Discount Privilege & Quick Contact Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        <div className="p-3 bg-gradient-to-r from-rose-50 to-amber-50/60 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#941946] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              %
            </div>
            <div>
              <p className="text-xs font-black text-[#941946]">{store.discount}</p>
              <p className="text-[10.5px] text-slate-600 font-medium">خصم معتمد وحصري لحاملي كرت ديلار الطبي</p>
            </div>
          </div>
        </div>

        {/* Quick Contact Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={`tel:${store.phone}`}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>اتصال هاتفياً</span>
          </a>

          <button
            onClick={handleWhatsApp}
            className="py-2.5 px-3 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>محادثة واتساب</span>
          </button>
        </div>
      </div>

      {/* 4. Store Description & Branches Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5 text-xs text-slate-700 leading-relaxed">
        <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#941946]" />
          <span>عن المتجر والفروع المعتمدة</span>
        </h2>
        <p className="text-slate-600 leading-relaxed">{store.description}</p>
        
        <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-[#941946] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">الفروع المتاحة: </span>
            <span>{store.branches}</span>
          </div>
        </div>
      </div>

      {/* 5. Products Section of this Store */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#941946]" />
            <span>منتجات المتجر المتاحة للطلب</span>
          </h2>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {storeProducts.length} منتج
          </span>
        </div>

        {hasProducts ? (
          /* 2 per row grid matching the user's preferred layout */
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {storeProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Product Photo */}
                  <div className="relative aspect-[1.15/1] overflow-hidden bg-slate-100">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-[#941946] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                      وفر {prod.discountPercentage}%
                    </div>
                    {prod.weight && (
                      <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        {prod.weight}
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-[#941946] transition-colors leading-snug">
                      {prod.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{prod.categoryAr}</p>
                    
                    <div className="flex items-baseline gap-1.5 pt-0.5">
                      <span className="text-xs font-black text-[#941946] font-mono">
                        {prod.price} <span className="text-[9px] font-sans">ج.م</span>
                      </span>
                      <span className="text-[10px] text-slate-400 line-through">
                        {prod.originalPrice} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 pt-0">
                  <button
                    onClick={(e) => handleAdd(prod, e)}
                    className="w-full py-2 bg-slate-900 hover:bg-[#941946] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>أضف للسلة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* When store does not have online products */
          <div className="p-5 bg-white border border-amber-200/80 rounded-3xl text-center space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-amber-950">
              لا توجد منتجات معروضة للشراء أونلاين حالياً لهذا المتجر
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              يمكنك الاستفادة من خصم كرت ديلار الطبي ({store.discount}) مباشرة عند زيارة أي من فروع المتجر بإبراز كرتك الرقمي من التطبيق.
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              <a
                href={`tel:${store.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال بفرع المتجر ({store.phone})</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Modal if user taps a product to view ingredients & details */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-4 space-y-3.5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  {selectedProduct.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedProduct.nameEn}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{selectedProduct.description}</p>

            {selectedProduct.features && selectedProduct.features.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-slate-800">أبرز المواصفات والجودة:</p>
                {selectedProduct.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-rose-50/70 rounded-2xl border border-rose-200/70">
              <div>
                <span className="text-[11px] text-slate-500 line-through">
                  {selectedProduct.originalPrice} ج.م
                </span>
                <div className="text-lg font-black text-[#941946] font-mono">
                  {selectedProduct.price} <span className="text-xs font-sans">ج.م</span>
                </div>
              </div>

              <button
                onClick={() => {
                  handleAdd(selectedProduct);
                  setSelectedProduct(null);
                }}
                className="px-4 py-2 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>إضافة للسلة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
