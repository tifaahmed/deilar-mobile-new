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
 * 3. 🔍 Store Filtering & Search (all server-side, paged 12 at a time):
 *    - Category pills come from the API (only categories that hold stores).
 *    - Search is debounced; with a position the list is nearest-first and cards show the distance.
 *    - Clicking any store opens `<StoreDetailView />` with its branches & products.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Store as StoreIcon, ShoppingCart, Package, ChevronRight, Search, MapPin } from 'lucide-react';
import type { StoreCard } from '../api/types';
import { api, PATHS } from '../api/endpoints';
import { formatKm, roundCoord } from '../api/adapters';
import { useDebounced } from '../hooks/useDebounced';
import { usePaged } from '../hooks/usePaged';
import { useProductTypes, useStoreCategories } from '../hooks/useCatalog';
import { useLanguage } from '../context/LanguageContext';
import { Product, CartItem } from '../types';
import { ProductsView } from './ProductsView';
import { offerRange, StoreDetailView } from './StoreDetailView';
import { ErrorState, ListSkeleton, LoadMore } from './ui/Feedback';
import { Thumb } from './ui/Thumb';

interface StoreViewProps {
  /** Which sub-tab is open — the URL decides (/store or /products). */
  subTab: 'stores' | 'products';
  onSubTabChange: (tab: 'stores' | 'products') => void;
  userLocation?: { lat: number; lng: number };
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onOpenCart?: () => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  subTab: activeSubTab,
  onSubTabChange: setActiveSubTab,
  userLocation,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onClearCart,
  onOpenCart,
}) => {
  const { isAr } = useLanguage();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreCard | null>(null);

  const q = useDebounced(storeSearchQuery.trim(), 350);
  const categories = useStoreCategories();
  const productTypes = useProductTypes();
  const productsTotal = (productTypes.data ?? []).reduce((sum, t) => sum + t.count, 0);

  const params = {
    q,
    category_id: categoryId,
    lat: userLocation ? roundCoord(userLocation.lat) : null,
    lng: userLocation ? roundCoord(userLocation.lng) : null,
    per_page: 12,
  };
  const list = usePaged<StoreCard>(PATHS.stores, params, (page, signal) => api.stores({ ...params, page }, signal), activeSubTab === 'stores' && !selectedStore);

  // If a store is selected, open dedicated full page view!
  if (selectedStore) {
    return (
      <StoreDetailView
        slug={selectedStore.slug}
        preview={selectedStore}
        userLocation={userLocation}
        onBack={() => setSelectedStore(null)}
        onAddToCart={onAddToCart}
        cart={cart}
        onOpenCart={onOpenCart}
      />
    );
  }

  return (
    <div className={`space-y-4 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
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
            <span>{isAr ? 'المتاجر' : 'Stores'}</span>
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
            <span>{isAr ? 'منتجاتنا' : 'Products'}{productsTotal > 0 ? ` (${productsTotal})` : ''}</span>
          </button>
        </div>

        {/* Dedicated Cart Trigger Button with gathered items badge */}
        {onOpenCart && (
          <button
            onClick={onOpenCart}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
            title={isAr ? 'فتح عربة المشتريات والدفع' : 'Open cart & checkout'}
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline">{isAr ? 'عربة المشتريات' : 'Cart'}</span>
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
          userLocation={userLocation}
          onBackToStore={() => setActiveSubTab('stores')}
          cart={cart}
          onAddToCart={onAddToCart}
          onUpdateCartQty={onUpdateCartQty}
          onRemoveFromCart={onRemoveFromCart}
          onClearCart={onClearCart}
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
              placeholder={isAr ? 'ابحث عن متجر...' : 'Search for a store...'}
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
            {[{ id: null as number | null, name: isAr ? 'كافة المتاجر' : 'All stores' }, ...(categories.data ?? [])].map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <button
                  key={cat.id ?? 'all'}
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-[#941946] text-white shadow-xs scale-102'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                  }`}
                >
                  {cat.name}
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
          {list.loading && <ListSkeleton rows={6} grid />}
          {list.error && <ErrorState onRetry={list.reload} />}

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {list.items.map((store) => {
              const offer = offerRange(store.offer_from, store.offer_to);
              const distance = formatKm(store.distance_km, isAr);
              return (
                <div
                  key={store.id}
                  onClick={() => setSelectedStore(store)}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="relative aspect-square overflow-hidden bg-slate-100">
                      <Thumb src={store.logo} alt={store.title} kind="store" fit="contain" className="w-full h-full group-hover:scale-108 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none"></div>

                      {offer && (
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-0.5 bg-[#941946] text-white text-[9px] font-black rounded-lg shadow-sm">
                            {isAr ? `خصم ${offer}` : `${offer} off`}
                          </span>
                        </div>
                      )}

                      {store.categories[0] && (
                        <div className="absolute bottom-2 right-2">
                          <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold rounded-md">{store.categories[0].name}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 space-y-1">
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-[#941946] transition-colors line-clamp-2 leading-snug">{store.title}</h3>
                      {store.online_only || (!store.branch && !store.branches_count) ? (
                        <p className="text-[10px] text-slate-500 line-clamp-1">{isAr ? 'متجر إلكتروني' : 'Online store'}</p>
                      ) : (
                        <p className="text-[10px] text-slate-500 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{distance ?? [store.branch?.city, store.branch?.governorate].filter(Boolean).join(' - ')}</span>
                        </p>
                      )}
                      {store.branches_count > 1 && (
                        <p className="text-[10px] text-slate-400 line-clamp-1">{isAr ? `${store.branches_count} فروع` : `${store.branches_count} branches`}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 pt-0 border-t border-slate-100 flex items-center justify-between gap-1 mt-1">
                    {store.products_count > 0 ? (
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        {isAr ? `${store.products_count} منتجات معروضة` : `${store.products_count} products`}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        {isAr ? 'خصم بالفروع' : 'In-branch discount'}
                      </span>
                    )}

                    <span className="text-[10px] font-extrabold text-[#941946] group-hover:underline flex items-center gap-0.5">
                      <span>{isAr ? 'عرض المتجر' : 'View'}</span>
                      <ChevronRight className={`w-3 h-3 ${isAr ? '' : 'rotate-180'}`} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />

          {!list.loading && !list.error && list.items.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
              <StoreIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">{isAr ? 'لا توجد متاجر مطابقة' : 'No stores found'}</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
