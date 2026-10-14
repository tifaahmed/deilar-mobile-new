import { createPortal } from 'react-dom';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, MapPin, X } from 'lucide-react';
import { fetchLocations, fetchNearestAreas, Locations } from '../api/endpoints';
import { getArea, saveArea } from '../utils/area';
import { useLanguage } from '../context/LanguageContext';

interface AreaModalProps {
  lat: number;
  lng: number;
  /** Change the city only: the governorate is already chosen and cannot be switched. */
  lockedGovernorateId?: number;
  onClose: () => void;
}

interface Option {
  id: number;
  name: string;
  distance?: number;
}

const SUGGESTED = 4;

/**
 * Two popups in a row once the GPS fix is in: the governorates closest to the visitor,
 * then the cities of the chosen governorate, closest first. The answer is remembered.
 */
export const AreaModal: React.FC<AreaModalProps> = ({ lat, lng, lockedGovernorateId, onClose }) => {
  const { isAr } = useLanguage();
  const [locations, setLocations] = useState<Locations['governorates'] | null>(null);
  const [nearGov, setNearGov] = useState<{ id: number; distance_km: number }[]>([]);
  const [nearCity, setNearCity] = useState<{ id: number; distance_km: number }[]>([]);
  const [govId, setGovId] = useState<number | null>(lockedGovernorateId ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const c = new AbortController();
    Promise.all([fetchLocations(c.signal), fetchNearestAreas('governorate', lat, lng, SUGGESTED, c.signal)]).then(
      ([all, gov]) => {
        setLocations(all);
        setNearGov(gov);
      },
      () => {
        if (!c.signal.aborted) setFailed(true);
      },
    );
    return () => c.abort();
  }, [lat, lng]);

  // Without a usable answer the visitor should never be stuck behind this popup.
  useEffect(() => {
    if (failed) onClose();
  }, [failed, onClose]);

  const govOptions = useMemo<Option[]>(() => {
    if (!locations) return [];
    const byId = new Map(locations.map((g) => [g.id, g]));
    const near = nearGov.flatMap((n) => (byId.has(n.id) ? [{ id: n.id, name: byId.get(n.id)!.name, distance: n.distance_km }] : []));
    return near.length ? near : locations.map((g) => ({ id: g.id, name: g.name }));
  }, [locations, nearGov]);

  const gov = locations?.find((g) => g.id === govId) ?? null;

  // Distances to the cities of the governorate that was just chosen.
  useEffect(() => {
    setNearCity([]);
    if (govId === null) return;
    const c = new AbortController();
    fetchNearestAreas('city', lat, lng, 60, c.signal, govId).then(setNearCity, () => undefined);
    return () => c.abort();
  }, [govId, lat, lng]);

  const cityOptions = useMemo<Option[]>(() => {
    if (!gov) return [];
    const rank = new Map(nearCity.map((n) => [n.id, n.distance_km]));
    return gov.cities
      .map((c) => ({ id: c.id, name: c.name, distance: rank.get(c.id) }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity) || a.name.localeCompare(b.name, isAr ? 'ar' : 'en'));
  }, [gov, nearCity, isAr]);

  const chooseGovernorate = (o: Option) => {
    const g = locations?.find((x) => x.id === o.id);
    if (g && g.cities.length === 0) {
      saveArea({ governorate: { id: g.id, name: g.name }, point: { lat, lng } });
      onClose();
      return;
    }
    setGovId(o.id);
  };

  const chooseCity = (o?: Option) => {
    if (!gov) return;
    saveArea({ governorate: { id: gov.id, name: gov.name }, point: { lat, lng }, ...(o ? { city: { id: o.id, name: o.name } } : {}) });
    onClose();
  };

  const distanceLabel = (o: Option) =>
    o.distance === undefined ? '' : o.distance === 0 ? (isAr ? 'موقعك الحالي' : 'You are here') : isAr ? `${o.distance} كم` : `${o.distance} km`;

  const currentCityId = getArea()?.city?.id;
  const title = gov ? (isAr ? 'اختر مدينتك' : 'Choose your city') : isAr ? 'اختر محافظتك' : 'Choose your governorate';
  const subtitle = gov ? (lockedGovernorateId ? (isAr ? `المدن داخل ${gov.name} - الأقرب أولاً` : `Cities in ${gov.name} - closest first`) : gov.name) : isAr ? 'الأقرب إلى موقعك الحالي' : 'Closest to your current location';

  const row = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border text-xs font-bold cursor-pointer transition-all active:scale-[0.99] ${
      active ? 'bg-rose-50 border-[#931A47] text-[#931A47]' : 'bg-white border-slate-200 text-slate-800 hover:border-rose-300 hover:bg-rose-50/60'
    }`;

  const badge = (i: number, active: boolean) => (
    <span className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-black ${active ? 'bg-[#931A47] text-white' : 'bg-slate-100 text-slate-500'}`}>
      {active ? <Check className="w-3.5 h-3.5" /> : i + 1}
    </span>
  );

  const distance = (o: Option) => {
    const label = distanceLabel(o);
    return label ? (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${o.distance === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{label}</span>
    ) : null;
  };

  // Portalled to <body>: inside the header, its transform/blur would make `fixed` relative to the header.
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`bg-white text-slate-900 rounded-3xl max-w-[340px] w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 ${isAr ? 'text-right' : 'text-left'}`}>
        <div className="relative bg-gradient-to-br from-[#931A47] to-[#6d1235] text-white px-4 pt-4 pb-3.5">
          <button onClick={onClose} className="absolute top-3 end-3 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer" title={isAr ? 'إغلاق' : 'Close'}>
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </span>
            <div className="min-w-0 pe-8">
              <h3 className="text-sm font-black leading-tight">{title}</h3>
              <p className="text-[11px] text-white/80 mt-0.5 truncate">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-2 overflow-y-auto">
          {!locations ? (
            <div className="py-10 flex justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : gov ? (
            <>
              {!lockedGovernorateId && (
                <button onClick={() => setGovId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer px-1">
                  {isAr ? '← رجوع' : '← Back'}
                </button>
              )}
              {cityOptions.map((o, i) => (
                <button key={o.id} onClick={() => chooseCity(o)} className={row(o.id === currentCityId)}>
                  {badge(i, o.id === currentCityId)}
                  <span className="flex-1 text-start truncate">{o.name}</span>
                  {distance(o)}
                </button>
              ))}
              <button onClick={() => chooseCity()} className={row(currentCityId === undefined && !!lockedGovernorateId)}>
                <span className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-slate-100 text-slate-500">
                  {currentCityId === undefined && lockedGovernorateId ? <Check className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                </span>
                <span className="flex-1 text-start">{isAr ? `كل مدن ${gov.name}` : `All cities in ${gov.name}`}</span>
              </button>
            </>
          ) : (
            govOptions.map((o, i) => (
              <button key={o.id} onClick={() => chooseGovernorate(o)} className={row(false)}>
                {badge(i, false)}
                <span className="flex-1 text-start truncate">{o.name}</span>
                {distance(o)}
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
