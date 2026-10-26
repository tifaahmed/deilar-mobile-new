import React, { useState } from 'react';
import { Check, MessageCircle, ShoppingBag, Store as StoreIcon, X } from 'lucide-react';
import type { ProductCard, ProductDetail } from '../api/types';
import { api } from '../api/endpoints';
import { shownPrice, useIsMember } from '../utils/pricing';
import { useApi } from '../hooks/useApi';
import { useContact } from '../hooks/useCatalog';
import { useLanguage } from '../context/LanguageContext';
import { Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { ImageViewer } from './ImageViewer';
import { usePopupHash } from '../utils/popupHash';

interface ProductDetailModalProps {
  /** The card that was tapped — shown at once; description and gallery load behind it. */
  product: ProductCard;
  onClose: () => void;
  onAddToCart: (product: ProductCard) => void;
  onOpenStore?: (store: NonNullable<ProductCard['store']>) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart, onOpenStore }) => {
  usePopupHash('product-popup');
  const { isAr } = useLanguage();
  const contact = useContact();
  const member = useIsMember();
  const shown = shownPrice(product, member);
  const detail = useApi<ProductDetail>(`product:${product.slug}:${isAr}`, (signal) => api.product(product.slug, signal));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const gallery = detail.data?.gallery ?? [];
  const mainImage = selectedImage ?? gallery[0] ?? product.image;
  const photos = gallery.length ? gallery : product.image ? [product.image] : [];
  const currency = isAr ? 'ج.م' : 'EGP';

  const handleWhatsApp = () => {
    const message = isAr
      ? `مرحباً، أود طلب منتج (${product.name})${product.store ? ` من متجر (${product.store.title})` : ''} بسعر العرض (${shown.price} ${currency}).`
      : `Hello, I would like to order (${product.name})${product.store ? ` from (${product.store.title})` : ''} at the offer price (${shown.price} ${currency}).`;
    if (contact.whatsapp) window.open(`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in" onClick={onClose}>
      <div
        className={`bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-5 shadow-2xl space-y-3.5 ${isAr ? 'text-right' : 'text-left'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {product.store && onOpenStore && (
              <button
                onClick={() => onOpenStore(product.store!)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#941946] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 mb-1 max-w-full"
              >
                <StoreIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{isAr ? `متجر: ${product.store.title} (انقر لعرض المتجر)` : `Store: ${product.store.title} (tap to view)`}</span>
              </button>
            )}
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">{product.name}</h2>
            {product.subtitle && product.subtitle !== product.name && <p className="text-[11px] text-slate-500 mt-0.5">{product.subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 ${photos.length ? 'cursor-zoom-in' : ''}`} onClick={() => photos.length && setViewing(Math.max(0, photos.indexOf(mainImage ?? '')))}>
          <Thumb src={mainImage} alt={product.name} kind="product" className="w-full h-full" />
        </div>

        {gallery.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {gallery.map((url) => (
              <button
                key={url}
                onClick={() => setSelectedImage(url)}
                className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 ${url === mainImage ? 'border-[#941946]' : 'border-transparent'}`}
              >
                <Thumb src={url} alt="" kind="product" className="w-full h-full" />
              </button>
            ))}
          </div>
        )}

        {detail.loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ) : (
          detail.data?.description && <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{detail.data.description}</p>
        )}

        <div className="flex items-center justify-between gap-2 p-3 bg-rose-50/70 rounded-2xl border border-rose-200/70">
          <div>
            {shown.strike != null && (
              <span className="text-[11px] text-slate-500 line-through">
                {shown.strike} {currency}
              </span>
            )}
            <div className="text-lg font-black text-[#941946] font-mono">
              {shown.price ?? '—'} <span className="text-xs font-sans">{currency}</span>
            </div>
            {shown.memberPrice != null && (
              <div className="text-[10px] font-bold text-emerald-700">{isAr ? `بالكرت ${shown.memberPrice} ${currency}` : `${shown.memberPrice} ${currency} with a card`}</div>
            )}
          </div>

          {product.purchasable ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleWhatsApp}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'طلب واتساب' : 'WhatsApp'}</span>
              </button>

              <button
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className="px-3.5 py-2 bg-[#941946] hover:bg-[#7b1439] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة للسلة' : 'Add to cart'}</span>
              </button>
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 opacity-0" />
              {isAr ? 'غير متاح للطلب حالياً' : 'Not available to order'}
            </span>
          )}
        </div>
      </div>
      {viewing !== null && <ImageViewer images={photos} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)} />}
    </div>
  );
};
