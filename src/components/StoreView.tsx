/**
 * ==============================================================================
 * 📌 DEILAR SPECIALTY STORES VIEW (StoreView.tsx)
 * ==============================================================================
 * 
 * 🤖 AI / CLAUDE DEVELOPER GUIDE:
 * This component manages the Partner Stores marketplace (coffee, honey, olive oil):
 * 
 * 1. 🔄 Top Segmented Switcher:
 *    - `المتاجر`: Displays the list of stores.
 *    - `منتجاتنا`: Switches to `<ProductsView />` displaying the unified catalog.
 *    - Dedicated Shopping Cart button with live item counter.
 * 
 * 2. 🏪 Stores Layout (2 per row):
 *    - Uses `grid grid-cols-2 gap-2.5 sm:gap-3.5`.
 *    - Stores with products display product count pill (e.g. "4 منتجات معروضة").
 *    - Stores without online products display in-branch discount badge (e.g. "خصم بالفروع").
 * 
 * 3. 🔍 Store Filtering & Search:
 *    - Filters by category: "الكل", "متاجر البن والمحامص", "مناحل العسل", "معاصر زيت الزيتون".
 *    - Clicking any store opens `<StoreDetailModal />` showcasing its details & related products.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { 
  Store as StoreIcon, 
  ShoppingBag, 
  ShoppingCart,
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Star, 
  ArrowLeft, 
  ExternalLink, 
  Check, 
  PhoneCall, 
  MessageCircle, 
  Package, 
  Activity, 
  Zap, 
  Clock, 
  Percent,
  CheckCircle2,
  ChevronRight,
  Search,
  MapPin,
  Flame,
  Coffee
} from 'lucide-react';
import { Store, Product, CartItem } from '../types';
import { DEILAR_STORES, SPECIALTY_PRODUCTS } from '../data/storesData';
import { ProductsView } from './ProductsView';
import { StoreDetailView } from './StoreDetailView';

interface StoreViewProps {
  initialSubTab?: 'stores' | 'products';
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onOpenCart?: () => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  initialSubTab = 'stores',
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onOpenCart,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stores' | 'products'>(initialSubTab);
  const [storeCategoryFilter, setStoreCategoryFilter] = useState<string>('all');
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const storeCategories = [
    { id: 'all', label: 'كافة المتاجر' },
    { id: 'coffee', label: 'متاجر البن والمحامص' },
    { id: 'honey', label: 'مناحل العسل' },
    { id: 'oil', label: 'معاصر زيت الزيتون' },
  ];

  // Filter stores
  const filteredStores = DEILAR_STORES.filter((store) => {
    const matchesCat = storeCategoryFilter === 'all' || store.category === storeCategoryFilter;
    const matchesSearch = 
      store.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
      store.nameEn.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
      store.categoryAr.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
      store.branches.toLowerCase().includes(storeSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // If a store is selected, open dedicated full page view!
  if (selectedStore) {
    return (
      <StoreDetailView
        store={selectedStore}
        products={SPECIALTY_PRODUCTS}
        onBack={() => setSelectedStore(null)}
        onAddToCart={onAddToCart}
        cart={cart}
        onOpenCart={onOpenCart}
      />
    );
  }

  return (
    <div className="space-y-4 pb-24 pt-2 animate-in fade-in duration-200">
      {/* 
        TOP SEGMENTED SWITCHER:
        - المتاجر (متاجر بن وعسل وزيت زتون)
        - منتجاتنا (منتجات البن والعسل والزيت)
      */}
      <div className="flex items-center gap-2">
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 shadow-inner flex-1">
          <button
            onClick={() => setActiveSubTab('stores')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'stores'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <StoreIcon className="w-4 h-4 text-[#941946]" />
            <span>المتاجر</span>
          </button>

          <button
            onClick={() => setActiveSubTab('products')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeSubTab === 'products'
                ? 'bg-[#941946] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>منتجاتنا ({SPECIALTY_PRODUCTS.length})</span>
          </button>
        </div>

        {/* Dedicated Cart Trigger Button with gathered items badge */}
        {onOpenCart && (
          <button
            onClick={onOpenCart}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
            title="فتح عربة المشتريات والدفع"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">عربة المشتريات</span>
            {cart.length > 0 && (
              <span className="bg-[#941946] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full border border-white/20">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Render the full "منتجاتنا" page when that sub-tab is chosen */}
      {activeSubTab === 'products' ? (
        <ProductsView
          onBackToStore={() => setActiveSubTab('stores')}
          cart={cart}
          onAddToCart={onAddToCart}
          onUpdateCartQty={onUpdateCartQty}
          onRemoveFromCart={onRemoveFromCart}
          onClearCart={onClearCart}
          onNavigateToStore={(storeId) => {
            const found = DEILAR_STORES.find((s) => s.id === storeId);
            if (found) {
              setSelectedStore(found);
            }
          }}
        />
      ) : (
        /* ==================== THE STORES VIEW (2 PER ROW) ==================== */
        <div className="space-y-4">
          {/* Search Input for Stores */}
          <div className="relative">
            <input
              type="text"
              value={storeSearchQuery}
              onChange={(e) => setStoreSearchQuery(e.target.value)}
              placeholder="ابحث عن متجر بن، منحل عسل، أو معصرة زيت زيتون..."
              className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#941946]/20 focus:border-[#941946] transition-all shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {storeSearchQuery && (
              <button
                onClick={() => setStoreSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {storeCategories.map((cat) => {
              const isSelected = storeCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setStoreCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
            "بس عادى فى متاجر ممكن ميكونش ليها منتجات"
            - 2 items per row strictly (`grid grid-cols-2 gap-2.5 sm:gap-3.5`)
            - Image heavy visual presence
            - Stores without products show clear indicator
          */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {filteredStores.map((store) => {
              const storeProductsCount = SPECIALTY_PRODUCTS.filter((p) => p.storeId === store.id).length;
              return (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Visual Photo (Square Aspect 1/1 for strong visual presence) */}
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={store.image}
                        alt={store.name}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                      {/* Top Badges */}
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-[#941946] text-white text-[9px] font-black rounded-lg shadow-sm">
                          {store.discount}
                        </span>
                      </div>

                      <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[9px] font-bold text-slate-800 flex items-center gap-0.5 shadow-xs">
                        <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                        <span>{store.rating}</span>
                      </div>

                      {/* Store Category Tag on Image */}
                      <div className="absolute bottom-2 right-2">
                        <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold rounded-md">
                          {store.categoryAr}
                        </span>
                      </div>
                    </div>

                    {/* Store Info */}
                    <div className="p-2.5 space-y-1">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#941946] transition-colors line-clamp-1 leading-snug">
                        {store.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {store.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer with Products count or in-store note */}
                  <div className="p-2.5 pt-0 border-t border-slate-100 flex items-center justify-between gap-1 mt-1">
                    {storeProductsCount > 0 ? (
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {storeProductsCount} منتجات معروضة
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        خصم بالفروع
                      </span>
                    )}

                    <span className="text-[10px] font-extrabold text-[#941946] group-hover:underline flex items-center gap-0.5">
                      <span>عرض المتجر</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
