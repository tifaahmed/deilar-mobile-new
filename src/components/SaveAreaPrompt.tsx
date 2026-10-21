import React, { useEffect, useState } from 'react';
import { Loader2, MapPin, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchProfile, saveMemberArea } from '../api/auth';
import { useArea } from '../utils/area';
import { useSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';

const DISMISSED_KEY = 'deilar_area_save_dismissed';

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
};

/**
 * A signed-in member whose card has no governorate/city, and who has just picked their area on this
 * device, is offered to keep it: one tap saves it to their permanent data (`PUT /profile`). It is
 * only an offer — "Not now" is remembered for that exact area, so it is not asked again until the
 * area changes. A guest, a member whose card already has the area, and a member with no card row
 * never see it.
 */
export const SaveAreaPrompt: React.FC = () => {
  const { isAr } = useLanguage();
  const area = useArea();
  const token = useSession().token;
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(false);

  const areaKey = area ? `${area.governorate.id}:${area.city?.id ?? ''}` : null;

  useEffect(() => {
    setMissing(false);
    setHidden(false);
    setFailed(false);
    if (!token || !areaKey || readDismissed() === areaKey) return;

    let alive = true;
    fetchProfile(token).then(
      (p) => {
        if (alive && p.hasMembership && (p.governorateId === null || p.cityId === null)) setMissing(true);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [token, areaKey]);

  if (!token || !area || !areaKey || !missing || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, areaKey);
    } catch {
      /* the offer simply returns next launch */
    }
    setHidden(true);
  };

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await saveMemberArea(token, { governorate_id: area.governorate.id, city_id: area.city?.id ?? null });
      setHidden(true);
    } catch (e) {
      setFailed(true);
      reportClientError('Saving the member area failed', e);
    } finally {
      setBusy(false);
    }
  };

  const place = [area.city?.name, area.governorate.name].filter(Boolean).join('، ');

  return (
    <div role="dialog" className={`fixed bottom-24 inset-x-3 z-40 max-w-md mx-auto rounded-2xl bg-white border border-slate-200 shadow-xl p-3 flex items-start gap-3 animate-in fade-in ${isAr ? 'text-right' : 'text-left'}`}>
      <MapPin className="w-5 h-5 text-[#941946] shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-extrabold text-slate-900">{isAr ? 'حفظ موقعك في بيانات كرتك؟' : 'Save your location to your card?'}</p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          {isAr ? `لا توجد محافظة/مدينة في بياناتك. هل نسجّل «${place}» كبيانات دائمة؟` : `Your card has no governorate/city yet. Save “${place}” as your permanent data?`}
        </p>
        {failed && <p role="alert" className="text-[11px] font-bold text-rose-600">{isAr ? 'تعذر الحفظ، حاول مرة أخرى.' : 'Could not save, please try again.'}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className="flex-1 py-2 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 cursor-pointer">
            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{isAr ? 'نعم، احفظ' : 'Yes, save'}</span>
          </button>
          <button onClick={dismiss} disabled={busy} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer">
            {isAr ? 'ليس الآن' : 'Not now'}
          </button>
        </div>
      </div>
      <button onClick={dismiss} aria-label={isAr ? 'إغلاق' : 'Close'} className="text-slate-400 hover:text-slate-700 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
