import React from 'react';
import { CalendarClock, CalendarX2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { MemberStatus } from '../api/membership';

/** Under the card: when it ends, whether it was paid for or is the free trial, and how long is left. The dates and the state are the backend's. */
export const CardExpiry: React.FC<{ status: MemberStatus; dark?: boolean }> = ({ status, dark = false }) => {
  const { isAr } = useLanguage();
  if (!status.has_card || !status.expires_on) return null;

  const date = new Date(`${status.expires_on}T00:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const expired = status.expired;
  const soon = !expired && status.days_left <= 30;

  const plan = status.is_trial ? (isAr ? 'فترة تجريبية' : 'Free trial') : isAr ? 'اشتراك مدفوع' : 'Paid';
  const left = expired
    ? isAr ? 'منتهي' : 'Expired'
    : status.days_left === 0
      ? isAr ? 'ينتهي اليوم' : 'Ends today'
      : isAr ? `متبقي ${status.days_left} يوم` : `${status.days_left} day${status.days_left === 1 ? '' : 's'} left`;

  // One colour per state; the text colour is chosen for the light and the dark page alike.
  const tone = expired
    ? { box: dark ? 'bg-red-500/15 border-red-400/40 text-red-200' : 'bg-red-50 border-red-300 text-red-800', Icon: CalendarX2 }
    : soon || status.is_trial
      ? { box: dark ? 'bg-amber-500/15 border-amber-400/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900', Icon: CalendarClock }
      : { box: dark ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-900', Icon: CheckCircle2 };

  return (
    <div className={`w-full max-w-sm mx-auto mt-3 rounded-2xl border px-4 py-3 space-y-1 ${tone.box} ${isAr ? 'text-right' : 'text-left'}`}>
      <p className="flex items-center gap-2 text-sm font-black leading-snug">
        <tone.Icon className="w-5 h-5 shrink-0" />
        <span>
          {expired ? (isAr ? 'انتهى الكارت في ' : 'Expired on ') : isAr ? 'صالح حتى ' : 'Valid until '}
          {date}
        </span>
      </p>
      <p className="text-xs font-bold opacity-80">
        {plan} · {left}
      </p>
    </div>
  );
};
