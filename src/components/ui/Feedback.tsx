import React, { useEffect, useRef } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/** A shimmering block; compose into screen-shaped placeholders. */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/80 dark:bg-white/10 rounded-xl ${className}`} />
);

export const ListSkeleton: React.FC<{ rows?: number; grid?: boolean }> = ({ rows = 4, grid = false }) =>
  grid ? (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200/70 overflow-hidden bg-white">
          <Skeleton className="aspect-square rounded-none" />
          <div className="p-2.5 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200/70 bg-white">
          <Skeleton className="w-16 h-16 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

export const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { isAr } = useLanguage();
  return (
    <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
      <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-2" />
      <p className="text-sm font-bold text-slate-800">{isAr ? 'تعذر تحميل البيانات' : 'Could not load data'}</p>
      <p className="text-xs text-slate-500 mt-1">{isAr ? 'تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى' : 'Check your connection and try again'}</p>
      <button onClick={onRetry} className="mt-3 px-4 py-2 bg-[#941946] text-white rounded-xl text-xs font-bold cursor-pointer">
        {isAr ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );
};

/**
 * Sits under an infinite list: asks for the next page shortly before it
 * scrolls into view, so scrolling never stalls on a request.
 */
export const LoadMore: React.FC<{ hasMore: boolean; loading: boolean; onLoadMore: () => void }> = ({ hasMore, loading, onLoadMore }) => {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onLoadMore);
  callback.current = onLoadMore;

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && callback.current(), { rootMargin: '400px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="flex justify-center py-4" aria-hidden={!loading}>
      {loading && <Loader2 className="w-5 h-5 text-[#941946] animate-spin" />}
    </div>
  );
};
