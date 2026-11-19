import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePopupHash } from '../utils/popupHash';
import { closeDiscountInfo, openDiscountInfo, useDiscountInfo, type DiscountInfo } from '../utils/discountInfo';

/** One popup for every discount in the app (mounted once in App): tap a discount, read why it is there and from how much. */
export const DiscountInfoPopup: React.FC = () => {
  const { isAr } = useLanguage();
  const info = useDiscountInfo();
  usePopupHash('discount-popup', !!info);
  if (!info) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-slate-950/50 p-3" onClick={closeDiscountInfo} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        dir={isAr ? 'rtl' : 'ltr'}
        data-testid="discount-popup"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl space-y-3 text-start"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-black text-slate-800">{info.title}</h2>
          <button onClick={closeDiscountInfo} aria-label={isAr ? 'إغلاق' : 'Close'} className="text-slate-400 cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">{info.why}</p>
        {!!info.rows?.length && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5 space-y-1.5 text-xs">
            {info.rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-2">
                <span className="text-slate-500">{r.label}</span>
                <span className="font-black font-mono text-slate-800">{r.value}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={closeDiscountInfo} className="w-full py-2.5 rounded-2xl bg-[#941946] text-white text-xs font-extrabold cursor-pointer">
          {isAr ? 'تمام' : 'Got it'}
        </button>
      </div>
    </div>
  );
};

/** A discount tag you can tap: opens the popup. Safe inside a card/link (the tap does not open the card). */
export const DiscountTag: React.FC<{ info: () => DiscountInfo; className?: string; children: React.ReactNode }> = ({ info, className = '', children }) => {
  const open = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openDiscountInfo(info());
  };
  return (
    <span
      role="button"
      tabIndex={0}
      data-testid="discount-tag"
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open(e)}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </span>
  );
};
