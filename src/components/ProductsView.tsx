/**
 * ==============================================================================
 * 📌 DEILAR PRODUCTS CATALOG VIEW (ProductsView.tsx)
 * ==============================================================================
 * 
 * 🤖 AI / CLAUDE DEVELOPER GUIDE:
 * This component renders the rich, image-heavy product catalog for coffee, honey, and olive oil:
 * 
 * 1. 🖼️ Grid Layout (2 per row):
 *    - Strictly rendered with `grid grid-cols-2 gap-2.5 sm:gap-3.5`.
 *    - Image-centric with square aspect ratio (`aspect-square`) for maximum visual appeal.
 * 
 * 2. 🔗 Product-to-Store Linkage:
 *    - Each product card contains a pill with the parent store's name (e.g. `[مناحل الشفاء ←]`).
 *    - Clicking the store badge opens that store's `<StoreDetailModal />` showcasing all its products.
 * 
 * 3. 🛒 Cart Integration:
 *    - Triggers `<CartCheckoutModal />` which handles both Bank Transfer and Mobile Wallet transfers.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  Search, 
  ShoppingBag, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Star, 
  Check, 
  ExternalLink, 
  Sparkles, 
  CreditCard, 
  ShieldCheck, 
  Package, 
  Activity, 
  Heart,
  ChevronLeft,
  X,
  PhoneCall,
  MessageCircle,
  Truck,
  RotateCcw,
  Store as StoreIcon
} from 'lucide-react';
import { Product, CartItem, Store } from '../types';
import { SPECIALTY_PRODUCTS } from '../data/storesData';
import { DEILAR_STORES } from '../data/storesData';
import { StoreDetailModal } from './StoreDetailModal';
import { CartCheckoutModal } from './CartCheckoutModal';

interface ProductsViewProps {
  onBackToStore?: () => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onNavigateToStore?: (storeId: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  onBackToStore,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onNavigateToStore,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [selectedStoreModal, setSelectedStoreModal] = useState<Store | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'كافة المنتجات' },
    { id: 'coffee', label: 'بن ومحامص' },
    { id: 'honey', label: 'عسل طبيعي' },
    { id: 'oil', label: 'زيت زيتون' },
  ];

  // Filter products
  const filteredProducts = SPECIALTY_PRODUCTS.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.storeName && product.storeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalCartSavings = cart.reduce(
    (acc, item) => acc + (item.product.originalPrice - item.product.price) * item.quantity,
    0
  );

  const handleAddToCartClick = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    onAddToCart(product);
    setAddedSuccessId(product.id);
    setTimeout(() => setAddedSuccessId(null), 1800);
  };

  const handleOpenStore = (e: React.MouseEvent, storeId?: string) => {
    e.stopPropagation();
    if (!storeId) return;
    const found = DEILAR_STORES.find((s) => s.id === storeId);
    if (found) {
      setSelectedStoreModal(found);
    }
  };

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;
    let message = `مرحباً ديلار، أود طلب وشراء المنتجات الطبيعية التالية (بن / عسل / زيت زتون):\n\n`;
    cart.forEach((item, idx) => {
      message += `${idx + 1}. ${item.product.name} [المتجر: ${item.product.storeName || 'ديلار'}] - (الكمية: ${item.quantity}) - السعر: ${item.product.price * item.quantity} ج.م\n`;
    });
    message += `\nإجمالي السعر بعد خصم ديلار: ${totalCartPrice} ج.م\nإجمالي التوفير: ${totalCartSavings} ج.م\n\nأرجو تأكيد الطلب للشحن السريع.`;
    window.open(`https://wa.me/201020709993?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSingleProductWhatsApp = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const message = `مرحباً، أود طلب منتج (${product.name}) من متجر (${product.storeName || 'ديلار'}) بسعر العرض (${product.price} ج.م).`;
    window.open(`https://wa.me/201020709993?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 pt-2 animate-in fade-in duration-200">
      {/* Top Header Bar for Products */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">منتجاتنا</h1>
              <span className="text-[10px] font-bold text-[#c89e43] bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
                بن • عسل • زيت زيتون
              </span>
            </div>
            <p className="text-[11px] text-slate-500">أجود أنواع البن المحوج، عسل النحل الطبيعي، وزيت الزيتون البكر</p>
          </div>
        </div>

        {/* Cart Trigger Button */}
        <button
          onClick={() => setShowCartModal(true)}
          className="relative p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="text-xs font-bold hidden xs:inline">السلة</span>
          {totalCartCount > 0 && (
            <span className="absolute -top-1.5 -left-1.5 bg-[#941946] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن بن محوج، عسل سدر، زيت زيتون بكر، أو اسم المتجر..."
          className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#941946]/20 focus:border-[#941946] transition-all shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#941946] text-white shadow-xs scale-102'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 
        CRITICAL USER REQUIREMENT:
        "عايو الاعتماد على الصور اكتر ويكون 2 فى السطر"
        - 2 items per row strictly (`grid grid-cols-2 gap-2.5 sm:gap-3.5`)
        - Dominant high-fidelity photography with attractive aspect ratio
        - Link to store from each product!
      */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">لا توجد منتجات مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 mt-1">جرّب البحث باسم منتج آخر أو اختر فئة مختلفة</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-3 px-4 py-1.5 bg-[#941946] text-white rounded-xl text-xs font-bold"
          >
            عرض كافة المنتجات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {filteredProducts.map((product) => {
            const isAdded = addedSuccessId === product.id;
            return (
              <div
                key={product.id}
                onClick={() => setSelectedProductModal(product)}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Dominant Image Container (Aspect 1/1 square for maximum visual impact) */}
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent"></div>

                    {/* Top overlay badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <span className="px-2 py-0.5 bg-[#941946] text-white text-[9px] font-black rounded-lg shadow-sm">
                        وفر {product.discountPercentage}%
                      </span>
                      {product.badge && (
                        <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[8.5px] font-extrabold rounded-md shadow-xs">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-slate-800 flex items-center gap-0.5 shadow-xs">
                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      <span>{product.rating}</span>
                    </div>

                    {/* Weight / Size Pill at bottom */}
                    {product.weight && (
                      <div className="absolute bottom-2 left-2">
                        <span className="px-2 py-0.5 bg-white/95 backdrop-blur-md text-slate-900 text-[9px] font-extrabold rounded-md shadow-xs">
                          {product.weight}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-2.5 space-y-1.5">
                    {/* Link to Store: "فى المنتجات ممكن من هناك تروح للمتجر الخاص بيها وتشوف المنتجات المتعلقه" */}
                    {product.storeName && (
                      <button
                        onClick={(e) => handleOpenStore(e, product.storeId)}
                        className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#941946] hover:text-[#7b1439] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100/80 transition-colors truncate max-w-full"
                        title="انقر لزيارة متجر المنتج ورؤية منتجاته المتعلقة"
                      >
                        <StoreIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{product.storeName}</span>
                        <span className="text-[8px] text-slate-400">←</span>
                      </button>
                    )}

                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#941946] transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </div>
                </div>

                {/* Price & Action Button Footer */}
                <div className="p-2.5 pt-0 border-t border-slate-100 flex items-center justify-between gap-1 mt-1">
                  <div>
                    <div className="text-[9.5px] text-slate-400 line-through leading-none">
                      {product.originalPrice} ج.م
                    </div>
                    <div className="text-xs sm:text-sm font-black text-[#941946] font-mono leading-tight mt-0.5">
                      {product.price} <span className="text-[9px] font-sans">ج.م</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleAddToCartClick(e, product)}
                    className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all shadow-xs ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#941946] hover:bg-[#7b1439] text-white active:scale-95'
                    }`}
                    title="أضف للسلة"
                  >
                    {isAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-5 shadow-2xl space-y-3.5">
            <div className="flex items-start justify-between">
              <div>
                {/* Store link in modal */}
                {selectedProductModal.storeName && (
                  <button
                    onClick={(e) => {
                      setSelectedProductModal(null);
                      handleOpenStore(e, selectedProductModal.storeId);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#941946] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 mb-1"
                  >
                    <StoreIcon className="w-3 h-3" />
                    <span>متجر: {selectedProductModal.storeName} (انقر لعرض المتجر)</span>
                  </button>
                )}
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {selectedProductModal.name}
                </h2>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedProductModal.nameEn}</p>
              </div>
              <button
                onClick={() => setSelectedProductModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
              <img
                src={selectedProductModal.image}
                alt={selectedProductModal.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-700 leading-relaxed">{selectedProductModal.description}</p>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 space-y-1.5">
                <p className="text-xs font-bold text-slate-800">أبرز المواصفات والجودة:</p>
                {selectedProductModal.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-rose-50/70 rounded-2xl border border-rose-200/70">
              <div>
                <span className="text-[11px] text-slate-500 line-through">
                  {selectedProductModal.originalPrice} ج.م
                </span>
                <div className="text-lg font-black text-[#941946] font-mono">
                  {selectedProductModal.price} <span className="text-xs font-sans">ج.م فقط</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleSingleProductWhatsApp(e, selectedProductModal)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>طلب واتساب</span>
                </button>

                <button
                  onClick={(e) => {
                    handleAddToCartClick(e, selectedProductModal);
                    setSelectedProductModal(null);
                  }}
                  className="px-3.5 py-2 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>إضافة للسلة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Detail Modal if a user clicks on a store from a product! */}
      {selectedStoreModal && (
        <StoreDetailModal
          store={selectedStoreModal}
          products={SPECIALTY_PRODUCTS}
          onClose={() => setSelectedStoreModal(null)}
          onSelectProduct={(p) => {
            setSelectedStoreModal(null);
            setSelectedProductModal(p);
          }}
          onAddToCart={onAddToCart}
          cart={cart}
        />
      )}

      {/* Shopping Cart and Bank / Wallet Checkout Modal */}
      <CartCheckoutModal
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        onUpdateCartQty={onUpdateCartQty}
        onRemoveFromCart={onRemoveFromCart}
        onClearCart={onClearCart}
      />
    </div>
  );
};
