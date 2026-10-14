import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import type { BranchPage, BranchRow } from '../api/types';
import { directionsUrl, formatKm, whatsappNumber } from '../api/adapters';
import { isAbort } from '../api/http';
import { useLanguage } from '../context/LanguageContext';
import { Skeleton } from './ui/Feedback';

interface BranchListProps {
  /** First page, already delivered with the parent's detail response. */
  first: BranchRow[] | undefined;
  hasMore: boolean;
  loading: boolean;
  /** Fetches page `n` (n >= 2). */
  loadPage: (page: number) => Promise<BranchPage>;
  /** A new owner / position means a new list. */
  resetKey: string;
}

/** A card of an owner's branches: the first page is free, the rest is one tap each. */
export const BranchList: React.FC<BranchListProps> = ({ first, hasMore, loading, loadPage, resetKey }) => {
  const { isAr } = useLanguage();
  const [extra, setExtra] = useState<BranchRow[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(hasMore);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setExtra([]);
    setPage(1);
    setMore(hasMore);
    setFailed(false);
  }, [resetKey, first, hasMore]);

  const loadMore = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await loadPage(page + 1);
      setExtra((prev) => [...prev, ...res.branches]);
      setPage((p) => p + 1);
      setMore(res.has_more);
    } catch (e) {
      if (!isAbort(e)) setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const branches = [...(first ?? []), ...extra];

  // Nothing to list (e.g. an online-only store): no empty "Branches" card.
  if (!loading && branches.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
      <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
        <MapPin className="w-4 h-4 text-[#941946]" />
        <span>{isAr ? 'الفروع' : 'Branches'}</span>
      </h3>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {branches.map((branch) => {
          const dir = directionsUrl(branch.lat, branch.lng, branch.maps_url);
          return (
            <div key={branch.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs font-bold text-slate-900">{[branch.governorate, branch.city].filter(Boolean).join(' - ') || branch.name}</p>
                {branch.address && <p className="text-[11px] text-slate-500 leading-relaxed">{branch.address}</p>}
                {(branch.phone || branch.whatsapp) && (
                  <p dir="ltr" className={`text-[11px] font-mono text-slate-600 ${isAr ? 'text-right' : 'text-left'}`}>
                    {branch.phone}
                    {branch.whatsapp && branch.whatsapp !== branch.phone && <span className="text-[#25D366]">{branch.phone ? ' · ' : ''}WhatsApp {branch.whatsapp}</span>}
                  </p>
                )}
                {branch.distance_km != null && (
                  <p className="text-[11px] font-bold text-rose-700">{isAr ? `يبعد ${formatKm(branch.distance_km, isAr)}` : `${formatKm(branch.distance_km, isAr)} away`}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {branch.phone && (
                  <a href={`tel:${branch.phone}`} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-emerald-600" title={branch.phone}>
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
                {whatsappNumber(branch.whatsapp) && (
                  <a href={`https://wa.me/${whatsappNumber(branch.whatsapp)}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#25D366]" title="WhatsApp">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}
                {dir && (
                  <a href={dir} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-rose-700">
                    <Navigation className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {more && (
        <button
          onClick={loadMore}
          disabled={busy}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{failed ? (isAr ? 'تعذر التحميل - أعد المحاولة' : 'Failed - retry') : isAr ? 'عرض المزيد من الفروع' : 'Show more branches'}</span>
        </button>
      )}
    </div>
  );
};
