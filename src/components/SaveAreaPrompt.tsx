import React, { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchProfile, saveMemberArea } from '../api/auth';
import { useArea } from '../utils/area';
import { useSession } from '../utils/session';
import { reportClientError } from '../utils/reportError';
import { usePopupHash } from '../utils/popupHash';
import { Notice } from './Notice';

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

  usePopupHash('save-area-popup', !(!token || !area || !areaKey || !missing || hidden));
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
    <Notice
      role="dialog"
      icon={<MapPin className="w-4 h-4 text-[#941946]" />}
      tone="bg-white border border-slate-200 text-slate-900"
      onOpen={save}
      onClose={dismiss}
      closeLabel={isAr ? 'ليس الآن' : 'Not now'}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{isAr ? 'جارٍ الحفظ...' : 'Saving...'}</span>
      ) : failed ? (
        <span role="alert" className="text-rose-600">{isAr ? 'تعذر الحفظ، اضغط للمحاولة مرة أخرى' : 'Could not save, tap to try again'}</span>
      ) : (
        isAr ? `حفظ موقعك (${place}) في كرتك؟ اضغط للحفظ` : `Save your location (${place}) to your card? Tap to save`
      )}
    </Notice>
  );
};
