import React, { useEffect, useMemo, useState } from 'react';
import { api, fetchLocations, type Locations } from '../api/endpoints';
import { useIsAr } from '../context/LanguageContext';
import { useArea } from '../utils/area';

interface Props {
  govId: number | null;
  cityId: number | null;
  onChange: (govId: number | null, cityId: number | null) => void;
}

/**
 * Governorate → city buttons for the stores page, the same idea as the list of /map: the member's own area is marked ★ and first, the
 * city row appears only after a governorate is picked. An area with no store is never offered (`/mobile/store-areas`), and a row with
 * nothing to pick is not drawn at all.
 */
export const StoreAreaFilter: React.FC<Props> = ({ govId, cityId, onChange }) => {
  const isAr = useIsAr();
  const myArea = useArea();
  const [locations, setLocations] = useState<Locations['governorates']>([]);
  const [withStores, setWithStores] = useState<{ id: number; cities: number[] }[] | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetchLocations(c.signal).then(setLocations, () => undefined);
    api.storeAreas(c.signal).then(setWithStores, () => setWithStores([]));
    return () => c.abort();
  }, []);

  const mineGov = myArea?.governorate.id;
  const mineCity = myArea?.city?.id;
  const order = <T extends { id: number; name: string }>(items: T[], mineId?: number) =>
    [...items].sort((a, b) => Number(b.id === mineId) - Number(a.id === mineId) || a.name.localeCompare(b.name, isAr ? 'ar' : 'en'));

  const govs = useMemo(() => {
    const ids = new Set((withStores ?? []).map((a) => a.id));
    return order(locations.filter((g) => ids.has(g.id)), mineGov);
  }, [locations, withStores, mineGov, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(() => {
    const ids = new Set(withStores?.find((a) => a.id === govId)?.cities ?? []);
    return order((locations.find((g) => g.id === govId)?.cities ?? []).filter((c) => ids.has(c.id)), govId === mineGov ? mineCity : undefined);
  }, [locations, withStores, govId, mineGov, mineCity, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  // No governorate holds a store (or nothing loaded yet): nothing to draw.
  if (govs.length === 0) return null;

  const rows = [
    { key: 'gov', all: isAr ? 'كل المحافظات' : 'All governorates', items: govs, value: govId, mine: mineGov, pick: (id: number | null) => onChange(id, null) },
    ...(govId && cities.length > 0 ? [{ key: 'city', all: isAr ? 'كل المدن' : 'All cities', items: cities, value: cityId, mine: govId === mineGov ? mineCity : undefined, pick: (id: number | null) => onChange(govId, id) }] : []),
  ];

  return (
    <div data-testid="store-area-filter" className="bg-white rounded-2xl px-3 py-2 border border-slate-200/90 shadow-2xs space-y-2 text-[11px]">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[{ id: null as number | null, name: row.all }, ...row.items].map((o) => {
            const isMine = o.id != null && o.id === row.mine;
            const isOn = row.value === o.id;
            return (
              <button key={o.id ?? 'all'} type="button" aria-pressed={isOn} onClick={() => row.pick(o.id)} className={`px-2.5 py-1 rounded-lg font-bold shrink-0 whitespace-nowrap border transition-colors ${isMine ? (isOn ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-emerald-50 border-emerald-400 text-emerald-700') : isOn ? 'bg-rose-700 border-rose-700 text-white' : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'}`}>
                {isMine && '★ '}{o.name}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
