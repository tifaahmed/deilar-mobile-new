import React, { useState } from 'react';
import { Briefcase, CheckCircle2, Home, Loader2, MapPin, Pencil } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ApiError } from '../api/http';
import { fetchAddresses, saveAddress, type AddressType, type MemberAddress } from '../api/auth';
import { useApi } from '../hooks/useApi';
import { AreaPicker } from './AreaPicker';
import { reportClientError } from '../utils/reportError';

const KINDS: { type: AddressType; icon: React.ElementType; ar: string; en: string }[] = [
  { type: 'home', icon: Home, ar: 'المنزل', en: 'Home' },
  { type: 'work', icon: Briefcase, ar: 'العمل', en: 'Work' },
  { type: 'other', icon: MapPin, ar: 'آخر', en: 'Other' },
];

const summary = (a: MemberAddress) =>
  [a.street, a.building_number, a.floor_number && `Fl ${a.floor_number}`, a.apartment_number && `Apt ${a.apartment_number}`, a.city_name, a.governorate_name, a.special_mark]
    .filter(Boolean)
    .join('، ');

/** One address (home, work or other): its summary, and a form to add or change it. */
const AddressCard: React.FC<{ kind: (typeof KINDS)[number]; saved: MemberAddress | undefined; token: string; dark: boolean; onSaved: () => void }> = ({ kind, saved, token, dark, onSaved }) => {
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [gov, setGov] = useState<number | null>(saved?.governorate_id ?? null);
  const [city, setCity] = useState<number | null>(saved?.city_id ?? null);
  const [street, setStreet] = useState(saved?.street ?? '');
  const [building, setBuilding] = useState(saved?.building_number ?? '');
  const [floor, setFloor] = useState(saved?.floor_number ?? '');
  const [apartment, setApartment] = useState(saved?.apartment_number ?? '');
  const [mark, setMark] = useState(saved?.special_mark ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const Icon = kind.icon;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!gov) { setError(isAr ? 'اختر المحافظة' : 'Choose the governorate'); return; }
    if (street.trim().length < 3) { setError(isAr ? 'اكتب العنوان (الشارع والمنطقة)' : 'Write the address (street and area)'); return; }
    setBusy(true);
    setError(null);
    try {
      await saveAddress(token, {
        type: kind.type, governorate_id: gov, city_id: city, street: street.trim(),
        building_number: building.trim() || undefined, floor_number: floor.trim() || undefined,
        apartment_number: apartment.trim() || undefined, special_mark: mark.trim() || undefined,
      });
      setDone(true);
      setOpen(false);
      onSaved();
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      const first = err instanceof ApiError && err.status === 422 ? Object.values((err.body?.errors ?? {}) as Record<string, string[]>)[0]?.[0] : undefined;
      setError(first ?? (isAr ? 'تعذر حفظ العنوان. حاول مرة أخرى.' : 'The address could not be saved. Please try again.'));
      if (!(err instanceof ApiError) || err.status >= 500) reportClientError('Saving an address failed', err, { type: kind.type });
    } finally {
      setBusy(false);
    }
  };

  const box = dark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-slate-50 border-slate-200/80';
  const input = `w-full px-3 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${dark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'}`;
  const lab = `text-[11px] font-bold block mb-1 ${dark ? 'text-[#F1F5F9]' : 'text-slate-700'}`;

  return (
    <div className={`rounded-2xl border ${box}`}>
      <div className="p-3 flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#941946]/15 text-[#941946] flex items-center justify-center shrink-0"><Icon className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black">{isAr ? kind.ar : kind.en}</p>
          <p className={`text-[11px] leading-relaxed mt-0.5 ${dark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
            {saved ? summary(saved) : isAr ? 'لم تُضف عنواناً بعد' : 'No address added yet'}
          </p>
          {done && <p className="mt-1 text-[11px] font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{isAr ? 'تم الحفظ' : 'Saved'}</p>}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} className="px-3 py-1.5 rounded-xl border border-[#941946] text-[#941946] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0">
          <Pencil className="w-3 h-3" />{saved ? (isAr ? 'تعديل' : 'Edit') : isAr ? 'إضافة' : 'Add'}
        </button>
      </div>

      {open && (
        <form onSubmit={submit} noValidate className={`px-3 pb-3 pt-1 space-y-3 border-t animate-in fade-in duration-150 ${dark ? 'border-white/[0.08]' : 'border-slate-200/80'}`}>
          <AreaPicker dark={dark} governorateId={gov} cityId={city} onChange={(g, c) => { setGov(g); setCity(c); setError(null); }} />
          <div>
            <label className={lab}>{isAr ? 'العنوان (الشارع والمنطقة)' : 'Address (street and area)'} <span className="text-red-600 font-black">*</span></label>
            <input value={street} maxLength={255} onChange={(e) => { setStreet(e.target.value); setError(null); }} className={input} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={lab}>{isAr ? 'رقم العقار' : 'Building'}</label><input value={building} maxLength={50} onChange={(e) => setBuilding(e.target.value)} className={input} /></div>
            <div><label className={lab}>{isAr ? 'الدور' : 'Floor'}</label><input value={floor} maxLength={50} onChange={(e) => setFloor(e.target.value)} className={input} /></div>
            <div><label className={lab}>{isAr ? 'الشقة' : 'Apartment'}</label><input value={apartment} maxLength={50} onChange={(e) => setApartment(e.target.value)} className={input} /></div>
          </div>
          <div><label className={lab}>{isAr ? 'علامة مميزة' : 'Landmark'}</label><input value={mark} maxLength={255} onChange={(e) => setMark(e.target.value)} className={input} /></div>
          {error && <p role="alert" className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
          <button type="submit" disabled={busy} className="w-full py-3 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}<span>{isAr ? 'حفظ العنوان' : 'Save address'}</span>
          </button>
        </form>
      )}
    </div>
  );
};

/** The profile's Addresses tab: home, work and other. Saved on the member's card, so customer service sees them in the dashboard and checkout offers them. */
export const AddressesTab: React.FC<{ token: string; dark: boolean }> = ({ token, dark }) => {
  const { isAr } = useLanguage();
  const list = useApi(`addresses:${token}`, () => fetchAddresses(token));

  return (
    <section className={`rounded-2xl p-4 border space-y-3 animate-in fade-in duration-150 ${dark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200/90 text-slate-900'}`}>
      <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-[#941946]" /><h3 className="text-xs font-bold">{isAr ? 'عناويني' : 'My addresses'}</h3></div>
      <p className={`text-[11px] ${dark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>{isAr ? 'احفظ عنوان المنزل والعمل وغيره. يظهر في ملفك لدى خدمة العملاء، ويمكنك اختياره عند إتمام الطلب.' : 'Save your home, work and other addresses. They appear in your file with customer service, and you can pick one at checkout.'}</p>
      {list.loading && !list.data ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : (
        KINDS.map((kind) => (
          <AddressCard key={`${kind.type}:${list.data?.find((a) => a.type === kind.type)?.id ?? 'new'}`} kind={kind} saved={list.data?.find((a) => a.type === kind.type)} token={token} dark={dark} onSaved={list.reload} />
        ))
      )}
    </section>
  );
};
