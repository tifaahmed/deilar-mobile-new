import { REMINDER_EVERY_MS } from '../utils/reminderEvery';
import React, { useEffect, useState } from 'react';
import { UserRoundCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchMembership, type MemberStatus } from '../api/membership';
import { navigate, routeHref } from '../router';
import { useSession } from '../utils/session';
import { usePopupHash } from '../utils/popupHash';
import { Notice } from './Notice';

/** How often the reminder appears while a signed-in member's profile is unfinished. */
const EVERY_MS = REMINDER_EVERY_MS;
/** How long one reminder stays on screen. */
const VISIBLE_MS = 12_000;

const FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  name: { ar: 'الاسم', en: 'name' },
  email: { ar: 'البريد الإلكتروني', en: 'email' },
  gender: { ar: 'النوع', en: 'gender' },
  governorate_id: { ar: 'المحافظة', en: 'governorate' },
  city_id: { ar: 'المدينة', en: 'city' },
  national_id: { ar: 'الرقم القومي', en: 'national ID' },
  job_title: { ar: 'المسمى الوظيفي', en: 'job title' },
  company_name: { ar: 'جهة العمل', en: 'company' },
  address: { ar: 'العنوان', en: 'address' },
  avatar: { ar: 'الصورة', en: 'photo' },
};

/**
 * "Your profile is 40% complete" — a small notice every minute, for as long as a signed-in
 * member's profile is unfinished, saying what is missing (address, job title…).
 *
 * The percentage and the missing fields come from the backend (`RegistrationProgress`), so the
 * app and the website quote the same figure. For the relatives it repeats the rule: contact
 * customer service, and a card holds up to 15 first-degree relatives. Stops by itself the moment
 * nothing is left to fill in. Silent for a guest.
 */
export const ProfileReminder: React.FC = () => {
  const { isAr } = useLanguage();
  const session = useSession();
  const [status, setStatus] = useState<MemberStatus | null>(null);
  const token = session.token;

  useEffect(() => {
    if (!token) {
      setStatus(null);
      return;
    }

    let hide: ReturnType<typeof setTimeout> | undefined;
    let finished = false;

    const tick = async () => {
      if (finished || document.visibilityState === 'hidden') return;

      try {
        const current = await fetchMembership(token);

        if (!current.has_card) return;
        if (current.progress.overall.complete) {
          finished = true;
          return;
        }

        setStatus(current);
        clearTimeout(hide);
        hide = setTimeout(() => setStatus(null), VISIBLE_MS);
      } catch {
        // A reminder that cannot load is simply not shown.
      }
    };

    const timer = setInterval(tick, EVERY_MS);

    return () => {
      clearInterval(timer);
      clearTimeout(hide);
    };
  }, [token]);

  usePopupHash('profile-popup', !!status);
  if (!status) return null;

  const { percent, missing } = status.progress.overall;
  const fields = missing.map((key) => (FIELD_LABELS[key] ? (isAr ? FIELD_LABELS[key].ar : FIELD_LABELS[key].en) : key)).join(isAr ? '، ' : ', ');

  return (
    <Notice
      icon={<UserRoundCheck className="w-4 h-4 text-amber-400" />}
      tone="bg-slate-900 text-white"
      onOpen={() => { setStatus(null); navigate(routeHref({ tab: 'profile', section: 'personal' })); }}
      onClose={() => setStatus(null)}
    >
      {isAr ? `ملفك مكتمل ${percent}% — الناقص: ${fields} · أكمل الآن` : `Profile ${percent}% complete — missing: ${fields} · complete now`}
    </Notice>
  );
};
