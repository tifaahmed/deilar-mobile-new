import React from 'react';
import { Hourglass } from 'lucide-react';
import { useIsAr } from '../context/LanguageContext';
import { useLoyalty } from '../utils/quizStore';
import { formatNumber } from '../utils/formatNumber';

/** Warns the member, the month before it happens, how many loyalty points are about to run out. The backend decides the figure and the date. */
export const PointsExpiryNotice: React.FC = () => {
  const isAr = useIsAr();
  const { expiring } = useLoyalty();
  if (!expiring || expiring.points <= 0) return null;

  const date = new Date(`${expiring.expires_on}T00:00:00`).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { dateStyle: 'medium' });
  const text = isAr
    ? `عندك ${formatNumber(expiring.points, true)} نقطة هتنتهي ${expiring.days <= 0 ? 'النهارده' : `بعد ${formatNumber(expiring.days, true)} يوم`} (${date}). استخدمها قبل ما تروح، والأقدم بتتصرف الأول.`
    : `${expiring.points} of your points expire ${expiring.days <= 0 ? 'today' : `in ${expiring.days} days`} (${date}). Use them before they go — the oldest are spent first.`;

  return (
    <p data-testid="points-expiry-notice" className="flex items-start gap-2 p-3 rounded-xl text-[11px] font-bold bg-orange-50 text-orange-800 border border-orange-200 text-right">
      <Hourglass className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{text}</span>
    </p>
  );
};
