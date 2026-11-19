import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FacilityCard, StoreCard } from '../api/types';
import { useLanguage } from '../context/LanguageContext';
import { Link, type SortKey } from '../router';
import { Thumb } from './ui/Thumb';
import { offerLabel } from './StoreDetailView';
import { DiscountTag } from './DiscountInfoPopup';
import { offerDiscountInfo } from '../utils/discountInfo';

const MAX_ITEMS = 12; // the whole strip is fetched at once; «see more» closes it

interface HomeShelfProps {
  kind: 'medical' | 'store';
  sort: SortKey;
  title: string;
  /** The twelve cards; null while the home data is still on its way. */
  items: (FacilityCard | StoreCard)[] | null;
}

/**
 * One home-page strip («أفضل المتاجر», «أحدث مقدمي الخدمة الطبية»...). It never moves by itself: the member drags it.
 * It holds twelve cards (the server keeps them saved and rebuilds them daily), and the last tile is «شاهد المزيد», which opens
 * the stores map / the medical map with the same order already applied.
 */
export const HomeShelf: React.FC<HomeShelfProps> = ({ kind, sort, title, items: given }) => {
  const { isAr } = useLanguage();
  const medical = kind === 'medical';
  const items = (given ?? []).slice(0, MAX_ITEMS);
  const list = { loading: given === null };
  if (!list.loading && items.length === 0) return null;

  const more = medical ? { tab: 'map' as const, view: 'list' as const, sort, radius: 0 } : { tab: 'store' as const, storeMap: true, storeSort: sort };
  const Arrow = isAr ? ChevronLeft : ChevronRight;

  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className="px-1">
        <Link to={more} className="inline-flex items-center gap-1 text-sm font-black text-slate-800 active:opacity-70">
          {title}
          <Arrow className="w-4 h-4 text-[#941946]" aria-hidden="true" />
        </Link>
      </h2>
      <div dir={isAr ? 'rtl' : 'ltr'} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
        <div className="flex w-max gap-2.5">
          {list.loading && items.length === 0 && [0, 1, 2].map((i) => <div key={i} className="w-36 h-40 rounded-2xl bg-slate-100 animate-pulse shrink-0" />)}
          {items.map((it) => {
            const store = !medical;
            const s = it as StoreCard;
            const f = it as FacilityCard;
            const name = store ? s.title : f.name;
            const badge = store ? offerLabel(s.offer_from, s.offer_to, isAr) : f.discount != null ? (isAr ? `خصم ${f.discount}%` : `${f.discount}% off`) : null;
            const sub = store ? s.categories[0]?.name : f.type?.name;

            return (
              <Link
                key={`${kind}-${it.id}`}
                to={store ? { store: s.slug } : { facility: f.slug }}
                className="w-36 shrink-0 rounded-2xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden active:scale-95 transition-transform"
              >
                <div className="relative">
                  <Thumb src={store ? s.logo : f.logo} alt={name} kind={store ? 'store' : 'facility'} fit="contain" className="w-full h-20 bg-white" />
                  {badge && <DiscountTag info={() => offerDiscountInfo({ name, label: badge }, isAr)} className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shadow-xs">{badge}</DiscountTag>}
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-[11px] font-black text-slate-800 leading-tight line-clamp-2 min-h-[1.9rem]" dir="auto">{name}</p>
                  {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
                </div>
              </Link>
            );
          })}
          {items.length > 0 && (
            <Link to={more} className="w-36 shrink-0 rounded-2xl bg-gradient-to-br from-[#941946] to-rose-700 text-white flex flex-col items-center justify-center gap-1.5 font-black text-xs active:scale-95 transition-transform">
              <span>{isAr ? 'شاهد المزيد' : 'See more'}</span>
              <Arrow className="w-5 h-5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};
