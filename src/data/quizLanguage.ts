import { useSyncExternalStore } from 'react';
import { useIsAr } from '../context/LanguageContext';

/** The language the questions are asked in. Only an app that is in English asks; an Arabic app always plays in Arabic. */
export type QuizLang = 'ar' | 'en';

const KEY = 'deilar_quiz_lang';
const listeners = new Set<() => void>();

const read = (): QuizLang | null => {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === 'ar' || v === 'en' ? v : null;
  } catch {
    return null;
  }
};
let current: QuizLang | null = read();

/** Remembers the choice until the app is closed, so the question is asked once per visit (and again on the next launch). */
export function setQuizLang(lang: QuizLang | null): void {
  current = lang;
  try {
    if (lang) sessionStorage.setItem(KEY, lang);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: the choice just lasts until the page reloads */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The language of the questions, or null while an English-app player has not chosen yet. */
export function useQuizLang(): QuizLang | null {
  const isAr = useIsAr();
  const chosen = useSyncExternalStore(subscribe, () => current, () => null);
  return isAr ? 'ar' : chosen;
}
