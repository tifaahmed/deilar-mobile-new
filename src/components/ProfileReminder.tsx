import React, { useEffect, useState } from 'react';
import { UserRoundCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchMembership, type MemberStatus } from '../api/membership';
import { navigate, routeHref } from '../router';
import { useSession } from '../utils/session';

/** How often the reminder appears while a signed-in member's profile is unfinished. */
const EVERY_MS = 60_000;
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

  if (!status) return null;

  const { percent, missing } = status.progress.overall;
  const fields = missing.map((key) => (FIELD_LABELS[key] ? (isAr ? FIELD_LABELS[key].ar : FIELD_LABELS[key].en) : key)).join(isAr ? '، ' : ', ');

  return (
    <div
      role="status"
      className={`fixed bottom-24 inset-x-3 z-40 max-w-md mx-auto rounded-2xl bg-slate-900 text-white shadow-xl p-3 flex items-start gap-3 animate-in fade-in ${isAr ? 'text-right' : 'text-left'}`}
    >
      <UserRoundCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-extrabold">{isAr ? `ملفك مكتمل بنسبة ${percent}%` : `Your profile is ${percent}% complete`}</p>
        <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-amber-400" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[11px] text-slate-300">{isAr ? `الناقص: ${fields}` : `Still missing: ${fields}`}</p>
        <p className="text-[11px] text-slate-400">
          {isAr
            ? `لإضافة الأقارب تواصل مع خدمة العملاء. يشمل الكارت حتى ${status.relatives.max} من الأقارب من الدرجة الأولى.`
            : `To add relatives, contact customer service. A card holds up to ${status.relatives.max} first-degree relatives.`}
        </p>
        <button onClick={() => { setStatus(null); navigate(routeHref({ tab: 'profile', section: 'personal' })); }} className="text-[11px] font-bold text-amber-300 underline cursor-pointer">
          {isAr ? 'أكمل الآن' : 'Complete now'}
        </button>
      </div>
      <button onClick={() => setStatus(null)} aria-label={isAr ? 'إغلاق' : 'Close'} className="text-slate-400 hover:text-white cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
