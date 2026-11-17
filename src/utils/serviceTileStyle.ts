import {
  Activity, Apple, Armchair, Baby, Bone, Brain, Building2, Coffee, CupSoda, Eye, FlaskConical, Glasses, Heart, HeartPulse,
  Mic, PartyPopper, Pill, Plug, Plus, Scissors, Shirt, Smile, Sparkles, Star, Stethoscope, Store, UtensilsCrossed, Wind, Wrench,
  Accessibility, Music, Droplets, type LucideIcon,
} from 'lucide-react';

/** One big square of the home slider: its colour and its icon, picked by the meaning of the name (types are admin data). */
export type ServiceKind = 'medical' | 'store';

const MEDICAL_ICONS: [RegExp, LucideIcon][] = [
  [/معمل|معامل|تحاليل|lab/i, FlaskConical],
  [/صيدل|pharm/i, Pill],
  [/مستشف|hospital/i, Building2],
  [/اسنان|أسنان|dental/i, Smile],
  [/اشع|أشع|radio/i, Activity],
  [/بصريات|optic/i, Glasses],
  [/عيون|eye/i, Eye],
  [/طبيعي|physio/i, Accessibility],
  [/جراح|surg/i, Scissors],
  [/عظام|bone/i, Bone],
  [/قلب|heart/i, HeartPulse],
  [/نساء|توليد/i, Heart],
  [/تخاطب|speech/i, Mic],
  [/اطفال|أطفال|pedi/i, Baby],
  [/تغذي|nutri/i, Apple],
  [/مخ|اعصاب|أعصاب|neuro/i, Brain],
  [/تجميل|جلد|derm/i, Sparkles],
  [/صدر|تنفس|حساسي/i, Wind],
  [/اورام|أورام|onco/i, Droplets],
  [/باطن/i, Stethoscope],
];

const STORE_ICONS: [RegExp, LucideIcon][] = [
  [/مطاعم|restaurant/i, UtensilsCrossed],
  [/ملابس|cloth/i, Shirt],
  [/كافيه|cafe|coffee/i, Coffee],
  [/سيار|car/i, Wrench],
  [/مشروب|drink/i, CupSoda],
  [/اثاث|أثاث|furnit/i, Armchair],
  [/كهرب|electr|اجهزة|أجهزة/i, Plug],
  [/بين|bean|بن/i, Coffee],
];

// Full class names (Tailwind reads them literally). Medical = cool, calm colours; stores / fun = warm, lively ones.
const MEDICAL_COLORS = [
  'from-rose-500 to-rose-700', 'from-sky-500 to-blue-700', 'from-teal-500 to-emerald-700', 'from-indigo-500 to-indigo-700',
  'from-cyan-500 to-cyan-700', 'from-violet-500 to-purple-700', 'from-emerald-500 to-green-700', 'from-blue-500 to-blue-800',
];
const STORE_COLORS = [
  'from-orange-400 to-orange-600', 'from-amber-400 to-yellow-600', 'from-pink-400 to-fuchsia-600', 'from-red-400 to-red-600',
  'from-lime-400 to-green-600', 'from-fuchsia-400 to-purple-600', 'from-yellow-400 to-orange-500', 'from-rose-400 to-pink-600',
];

const MEDICAL_DECOR: LucideIcon[] = [Plus, HeartPulse, Stethoscope];
const STORE_DECOR: LucideIcon[] = [Star, PartyPopper, Music];

export function serviceTileStyle(kind: ServiceKind, name: string, index: number) {
  const rules = kind === 'medical' ? MEDICAL_ICONS : STORE_ICONS;
  const colors = kind === 'medical' ? MEDICAL_COLORS : STORE_COLORS;
  const icon = rules.find(([r]) => r.test(name))?.[1] ?? (kind === 'medical' ? Stethoscope : Store);

  return { icon, gradient: colors[index % colors.length], decor: kind === 'medical' ? MEDICAL_DECOR : STORE_DECOR };
}
