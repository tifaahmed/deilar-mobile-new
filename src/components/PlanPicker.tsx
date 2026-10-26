import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { CardStatus, Plan } from '../api/membership';
import { formatNumber } from '../utils/formatNumber';

/** The plans on sale, as the backend lists them (`status.plans`); the picked key goes back as `plan`. */
export const plansOf = (status: Pick<CardStatus, 'plans' | 'price' | 'months'>): Plan[] =>
  status.plans?.length ? status.plans : status.price > 0 ? [{ key: 'year', price: status.price, months: status.months }] : [];

export const planName = (plan: Plan, isAr: boolean) =>
  plan.key === 'half' ? (isAr ? 'نصف سنوي' : 'Half-year') : plan.key === 'year' ? (isAr ? 'سنوي' : 'Yearly') : isAr ? `${formatNumber(plan.months, true)} شهراً` : `${plan.months} months`;

interface PlanPickerProps {
  plans: Plan[];
  value: string | undefined;
  onChange: (key: string) => void;
  /** `onRed`: drawn on the red expired sign. */
  tone?: 'light' | 'onRed';
}

/** Two (or more) choices of how long to subscribe for. Hidden when there is only one: nothing to choose. */
export const PlanPicker: React.FC<PlanPickerProps> = ({ plans, value, onChange, tone = 'light' }) => {
  const { isAr } = useLanguage();
  const currency = isAr ? 'ج.م' : 'EGP';
  if (plans.length < 2) return null;

  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-2">
      {plans.map((plan) => {
        const on = plan.key === value;
        return (
          <button
            key={plan.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(plan.key)}
            className={`relative p-3 rounded-2xl border-2 text-center cursor-pointer transition-all ${
              tone === 'onRed'
                ? on ? 'bg-white text-red-700 border-white' : 'bg-white/10 text-white border-white/40'
                : on ? 'bg-rose-50 border-[#941946] text-[#941946]' : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {on && <Check className="absolute top-1.5 end-1.5 w-4 h-4" />}
            <span className="block text-xs font-black">{planName(plan, isAr)}</span>
            <span className="block text-sm font-black">{formatNumber(plan.price, isAr)} {currency}</span>
            <span className="block text-[10px] font-medium opacity-80">{isAr ? `${formatNumber(plan.months, true)} شهور` : `${plan.months} months`}</span>
          </button>
        );
      })}
    </div>
  );
};
