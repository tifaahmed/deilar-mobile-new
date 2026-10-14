/**
 * ==============================================================================
 * 📌 DEILAR PRODUCTS VIEW (ProductsView.tsx)
 * ==============================================================================
 *
 * The product catalogue, 2 per row, straight from the API:
 * - search is server-side (debounced) and Arabic-aware,
 * - the category pills are the product types that actually hold products,
 * - the grid pages in as you scroll (12 at a time) instead of loading everything.
 *
 * A product's store badge opens that store's full page (`StoreDetailView`).
 * ==============================================================================
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Package, ShoppingCart, ShoppingBag, Check, Search, SlidersHorizontal, Store as StoreIcon, X, Eye, ExternalLink } from 'lucide-react';
import type { ProductCard } from '../api/types';
import { api, PATHS } from '../api/endpoints';
import { toCartProduct } from '../api/adapters';
import { navigate, routeHref } from '../router';
import { ProductDetailModal } from './ProductDetailModal';
import { shownPrice, useIsMember } from '../utils/pricing';
import { useApi } from '../hooks/useApi';
import { useDebounced } from '../hooks/useDebounced';
import { usePaged } from '../hooks/usePaged';
import { useProductTypes } from '../hooks/useCatalog';
import { useLanguage } from '../context/LanguageContext';
import { Product, CartItem } from '../types';
import { ErrorState, ListSkeleton, LoadMore } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { StoreDetailView } from './StoreDetailView';

type Sort = 'newest' | 'price_asc' | 'price_desc' | 'discount';

interface ProductsViewProps {
  userLocation?: { lat: number; lng: number };
  onBackToStore?: () => void;
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ userLocation, cart, onAddToCart, onUpdateCartQty, onRemoveFromCart, onClearCart }) => {
  const { isAr } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [openStore, setOpenStore] = useState<{ slug: string; id: number } | null>(null);
  const [previewProduct, setPreviewProduct] = useState<ProductCard | null>(null);
  const openCart = () => navigate(routeHref({ checkout: 'cart' }));
  const [addedSuccessId, setAddedSuccessId] = useState<number | null>(null);

  const member = useIsMember();
  const q = useDebounced(searchQuery.trim(), 350);
  const types = useProductTypes();

  const [sort, setSort] = useState<Sort>('newest');
  const [storeId, setStoreId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // What is being edited in the drawer; it only takes effect on "Apply".
  const [draft, setDraft] = useState<{ type: number | null; store: number | null; sort: Sort }>({ type: null, store: null, sort: 'newest' });

  const stores = useApi(drawerOpen ? `filter-stores:${isAr}` : null, (signal) => api.stores({ per_page: 40 }, signal).then((r) => r.data));
  const activeFilters = (selectedTypeId !== null ? 1 : 0) + (storeId !== null ? 1 : 0) + (sort !== 'newest' ? 1 : 0);

  const openDrawer = () => {
    setDraft({ type: selectedTypeId, store: storeId, sort });
    setDrawerOpen(true);
  };

  const applyDrawer = () => {
    setSelectedTypeId(draft.type);
    setStoreId(draft.store);
    setSort(draft.sort);
    setDrawerOpen(false);
  };

  const params = { q, type: selectedTypeId, store_id: storeId, sort: sort === 'newest' ? undefined : sort, per_page: 12 };
  const list = usePaged<ProductCard>(PATHS.products, params, (page, signal) => api.products({ ...params, page }, signal));

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const currency = isAr ? 'ج.م' : 'EGP';

  const handleAdd = (product: ProductCard) => {
    onAddToCart(toCartProduct(product));
    setAddedSuccessId(product.id);
    setTimeout(() => setAddedSuccessId(null), 1800);
  };

  if (openStore) {
    return (
      <StoreDetailView
        slug={openStore.slug}
        userLocation={userLocation}
        onBack={() => setOpenStore(null)}
        onAddToCart={onAddToCart}
        cart={cart}
        onOpenCart={openCart}
      />
    );
  }

  return (
    <div className={`space-y-4 pb-24 pt-2 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#941946]/10 text-[#941946] flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">{isAr ? 'منتجاتنا' : 'Our Products'}</h1>
            <p className="text-[11px] text-slate-500">{isAr ? 'منتجات طبيعية بأسعار خاصة لحاملي كرت ديلار' : 'Natural products at special prices for Deilar cardholders'}</p>
          </div>
        </div>

        <button
          onClick={openCart}
          className="relative p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="text-xs font-bold hidden xs:inline">{isAr ? 'السلة' : 'Cart'}</span>
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
          placeholder={isAr ? 'ابحث عن منتج...' : 'Search for a product...'}
          className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#941946]/20 focus:border-[#941946] transition-all shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs">
            ✕
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[{ id: null as number | null, name: isAr ? 'كافة المنتجات' : 'All products' }, ...(types.data ?? [])].map((type) => (
          <button
            key={type.id ?? 'all'}
            onClick={() => setSelectedTypeId(type.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedTypeId === type.id ? 'bg-[#941946] text-white shadow-xs scale-102' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>

      {list.loading && <ListSkeleton rows={6} grid />}
      {list.error && <ErrorState onRetry={list.reload} />}

      {!list.loading && !list.error && list.items.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">{isAr ? 'لا توجد منتجات مطابقة للبحث' : 'No products match your search'}</h3>
          <p className="text-xs text-slate-500 mt-1">{isAr ? 'جرّب البحث باسم منتج آخر أو اختر فئة مختلفة' : 'Try another name or pick a different category'}</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedTypeId(null);
              setStoreId(null);
              setSort('newest');
            }}
            className="mt-3 px-4 py-1.5 bg-[#941946] text-white rounded-xl text-xs font-bold"
          >
            {isAr ? 'عرض كافة المنتجات' : 'Show all products'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
          {list.items.map((product) => {
            const isAdded = addedSuccessId === product.id;
            return (
              <div
                key={product.id}
                onClick={() => navigate(routeHref({ product: product.slug }))}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <Thumb src={product.image} alt={product.name} kind="product" className="w-full h-full group-hover:scale-108 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent pointer-events-none"></div>

                    {member && product.discount != null && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 bg-[#941946] text-white text-[9px] font-black rounded-lg shadow-sm">
                          {isAr ? `وفر ${product.discount}%` : `Save ${product.discount}%`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1.5">
                    {product.store && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStore({ slug: product.store!.slug, id: product.store!.id });
                        }}
                        className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#941946] hover:text-[#7b1439] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100/80 transition-colors truncate max-w-full"
                      >
                        <StoreIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{product.store.title}</span>
                      </button>
                    )}

                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#941946] transition-colors line-clamp-2 leading-snug">{product.name}</h3>
                  </div>
                </div>

                <div className="p-2.5 pt-0 border-t border-slate-100 flex items-center justify-between gap-1 mt-1">
                  <div>
                    {(() => {
                      const shown = shownPrice(product, member);
                      return (
                        <>
                          {shown.strike != null && (
                            <div className="text-[9.5px] text-slate-400 line-through leading-none">
                              {shown.strike} {currency}
                            </div>
                          )}
                          <div className="text-xs sm:text-sm font-black text-[#941946] font-mono leading-tight mt-0.5">
                            {shown.price ?? '—'} <span className="text-[9px] font-sans">{currency}</span>
                          </div>
                          {shown.memberPrice != null && (
                            <div className="text-[9px] font-bold text-emerald-700 leading-tight">
                              {isAr ? `بالكرت ${shown.memberPrice} ${currency}` : `${shown.memberPrice} ${currency} with a card`}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {product.purchasable && product.price != null && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(product);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all shadow-xs ${
                        isAdded ? 'bg-emerald-600 text-white' : 'bg-[#941946] hover:bg-[#7b1439] text-white active:scale-95'
                      }`}
                      title={isAr ? 'أضف للسلة' : 'Add to cart'}
                    >
                      {isAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewProduct(product);
                    }}
                    className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isAr ? 'نظرة سريعة' : 'Quick view'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(routeHref({ product: product.slug }));
                    }}
                    className="py-1.5 rounded-lg bg-[#941946]/10 hover:bg-[#941946]/20 text-[#941946] text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{isAr ? 'فتح الصفحة' : 'Open page'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewProduct && (
        <ProductDetailModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onAddToCart={handleAdd}
          onOpenStore={(st) => { setPreviewProduct(null); setOpenStore({ slug: st.slug, id: st.id }); }}
        />
      )}

      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
      {/* Filter button: fixed on screen, opens the drawer */}
      {createPortal(
        <button
          onClick={openDrawer}
          className="fixed z-40 bottom-24 end-4 w-12 h-12 rounded-full bg-[#941946] hover:bg-[#7b1439] text-white shadow-lg shadow-rose-900/30 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
          style={{ insetInlineEnd: 'max(1rem, calc(50% - 384px + 1rem))' }}
          title={isAr ? 'تصفية المنتجات' : 'Filter products'}
          aria-label={isAr ? 'تصفية المنتجات' : 'Filter products'}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {activeFilters > 0 && (
            <span className="absolute -top-1 -end-1 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black flex items-center justify-center border-2 border-white">{activeFilters}</span>
          )}
        </button>,
        document.body,
      )}

      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => setDrawerOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-3xl max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200 ${isAr ? 'text-right' : 'text-left'}`}
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#941946]" />
                  {isAr ? 'تصفية المنتجات' : 'Filter products'}
                </h3>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer" aria-label={isAr ? 'إغلاق' : 'Close'}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-5 overflow-y-auto">
                <FilterGroup title={isAr ? 'ترتيب حسب' : 'Sort by'}>
                  {(
                    [
                      ['newest', isAr ? 'الأحدث' : 'Newest'],
                      ['discount', isAr ? 'الأعلى خصماً' : 'Biggest discount'],
                      ['price_asc', isAr ? 'السعر: الأقل أولاً' : 'Price: low to high'],
                      ['price_desc', isAr ? 'السعر: الأعلى أولاً' : 'Price: high to low'],
                    ] as [Sort, string][]
                  ).map(([value, label]) => (
                    <Chip key={value} active={draft.sort === value} onClick={() => setDraft({ ...draft, sort: value })}>
                      {label}
                    </Chip>
                  ))}
                </FilterGroup>

                <FilterGroup title={isAr ? 'نوع المنتج' : 'Product type'}>
                  {[{ id: null as number | null, name: isAr ? 'الكل' : 'All' }, ...(types.data ?? [])].map((type) => (
                    <Chip key={type.id ?? 'all'} active={draft.type === type.id} onClick={() => setDraft({ ...draft, type: type.id })}>
                      {type.name}
                    </Chip>
                  ))}
                </FilterGroup>

                <FilterGroup title={isAr ? 'المتجر' : 'Store'}>
                  {[{ id: null as number | null, title: isAr ? 'كل المتاجر' : 'All stores' }, ...(stores.data ?? [])].map((store) => (
                    <Chip key={store.id ?? 'all'} active={draft.store === store.id} onClick={() => setDraft({ ...draft, store: store.id })}>
                      {store.title}
                    </Chip>
                  ))}
                </FilterGroup>
              </div>

              <div className="p-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                <button onClick={() => setDraft({ type: null, store: null, sort: 'newest' })} className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer">
                  {isAr ? 'إعادة ضبط' : 'Reset'}
                </button>
                <button onClick={applyDrawer} className="col-span-2 py-3 rounded-xl bg-[#941946] hover:bg-[#7b1439] text-white text-xs font-bold cursor-pointer">
                  {isAr ? 'تطبيق' : 'Apply'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

const FilterGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <h4 className="text-[11px] font-black text-slate-500">{title}</h4>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

const Chip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
      active ? 'bg-[#941946] text-white border-[#941946] shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
    }`}
  >
    {children}
  </button>
);
