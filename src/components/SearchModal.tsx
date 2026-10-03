import React, { useState } from 'react';
import { Search, X, MapPin, Star, ChevronLeft, Building2 } from 'lucide-react';
import { MedicalProvider } from '../types';
import { formatDistance } from '../utils/geo';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: (MedicalProvider & { distanceKm: number })[];
  onSelectProvider: (provider: MedicalProvider) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  providers,
  onSelectProvider,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  if (!isOpen) return null;

  const filtered = providers.filter((p) => {
    const matchesCity = selectedCity === 'all' || p.city === selectedCity;
    const matchesQuery =
      query.trim() === '' ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.specialty.toLowerCase().includes(query.toLowerCase()) ||
      p.area.toLowerCase().includes(query.toLowerCase()) ||
      p.categoryAr.includes(query);

    return matchesCity && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col text-right animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-rose-600 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="ابحث باسم المستشفى، المعمل، الدواء، أو التخصص..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-rose-600"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Governorates Filter */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
          <span className="text-slate-400 shrink-0 font-medium">المحافظة:</span>
          {['all', 'القاهرة', 'الجيزة', 'الإسكندرية'].map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                selectedCity === city
                  ? 'bg-rose-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {city === 'all' ? 'جميع المحافظات' : city}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.map((provider) => (
            <div
              key={provider.id}
              onClick={() => {
                onSelectProvider(provider);
                onClose();
              }}
              className="p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-xs shrink-0 group-hover:bg-rose-50 group-hover:text-rose-700">
                  {provider.logo.substring(0, 3)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                      {provider.name}
                    </h4>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                      {provider.discount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="text-rose-700 font-semibold flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {formatDistance(provider.distanceKm)}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{provider.area}</span>
                  </div>
                </div>
              </div>

              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-rose-700 transition-colors" />
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">لا توجد نتائج مطابقة لبحثك</p>
              <p className="text-[11px] text-slate-400 mt-0.5">جرب البحث بكلمة عامة مثل "معمل" أو "أشعة" أو "المعادي"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
