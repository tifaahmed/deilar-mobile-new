import React from 'react';
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Percent, 
  Star, 
  Check, 
  ShoppingBag, 
  Package, 
  ExternalLink,
  ChevronLeft,
  X,
  AlertCircle
} from 'lucide-react';
import { Store, Product, CartItem } from '../types';

interface StoreDetailModalProps {
  store: Store;
  products: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  store,
  products,
  onClose,
  onSelectProduct,
  onAddToCart,
  cart,
}) => {
  const storeProducts = products.filter((p) => p.storeId === store.id);
  const hasProducts = storeProducts.length > 0;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `مرحباً ${store.name}، أنا من حاملي كرت ديلار الطبي وأرغب في الاستفسار عن منتجاتكم والعروض المتاحة.`
    );
    window.open(`https://wa.me/${store.whatsapp || '201020709993'}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Top Cover with Store Visual */}
        <div className="relative aspect-[2/1] sm:aspect-[2.2/1] bg-slate-900 overflow-hidden shrink-0">
          <img
            src={store.image}
            alt={store.name}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center text-xs font-bold backdrop-blur-md shadow-md transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Category & Rating Badges */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 bg-[#941946] text-white text-[10px] font-black rounded-lg shadow-sm">
              {store.categoryAr}
            </span>
            <div className="px-2 py-0.5 bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{store.rating}</span>
            </div>
          </div>

          {/* Store Info on Cover */}
          <div className="absolute bottom-3 right-3 left-3 text-white">
            <h2 className="text-base sm:text-lg font-black text-white drop-shadow-md">
              {store.name}
            </h2>
            <p className="text-[10px] text-slate-300 font-mono">{store.nameEn}</p>
          </div>
        </div>

        {/* Store Details Body */}
        <div className="p-4 space-y-3.5 flex-1">
          {/* Discount & Benefits Ribbon */}
          <div className="p-3 bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#941946] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                %
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#941946]">{store.discount}</p>
                <p className="text-[10px] text-slate-500">ميزة حصرية معتمدة لمشتركي ديلار</p>
              </div>
            </div>

            <button
              onClick={handleWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>تواصل</span>
            </button>
          </div>

          {/* Store Description & Branches */}
          <div className="space-y-1.5 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <p>{store.description}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 font-medium">
              <MapPin className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span>{store.branches}</span>
            </div>
          </div>

          {/* Related Products from this Store */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#941946]" />
                <span>المنتجات المعروضة لدى هذا المتجر</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                {storeProducts.length} منتج
              </span>
            </div>

            {hasProducts ? (
              /* 2 products per row grid as requested! */
              <div className="grid grid-cols-2 gap-2.5">
                {storeProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => onSelectProduct(prod)}
                    className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      {/* Heavy visual photo emphasis */}
                      <div className="relative aspect-[1.1/1] overflow-hidden bg-slate-100">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-1.5 right-1.5 bg-[#941946] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                          وفر {prod.discountPercentage}%
                        </div>
                        {prod.weight && (
                          <div className="absolute bottom-1.5 right-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[8.5px] font-bold px-1.5 py-0.2 rounded">
                            {prod.weight}
                          </div>
                        )}
                      </div>

                      <div className="p-2 space-y-1">
                        <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1 group-hover:text-[#941946] transition-colors">
                          {prod.name}
                        </h4>
                        <div className="text-[10px] text-slate-400 line-through">
                          {prod.originalPrice} ج.م
                        </div>
                        <div className="text-xs font-black text-[#941946] font-mono leading-none">
                          {prod.price} <span className="text-[9px] font-sans">ج.م</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCart(prod);
                        }}
                        className="w-full py-1.5 bg-slate-900 hover:bg-[#941946] text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>أضف للسلة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Case: Store without products online ("بس عادى فى متاجر ممكن ميكونش ليها منتجات") */
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <h4 className="text-xs font-bold text-amber-900">
                  لا توجد منتجات معروضة للشراء أونلاين حالياً لهذا المتجر
                </h4>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يمكنك الاستفادة من خصم كرت ديلار الطبي ({store.discount}) مباشرة عند زيارة أي فرع من فروع المتجر بإبراز كرتك الرقمي.
                </p>
                <div className="pt-1">
                  <a
                    href={`tel:${store.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بفرع المتجر ({store.phone})</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
