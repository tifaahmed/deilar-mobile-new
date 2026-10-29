import React, { useState } from 'react';
import { ArrowRight, BadgeCheck, Check, Headphones, Minus, Plus, MessageCircle, Share2, ShoppingBag, ShoppingCart, Store as StoreIcon, Tag, Truck } from 'lucide-react';
import type { ProductCard, ProductDetail } from '../api/types';
import { api } from '../api/endpoints';
import { toCartProduct } from '../api/adapters';
import { useApi } from '../hooks/useApi';
import { useContact } from '../hooks/useCatalog';
import { useLanguage } from '../context/LanguageContext';
import { navigate, routeHref } from '../router';
import { shownPrice, useIsMember } from '../utils/pricing';
import { Product } from '../types';
import { ErrorState, Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { ImageViewer } from './ImageViewer';

interface ProductPageProps {
  slug: string;
  cartCount: number;
  onAddToCart: (product: Product) => void;
  onUpdateCartQty: (productId: string, delta: number) => void;
  onOpenCart: () => void;
}

const RELATED_COUNT = 8;

/** The editor stores Markdown-ish text; a phone shows plain, tidy lines. */
const tidy = (text: string) => text.replace(/^#{1,6}\s*/gm, '').replace(/\*{2,}/g, '').replace(/[ \t]+\n/g, '\n').trim();

/** One product on its own page (`/products/:slug`): gallery, price, description, order buttons, related products. */
export const ProductPage: React.FC<ProductPageProps> = ({ slug, cartCount, onAddToCart, onUpdateCartQty, onOpenCart }) => {
  const { isAr } = useLanguage();
  const contact = useContact();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const member = useIsMember();

  const detail = useApi<ProductDetail>(`product:${slug}:${isAr}`, (signal) => api.product(slug, signal));
  const product = detail.data;
  const typeId = product?.type?.id;

  const related = useApi(
    typeId ? `related-products:${typeId}:${isAr}` : null,
    (signal) => api.products({ type: typeId, per_page: RELATED_COUNT + 1 }, signal).then((r) => r.data.filter((p) => p.slug !== slug).slice(0, RELATED_COUNT)),
  );

  const currency = isAr ? 'ج.م' : 'EGP';
  const gallery = product?.gallery ?? [];
  const mainImage = selectedImage && gallery.includes(selectedImage) ? selectedImage : gallery[0] ?? product?.image;

  // The photos the viewer pages through: the whole gallery, or the one picture when there is no gallery.
  const photos = gallery.length ? gallery : product?.image ? [product.image] : [];
  const mainIndex = Math.max(0, photos.indexOf(mainImage ?? ''));

  const back = () => (history.length > 1 ? history.back() : navigate(routeHref({ tab: 'products' })));

  const handleAdd = () => {
    if (!product) return;
    onAddToCart(toCartProduct(product));
    if (qty > 1) onUpdateCartQty(String(product.id), qty - 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!product) return;
    const paid = shownPrice(product, member).price;
    const message = isAr
      ? `مرحباً، أود طلب منتج (${product.name})${product.store ? ` من متجر (${product.store.title})` : ''} بسعر (${paid} ${currency}).`
      : `Hello, I would like to order (${product.name})${product.store ? ` from (${product.store.title})` : ''} at (${paid} ${currency}).`;
    if (contact.whatsapp) window.open(`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShare = async () => {
    const url = location.href;
    if (navigator.share) await navigator.share({ title: product?.name, url }).catch(() => undefined);
    else await navigator.clipboard?.writeText(url).catch(() => undefined);
  };

  return (
    <div className={`space-y-4 pb-28 pt-1 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button onClick={back} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#941946] hover:bg-rose-50/50 rounded-xl transition-all cursor-pointer">
          <ArrowRight className={`w-4 h-4 text-[#941946] ${isAr ? '' : 'rotate-180'}`} />
          <span>{isAr ? 'الرجوع إلى المنتجات' : 'Back to products'}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button onClick={handleShare} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer" aria-label={isAr ? 'مشاركة' : 'Share'}>
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={onOpenCart} className="relative py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'السلة' : 'Cart'}</span>
            {cartCount > 0 && <span className="bg-[#941946] text-white text-[10px] font-black px-1.5 rounded-full">{cartCount}</span>}
          </button>
        </div>
      </div>

      {detail.error && <ErrorState onRetry={detail.reload} />}

      {/* Gallery */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5">
        <div
          className={`relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 ${photos.length ? 'cursor-zoom-in' : ''}`}
          onClick={() => photos.length && setViewing(mainIndex)}
        >
          {detail.loading ? <Skeleton className="w-full h-full" /> : <Thumb src={mainImage} alt={product?.name ?? ''} kind="product" fit="contain" className="w-full h-full" />}
          {member && product?.discount != null && (
            <span className="absolute top-3 right-3 px-2.5 py-1 bg-[#941946] text-white text-[11px] font-black rounded-xl shadow-sm">{isAr ? `وفر ${product.discount}%` : `Save ${product.discount}%`}</span>
          )}
        </div>

        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {gallery.map((url) => (
              <button key={url} onClick={() => setSelectedImage(url)} className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer ${url === mainImage ? 'border-[#941946]' : 'border-transparent'}`}>
                <Thumb src={url} alt="" kind="product" className="w-full h-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      {viewing !== null && <ImageViewer images={photos} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)} />}

      {/* Title, price, order */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        {detail.loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : (
          product && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {product.type && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                    <Tag className="w-3 h-3" />
                    {product.type.name}
                  </span>
                )}
                {product.store && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[#941946] text-[10px] font-bold">
                    <StoreIcon className="w-3 h-3" />
                    {product.store.title}
                  </span>
                )}
              </div>

              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-snug">{product.name}</h1>
              {product.subtitle && product.subtitle !== product.name && <p className="text-xs text-slate-500">{product.subtitle}</p>}

              {(() => {
                const shown = shownPrice(product, member);
                return (
                  <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200/70 space-y-1.5">
                    <div className="flex items-end gap-2">
                      <div className="text-2xl font-black text-[#941946] font-mono leading-none">
                        {shown.price ?? '—'} <span className="text-sm font-sans">{currency}</span>
                      </div>
                      {shown.strike != null && (
                        <span className="text-xs text-slate-500 line-through pb-0.5">
                          {shown.strike} {currency}
                        </span>
                      )}
                    </div>

                    {member ? (
                      product.discount != null && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-emerald-700">{isAr ? 'سعر العضو — بكارتك' : 'Member price — with your card'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black">{isAr ? `خصم ${product.discount}%` : `${product.discount}% off`}</span>
                        </div>
                      )
                    ) : (
                      shown.memberPrice != null && (
                        <button
                          onClick={() => navigate(routeHref({ tab: 'mycard' }))}
                          className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-emerald-200 text-start cursor-pointer"
                        >
                          <span className="text-[11px] font-bold text-emerald-700">
                            {isAr ? `سعر العضو بالكارت: ${shown.memberPrice} ${currency}` : `Member price with a card: ${shown.memberPrice} ${currency}`}
                          </span>
                          {product.discount != null && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black shrink-0">{isAr ? `وفر ${product.discount}%` : `Save ${product.discount}%`}</span>}
                        </button>
                      )
                    )}
                  </div>
                );
              })()}

              {product.purchasable ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-700">{isAr ? 'الكمية' : 'Quantity'}</span>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center cursor-pointer" aria-label="-">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-black font-mono">{qty}</span>
                      <button onClick={() => setQty((q) => Math.min(99, q + 1))} className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center cursor-pointer" aria-label="+">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={handleAdd} className="col-span-2 py-3 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                      {added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                      <span>{added ? (isAr ? 'تمت الإضافة' : 'Added') : isAr ? 'إضافة للسلة' : 'Add to cart'}</span>
                    </button>
                    <button onClick={handleWhatsApp} className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                      <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-500 text-center py-2">{isAr ? 'غير متاح للطلب حالياً' : 'Not available to order'}</p>
              )}

              <ul className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <li className="flex items-center gap-2">
                  <BadgeCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {isAr ? 'يُطبَّق سعر العضو عند إتمام الطلب' : 'Member pricing applied at checkout'}
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {isAr ? 'توصيل لجميع أنحاء مصر' : 'Delivered anywhere in Egypt'}
                </li>
                <li className="flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  {isAr ? 'اتصل بنا وسنساعدك في الاختيار' : 'Call us and we will help you choose'}
                </li>
              </ul>
            </>
          )
        )}
      </div>

      {/* Details */}
      {product && (product.type || product.store) && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <h2 className="text-xs font-black text-slate-900">{isAr ? 'التفاصيل' : 'Details'}</h2>
          <dl className="text-xs space-y-1.5">
            {product.type && (
              <div className="flex gap-3">
                <dt className="w-20 text-slate-500 shrink-0">{isAr ? 'الفئة' : 'Category'}</dt>
                <dd className="font-bold text-slate-800">{product.type.name}</dd>
              </div>
            )}
            {product.store && (
              <div className="flex gap-3">
                <dt className="w-20 text-slate-500 shrink-0">{isAr ? 'المتجر' : 'Store'}</dt>
                <dd className="font-bold text-slate-800">{product.store.title}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Description */}
      {(detail.loading || product?.description) && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2">
          <h2 className="text-xs font-black text-slate-900">{isAr ? 'عن هذا المنتج' : 'About this product'}</h2>
          {detail.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{tidy(product?.description ?? '')}</p>
          )}
        </div>
      )}

      {/* Related */}
      {(related.data?.length ?? 0) > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-sm font-black text-slate-900 px-1">{isAr ? 'منتجات مشابهة' : 'Related products'}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {related.data!.map((p: ProductCard) => (
              <a
                key={p.id}
                href={routeHref({ product: p.slug })}
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  setSelectedImage(null);
                  setQty(1);
                  navigate(routeHref({ product: p.slug }));
                }}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all group"
              >
                <div className="aspect-square bg-slate-100 overflow-hidden">
                  <Thumb src={p.image} alt={p.name} kind="product" className="w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{p.name}</p>
                  {p.subtitle && p.subtitle !== p.name && <p className="text-[10px] text-slate-400 line-clamp-1">{p.subtitle}</p>}
                  <p className="text-xs font-black text-[#941946] font-mono">
                    {shownPrice(p, member).price ?? '—'} <span className="font-sans text-[10px]">{currency}</span>
                  </p>
                  {p.purchasable && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onAddToCart(toCartProduct(p));
                      }}
                      className="w-full py-1.5 bg-[#941946] hover:bg-[#7b1439] text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <ShoppingBag className="w-3 h-3" />
                      <span>{isAr ? 'أضف للسلة' : 'Add to basket'}</span>
                    </button>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Member CTA */}
      <div className="text-center space-y-2.5 py-4">
        <h2 className="text-base font-black text-slate-900">{isAr ? 'أسعار الأعضاء على كل المنتجات' : 'Member prices, on everything here'}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{isAr ? 'كارت ديلر هو ما يحوّل هذه الأسعار إلى أسعار الأعضاء — كارت واحد يغطي أسرتك كلها.' : 'The Deilar card is what turns these into member prices — one card covers everyone at home.'}</p>
        <button onClick={() => navigate(routeHref({ tab: 'mycard' }))} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer">
          {isAr ? 'اعرض كارتك' : 'Check your card'}
        </button>
      </div>
    </div>
  );
};
