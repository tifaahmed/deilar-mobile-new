import React, { useState } from 'react';
import { Search, X, MapPin, ChevronLeft, Building2 } from 'lucide-react';
import type { FacilityCard } from '../api/types';
import { api, PATHS } from '../api/endpoints';
import { formatKm, roundCoord } from '../api/adapters';
import { useDebounced } from '../hooks/useDebounced';
import { usePaged } from '../hooks/usePaged';
import type { Area } from '../utils/area';
import { useGovernorates } from '../hooks/useCatalog';
import { useLanguage } from '../context/LanguageContext';
import { ErrorState, ListSkeleton, LoadMore } from './ui/Feedback';
import { Thumb } from './ui/Thumb';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number };
  area?: Area | null;
  onSelectProvider: (provider: FacilityCard) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, userLocation, area, onSelectProvider }) => {
  const { isAr } = useLanguage();
  const [query, setQuery] = useState('');
  const [governorateId, setGovernorateId] = useState<number | null>(area?.governorate.id ?? null);

  // The server does the matching (Arabic-aware) and the nearest-first ordering;
  // we only wait for the typing to settle so one request covers a whole word.
  const q = useDebounced(query.trim(), 350);
  const governorates = useGovernorates(isOpen);

  const params = {
    q,
    governorate_id: governorateId,
    city_id: governorateId === area?.governorate.id ? area?.city?.id : undefined,
    lat: roundCoord(userLocation.lat),
    lng: roundCoord(userLocation.lng),
    per_page: 12,
  };
  const list = usePaged<FacilityCard>(PATHS.facilities, params, (page, signal) => api.facilities({ ...params, page }, signal), isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className={`bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150 ${isAr ? 'text-right' : 'text-left'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-rose-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder={isAr ? 'ابحث باسم المستشفى، المعمل، الدواء، أو التخصص...' : 'Search hospital, lab, pharmacy or specialty...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Governorates filter */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-400 shrink-0 font-medium">{isAr ? 'المحافظة:' : 'Governorate:'}</span>
          {[{ id: null, name: isAr ? 'جميع المحافظات' : 'All governorates' }, ...(governorates.data ?? [])].map((g) => (
            <button
              key={g.id ?? 'all'}
              onClick={() => setGovernorateId(g.id)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                governorateId === g.id ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {list.loading && <ListSkeleton rows={5} />}
          {list.error && <ErrorState onRetry={list.reload} />}

          {list.items.map((provider) => (
            <div
              key={provider.id}
              onClick={() => onSelectProvider(provider)}
              className="p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Thumb src={provider.logo} alt={provider.name} kind="facility" fit="contain" className="w-10 h-10 rounded-xl border border-slate-200 shrink-0" />

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition-colors truncate">{provider.name}</h4>
                    {provider.discount != null && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded shrink-0">
                        {isAr ? `خصم ${provider.discount}%` : `${provider.discount}% OFF`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    {provider.distance_km != null && (
                      <>
                        <span className="text-rose-700 font-semibold flex items-center gap-0.5 shrink-0">
                          <MapPin className="w-3 h-3" />
                          {formatKm(provider.distance_km, isAr)}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span className="truncate max-w-[12.5rem]">{[provider.type?.name, provider.branch?.city].filter(Boolean).join(' • ')}</span>
                  </div>
                </div>
              </div>

              <ChevronLeft className={`w-4 h-4 text-slate-400 group-hover:text-rose-700 transition-colors shrink-0 ${isAr ? '' : 'rotate-180'}`} />
            </div>
          ))}

          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />

          {!list.loading && !list.error && list.items.length === 0 && (
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">{isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'No results match your search'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'جرب البحث بكلمة عامة مثل "معمل" أو "أشعة" أو "صيدلية"' : 'Try a general word such as "lab", "radiology" or "pharmacy"'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
