import React, { useState } from 'react';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  ShoppingBag,
  Package,
  ShoppingCart,
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe,
  Ticket,
  Truck,
  Wifi,
  Play,
  Smartphone,
  Eye,
  ExternalLink,
} from 'lucide-react';
import type { ProductCard, StoreCard, StoreDetail } from '../api/types';
import { api, PATHS } from '../api/endpoints';
import { roundCoord, toCartProduct, whatsappNumber } from '../api/adapters';
import { shownPrice, useIsMember } from '../utils/pricing';
import { useApi } from '../hooks/useApi';
import { usePaged } from '../hooks/usePaged';
import { useLanguage } from '../context/LanguageContext';
import { Product, CartItem } from '../types';
import { ErrorState, ListSkeleton, LoadMore, Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { BranchList } from './BranchList';
import { ImageViewer } from './ImageViewer';
import { ProductDetailModal } from './ProductDetailModal';
import { navigate, routeHref } from '../router';

interface StoreDetailViewProps {
  slug: string;
  /** The list card that was tapped — painted at once while the detail loads. */
  preview?: StoreCard;
  /** Branches are listed nearest first from here; without it they keep the server's order. */
  userLocation?: { lat: number; lng: number };
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  cart: CartItem[];
  onOpenCart?: () => void;
}

/** Branches shown first, and added on every "show more" tap. */
const BRANCH_PAGE = 3;

/** "10% – 50%" / "25%" — the store's discount range, or nothing if it has none. */
export function offerRange(from: number | null | undefined, to: number | null | undefined): string | null {
  const lo = from ?? to;
  const hi = to ?? from;
  if (lo == null || hi == null || (lo === 0 && hi === 0)) return null;
  return lo === hi ? `${lo}%` : `${lo}% – ${hi}%`;
}

export function offerLabel(from: number | null | undefined, to: number | null | undefined, isAr: boolean): string | null {
  const range = offerRange(from, to);
  if (!range) return null;
  return isAr ? `خصم ${range} لحاملي كرت ديلار` : `${range} off for Deilar cardholders`;
}

export const StoreDetailView: React.FC<StoreDetailViewProps> = ({ slug, preview, userLocation, onBack, onAddToCart, cart, onOpenCart }) => {
  const { isAr } = useLanguage();
  const member = useIsMember();
  const [selectedProduct, setSelectedProduct] = useState<ProductCard | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const point = userLocation ? { lat: roundCoord(userLocation.lat), lng: roundCoord(userLocation.lng) } : {};
  const detail = useApi<StoreDetail>(`store:${slug}:${userLocation ? `${point.lat},${point.lng}` : ''}:${isAr}`, (signal) => api.store(slug, { ...point, per_page: BRANCH_PAGE }, signal));
  const store = detail.data;

  const storeId = store?.id ?? preview?.id;
  const productParams = { store_id: storeId, per_page: 12 };
  const products = usePaged<ProductCard>(PATHS.products, productParams, (page, signal) => api.products({ ...productParams, page }, signal), storeId != null);

  const title = store?.title ?? preview?.title ?? '';
  const lead = store?.branches[0] ?? preview?.branch ?? undefined;
  const offer = offerLabel(store?.offer_from ?? preview?.offer_from, store?.offer_to ?? preview?.offer_to, isAr);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currency = isAr ? 'ج.م' : 'EGP';
  const hero = store?.cover || store?.gallery[0] || store?.logo || preview?.logo;
  const categoryName = (store?.categories ?? preview?.categories)?.[0]?.name;

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      isAr
        ? `مرحباً ${title}، أنا من مشتركي كرت ديلار وأرغب في الاستفسار عن منتجاتكم والعروض المتاحة.`
        : `Hello ${title}, I am a Deilar medical cardholder and would like to ask about your products and offers.`,
    );
    const target = whatsappNumber(lead?.whatsapp);
    if (target) window.open(`https://wa.me/${target}?text=${text}`, '_blank');
  };

  const handleAdd = (card: ProductCard) => {
    onAddToCart(toCartProduct(card));
    setAddedNotice(card.name);
    setTimeout(() => setAddedNotice(null), 2000);
  };

  return (
    <div className={`space-y-4 pb-28 pt-1 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#941946] hover:bg-rose-50/50 rounded-xl transition-all"
        >
          <ArrowRight className={`w-4 h-4 text-[#941946] ${isAr ? '' : 'rotate-180'}`} />
          <span>{isAr ? 'الرجوع إلى المتاجر' : 'Back to stores'}</span>
        </button>

        {onOpenCart && (
          <button
            onClick={onOpenCart}
            className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'السلة' : 'Cart'}</span>
            {totalCartCount > 0 && <span className="bg-[#941946] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">{totalCartCount}</span>}
          </button>
        )}
      </div>

      {addedNotice && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{isAr ? `تمت إضافة «${addedNotice}» إلى السلة!` : `“${addedNotice}” added to the cart!`}</span>
        </div>
      )}

      {/* 2. Hero Cover & Store Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white shadow-md border border-slate-200/50">
        <div className="relative aspect-[2.2/1] sm:aspect-[2.6/1] w-full overflow-hidden">
          <Thumb src={hero} alt={title} kind="store" className="w-full h-full opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>

        {categoryName && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-[#941946] text-white text-[11px] font-black rounded-xl shadow-xs">{categoryName}</span>
          </div>
        )}

        <div className="absolute bottom-3 right-4 left-4 text-white flex items-end gap-3">
          {/* The store's logo, from the list card at once and the full record once it arrives. */}
          <Thumb
            src={store?.logo ?? preview?.logo}
            alt={title}
            kind="store"
            fit="contain"
            priority
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0 border-2 border-white/80 shadow-lg"
          />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black text-white drop-shadow-md">{title}</h1>
            {(store?.short_description ?? null) && <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{store?.short_description}</p>}
          </div>
        </div>
      </div>

      {detail.error && !preview && <ErrorState onRetry={detail.reload} />}

      {/* 3. Discount Privilege & Quick Contact Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        {offer && (
          <div className="p-3 bg-gradient-to-r from-rose-50 to-amber-50/60 rounded-2xl border border-rose-200/80 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#941946] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">%</div>
            <div>
              <p className="text-xs font-black text-[#941946]">{offer}</p>
              <p className="text-[10.5px] text-slate-600 font-medium">{isAr ? 'خصم معتمد وحصري لحاملي كرت ديلار' : 'Approved, exclusive discount for Deilar cardholders'}</p>
            </div>
          </div>
        )}

        {store && (store.ships || store.online_only) && (
          <div className="flex flex-wrap gap-1.5">
            {store.ships && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700">
                <Truck className="w-3.5 h-3.5" />
                {store.ships_everywhere ? (isAr ? 'توصيل لكل المحافظات' : 'Delivers everywhere') : isAr ? 'يوفر خدمة التوصيل' : 'Delivery available'}
              </span>
            )}
            {store.online_only && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-100 text-[11px] font-bold text-sky-700">
                <Wifi className="w-3.5 h-3.5" />
                {isAr ? 'متجر إلكتروني فقط' : 'Online store only'}
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={lead?.phone ? `tel:${lead.phone}` : undefined}
            aria-disabled={!lead?.phone}
            className={`py-2.5 px-3 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${lead?.phone ? 'hover:bg-slate-800' : 'opacity-40 pointer-events-none'}`}
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>{lead?.phone ?? (isAr ? 'اتصال هاتفياً' : 'Call')}</span>
          </a>

          <button
            onClick={handleWhatsApp}
            disabled={!lead?.whatsapp}
            className={`py-2.5 px-3 bg-[#25D366] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs ${lead?.whatsapp ? 'hover:bg-emerald-600' : 'opacity-40 pointer-events-none'}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{lead?.whatsapp ?? (isAr ? 'محادثة واتساب' : 'WhatsApp')}</span>
          </button>
        </div>

        {store && store.coupons.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {store.coupons.map((coupon) => (
              <div key={coupon.code} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-dashed border-[#941946]/40 bg-slate-50">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-600 min-w-0">
                  <Ticket className="w-3.5 h-3.5 text-[#941946] shrink-0" />
                  <span className="truncate">{coupon.title ?? (isAr ? 'كوبون خصم' : 'Discount coupon')}</span>
                </span>
                <span className="font-mono font-black text-[#941946] text-xs tracking-wider shrink-0">{coupon.code}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3b. Gallery */}
      {store && store.gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto snap-x pb-1 -mx-1 px-1">
          {store.gallery.map((url, i) => (
            <button type="button" key={url} onClick={() => setViewing(i)} className="snap-start shrink-0 w-40 aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-100 cursor-pointer">
              <Thumb src={url} alt={title} kind="store" className="w-full h-full" />
            </button>
          ))}
        </div>
      )}
      {store && viewing !== null && <ImageViewer images={store.gallery} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)} />}

      {store && (store.videos?.length ?? 0) > 0 && (
        <div className="space-y-2">
          {store.videos!.map((url) => (
            <video key={url} src={url} controls preload="metadata" playsInline className="w-full rounded-2xl border border-slate-200/90 bg-black max-h-72" />
          ))}
        </div>
      )}

      {store && (store.youtube_link || store.app_store_url || store.google_play_url) && (
        <div className="flex flex-wrap gap-2">
          {store.youtube_link && (
            <a href={store.youtube_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold">
              <Play className="w-3.5 h-3.5" />
              <span>{isAr ? 'شاهد الفيديو' : 'Watch video'}</span>
            </a>
          )}
          {store.app_store_url && (
            <a href={store.app_store_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>App Store</span>
            </a>
          )}
          {store.google_play_url && (
            <a href={store.google_play_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Google Play</span>
            </a>
          )}
        </div>
      )}

      {/* 4. About */}
      {(detail.loading || store?.description || (store?.websites.length ?? 0) > 0) && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5 text-xs text-slate-700 leading-relaxed">
          <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#941946]" />
            <span>{isAr ? 'عن المتجر' : 'About the store'}</span>
          </h2>
          {detail.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : (
            <>
              {store?.description && <p className="text-slate-600 leading-relaxed whitespace-pre-line">{store.description}</p>}
              {store && (store.websites.length > 0 || store.social_links.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {store.websites.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700">
                      <Globe className="w-3 h-3 text-[#941946]" />
                      <span className="truncate max-w-[10rem]">{url.replace(/^https?:\/\//, '')}</span>
                    </a>
                  ))}
                  {store.social_links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 capitalize">
                      {link.platform}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 5. Branches */}
      <BranchList
        first={store?.branches}
        hasMore={store?.has_more ?? false}
        loading={detail.loading}
        loadPage={(page) => api.storeBranches(slug, { ...point, page, per_page: BRANCH_PAGE })}
        resetKey={slug}
      />

      {/* 6. Products of this store */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#941946]" />
            <span>{isAr ? 'منتجات المتجر المتاحة للطلب' : 'Products available to order'}</span>
          </h2>
        </div>

        {products.loading && <ListSkeleton rows={4} grid />}
        {products.error && <ErrorState onRetry={products.reload} />}

        {products.items.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {products.items.map((prod) => (
              <div
                key={prod.id}
                onClick={() => navigate(routeHref({ product: prod.slug }))}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="relative aspect-[1.15/1] overflow-hidden bg-slate-100">
                    <Thumb src={prod.image} alt={prod.name} kind="product" className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    {member && prod.discount != null && (
                      <div className="absolute top-2 right-2 bg-[#941946] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                        {isAr ? `وفر ${prod.discount}%` : `Save ${prod.discount}%`}
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-[#941946] transition-colors leading-snug">{prod.name}</h3>
                    {prod.type && <p className="text-[10px] text-slate-500 line-clamp-1">{prod.type.name}</p>}

                    {(() => {
                      const shown = shownPrice(prod, member);
                      return (
                        <div className="pt-0.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs font-black text-[#941946] font-mono">
                              {shown.price ?? '—'} <span className="text-[9px] font-sans">{currency}</span>
                            </span>
                            {shown.strike != null && (
                              <span className="text-[10px] text-slate-400 line-through">
                                {shown.strike} {currency}
                              </span>
                            )}
                          </div>
                          {shown.memberPrice != null && (
                            <div className="text-[9px] font-bold text-emerald-700">{isAr ? `بالكرت ${shown.memberPrice} ${currency}` : `${shown.memberPrice} ${currency} with a card`}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {prod.purchasable && prod.price != null && (
                  <div className="p-2.5 pt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(prod);
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-[#941946] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isAr ? 'أضف للسلة' : 'Add to cart'}</span>
                    </button>
                  </div>
                )}
                <div className="p-2.5 pt-0 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(prod);
                    }}
                    className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isAr ? 'نظرة سريعة' : 'Quick view'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(routeHref({ product: prod.slug }));
                    }}
                    className="py-1.5 rounded-lg bg-[#941946]/10 hover:bg-[#941946]/20 text-[#941946] text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>{isAr ? 'فتح الصفحة' : 'Open page'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <LoadMore hasMore={products.hasMore} loading={products.loadingMore} onLoadMore={products.loadMore} />

        {!products.loading && !products.error && products.items.length === 0 && storeId != null && (
          <div className="p-5 bg-white border border-amber-200/80 rounded-3xl text-center space-y-2.5 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-amber-950">
              {isAr ? 'لا توجد منتجات معروضة للشراء أونلاين حالياً لهذا المتجر' : 'No products are available to buy online from this store yet'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {isAr
                ? `يمكنك الاستفادة من خصم كرت ديلار${offer ? ` (${offer})` : ''} مباشرة عند زيارة أي من فروع المتجر بإبراز كرتك الرقمي من التطبيق.`
                : `Use your Deilar card discount${offer ? ` (${offer})` : ''} directly at any branch by showing your digital card.`}
            </p>
            {lead?.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{isAr ? `اتصال بفرع المتجر (${lead.phone})` : `Call a branch (${lead.phone})`}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAdd} />
      )}
    </div>
  );
};
