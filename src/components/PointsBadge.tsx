import React from 'react';
import { useIsAr } from '../context/LanguageContext';
import type { Product } from '../types';
import { formatNumber } from '../utils/formatNumber';

/** Says whether loyalty points can pay part of this product, and the most points it may take in one order. */
export const PointsBadge: React.FC<{ product: Pick<Product, 'pointsPayable' | 'pointsMax'>; compact?: boolean }> = ({ product, compact }) => {
  const isAr = useIsAr();
  const size = compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1';

  if (!product.pointsPayable) {
    return <span data-testid="points-badge-no" className={`inline-block rounded-lg bg-slate-100 text-slate-500 font-bold ${size}`}>{isAr ? 'لا يقبل نقاط الولاء' : 'No loyalty points'}</span>;
  }

  const max = product.pointsMax;
  const text = max != null && max > 0
    ? isAr ? `⭐ يقبل نقاط الولاء — حتى ${formatNumber(max, true)} نقطة` : `⭐ Accepts loyalty points — up to ${max} points`
    : isAr ? '⭐ يقبل نقاط الولاء' : '⭐ Accepts loyalty points';
  return <span data-testid="points-badge-yes" className={`inline-block rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold ${size}`}>{text}</span>;
};
