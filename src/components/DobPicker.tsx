import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const START_YEAR = 1995;
const OLDEST = 1920;
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface DobPickerProps {
  /** `YYYY-MM-DD` or ''. */
  value: string;
  onChange: (value: string) => void;
  dark?: boolean;
}

/**
 * Date of birth as three drop-downs (day, month, year) — no keyboard needed. The year list opens on 1995 so the
 * member scrolls a few years instead of thirty. A date is reported only when day and month are chosen.
 */
export const DobPicker: React.FC<DobPickerProps> = ({ value, onChange, dark }) => {
  const { isAr } = useLanguage();
  const [y0, m0, d0] = value ? value.split('-') : ['', '', ''];
  const [year, setYear] = useState(y0 || String(START_YEAR));
  const [month, setMonth] = useState(m0 ? String(Number(m0)) : '');
  const [day, setDay] = useState(d0 ? String(Number(d0)) : '');

  // The saved value arrives after the profile loads.
  useEffect(() => {
    if (!value) return;
    const [y, m, d] = value.split('-');
    setYear(y);
    setMonth(String(Number(m)));
    setDay(String(Number(d)));
  }, [value]);

  const daysInMonth = month ? new Date(Number(year), Number(month), 0).getDate() : 31;

  const commit = (y: string, m: string, d: string) => {
    if (!m || !d) return onChange('');
    const safeDay = Math.min(Number(d), new Date(Number(y), Number(m), 0).getDate());
    onChange(`${y}-${String(m).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`);
  };

  const cls = `w-full px-2 py-2.5 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${dark ? 'bg-[#1E2330] border-white/[0.08] text-[#F1F5F9]' : 'bg-slate-50 border-slate-200 text-slate-900'}`;
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - OLDEST }, (_, i) => thisYear - 1 - i);
  const months = isAr ? MONTHS_AR : MONTHS_EN;

  return (
    <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2" dir="ltr">
      <select aria-label={isAr ? 'اليوم' : 'Day'} className={cls} value={day} onChange={(e) => { setDay(e.target.value); commit(year, month, e.target.value); }}>
        <option value="">{isAr ? 'اليوم' : 'Day'}</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select aria-label={isAr ? 'الشهر' : 'Month'} className={cls} value={month} onChange={(e) => { setMonth(e.target.value); commit(year, e.target.value, day); }}>
        <option value="">{isAr ? 'الشهر' : 'Month'}</option>
        {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select aria-label={isAr ? 'السنة' : 'Year'} className={cls} value={year} onChange={(e) => { setYear(e.target.value); commit(e.target.value, month, day); }}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
};
