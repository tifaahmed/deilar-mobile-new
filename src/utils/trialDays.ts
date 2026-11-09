/** Length of the free trial, in days, as the BACKEND last told us (`trial_days`). Never decided here; null = not told yet. */
let known: number | null = null;

export const rememberTrialDays = (n: unknown): void => {
  const v = Number(n);
  if (Number.isFinite(v) && v > 0) known = Math.round(v);
};

export const getTrialDays = (): number | null => known;

/** "7 days" / "7 أيام"; with no figure yet, a neutral word so nothing wrong is promised. */
export const trialPhrase = (days: number | null, isAr: boolean): string => {
  if (!days) return isAr ? 'مجاناً' : 'free';
  if (isAr) return days === 1 ? 'يوم' : days === 2 ? 'يومين' : days <= 10 ? `${days} أيام` : `${days} يوماً`;
  return days === 1 ? '1 day' : `${days} days`;
};
