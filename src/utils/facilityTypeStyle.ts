import { Activity, Building2, FlaskConical, Pill, Sparkles, Stethoscope, type LucideIcon } from 'lucide-react';

/** Facility types are data now (admins add them), so icon and colour are picked by meaning, not hard-coded per id. */
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/hospital|مستشف/i, Building2],
  [/lab|معمل|معامل|تحاليل/i, FlaskConical],
  [/pharm|صيدل/i, Pill],
  [/radio|scan|اشع|أشع/i, Activity],
  [/dental|optic|اسنان|أسنان|عيون|بصر|تجميل/i, Sparkles],
];

const PALETTE = [
  { badgeColor: 'bg-rose-50 text-rose-700 border-rose-200', iconBg: 'bg-rose-100 text-rose-800' },
  { badgeColor: 'bg-blue-50 text-blue-700 border-blue-200', iconBg: 'bg-blue-100 text-blue-800' },
  { badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconBg: 'bg-emerald-100 text-emerald-800' },
  { badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200', iconBg: 'bg-indigo-100 text-indigo-800' },
  { badgeColor: 'bg-amber-50 text-amber-800 border-amber-200', iconBg: 'bg-amber-100 text-amber-800' },
  { badgeColor: 'bg-purple-50 text-purple-700 border-purple-200', iconBg: 'bg-purple-100 text-purple-800' },
];

export function facilityTypeStyle(type: { slug?: string; name: string }, index: number) {
  const haystack = `${type.slug ?? ''} ${type.name}`;
  const icon = ICON_RULES.find(([rule]) => rule.test(haystack))?.[1] ?? Stethoscope;

  return { icon, ...PALETTE[index % PALETTE.length] };
}
