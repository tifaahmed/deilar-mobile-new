import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { fetchLocations, fetchNearestAreas, type Locations } from '../api/endpoints';
import { getSavedGps } from '../utils/gps';
import { getArea } from '../utils/area';
import { useLanguage } from '../context/LanguageContext';

interface AreaPickerProps {
  governorateId: number | null;
  cityId: number | null;
  onChange: (governorateId: number | null, cityId: number | null) => void;
  dark?: boolean;
}

/** One sliding row of buttons; the chosen one scrolls into view. */
const Row: React.FC<{ items: { id: number; name: string }[]; value: number | null; onPick: (id: number) => void; dark?: boolean }> = ({ items, value, onPick, dark }) => {
  const chosen = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    chosen.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [value, items.length]);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x pb-1 -mx-1 px-1">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            ref={on ? chosen : undefined}
            type="button"
            onClick={() => onPick(it.id)}
            aria-pressed={on}
            className={`snap-center shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              on
                ? 'bg-[#941946] border-[#941946] text-white shadow-xs'
                : dark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9] hover:border-[#941946]' : 'bg-white border-slate-200 text-slate-700 hover:border-[#941946]'
            }`}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Governorate and city as sliding buttons, the closest to this device first. The city row appears once
 * a governorate is chosen. Distances come from the borders endpoint; without a known position the order is by name.
 */
export const AreaPicker: React.FC<AreaPickerProps> = ({ governorateId, cityId, onChange, dark }) => {
  const { isAr } = useLanguage();
  const [locations, setLocations] = useState<Locations['governorates']>([]);
  const [govDist, setGovDist] = useState<Map<number, number>>(new Map());
  const [cityDist, setCityDist] = useState<Map<number, number>>(new Map());
  const point = getSavedGps() ?? getArea()?.point ?? null;

  useEffect(() => {
    const c = new AbortController();
    fetchLocations(c.signal).then(setLocations, () => undefined);
    if (point) fetchNearestAreas('governorate', point.lat, point.lng, 40, c.signal).then((r) => setGovDist(new Map(r.map((x) => [x.id, x.distance_km]))), () => undefined);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCityDist(new Map());
    if (!governorateId || !point) return;
    const c = new AbortController();
    fetchNearestAreas('city', point.lat, point.lng, 200, c.signal, governorateId).then((r) => setCityDist(new Map(r.map((x) => [x.id, x.distance_km]))), () => undefined);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [governorateId]);

  const byCloseness = <T extends { id: number; name: string }>(items: T[], dist: Map<number, number>) =>
    [...items].sort((a, b) => (dist.get(a.id) ?? Infinity) - (dist.get(b.id) ?? Infinity) || a.name.localeCompare(b.name, isAr ? 'ar' : 'en'));

  const govs = useMemo(() => byCloseness(locations, govDist), [locations, govDist, isAr]); // eslint-disable-line react-hooks/exhaustive-deps
  const cities = useMemo(() => byCloseness(locations.find((g) => g.id === governorateId)?.cities ?? [], cityDist), [locations, governorateId, cityDist, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = `text-[11px] font-bold flex items-center gap-1.5 mb-1.5 ${dark ? 'text-[#F1F5F9]' : 'text-slate-700'}`;

  return (
    <div className="space-y-3">
      <div>
        <span className={label}><MapPin className="w-3.5 h-3.5 text-[#941946]" />{isAr ? 'المحافظة (الأقرب أولاً)' : 'Governorate (closest first)'}</span>
        <Row items={govs} value={governorateId} onPick={(id) => onChange(id, null)} dark={dark} />
      </div>
      {governorateId !== null && cities.length > 0 && (
        <div>
          <span className={label}><MapPin className="w-3.5 h-3.5 text-[#941946]" />{isAr ? 'المدينة (الأقرب أولاً)' : 'City (closest first)'}</span>
          <Row items={cities} value={cityId} onPick={(id) => onChange(governorateId, id)} dark={dark} />
        </div>
      )}
    </div>
  );
};
