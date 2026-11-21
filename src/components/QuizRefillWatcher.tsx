import React, { useEffect, useState } from 'react';
import { onRefillGranted } from '../utils/quizLimit';
import { refreshLoyalty } from '../utils/quizStore';
import { useIsAr } from '../context/LanguageContext';

/** How often the quiz screens ask the backend whether someone registered under the member's code (and so refilled the plays). */
export const REFILL_POLL_MS = 60_000;

/**
 * Mount it on a screen that shows the sections (or a used-up section): it re-reads `GET /loyalty` when the screen opens,
 * when the app comes back to the foreground and every minute while it stays, so a refill earned by a friend registering under
 * the member's code opens the sections on its own. `refreshLoyalty` skips when signed out or offline and never overlaps; when
 * the stored bonus goes up a short notice is shown. Errors are silent.
 */
export const QuizRefillWatcher: React.FC = () => {
  const isAr = useIsAr();
  const [added, setAdded] = useState(0);

  useEffect(() => {
    void refreshLoyalty();
    const timer = setInterval(() => void refreshLoyalty(), REFILL_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshLoyalty();
    };
    document.addEventListener('visibilitychange', onVisible);
    const off = onRefillGranted((n) => setAdded(n));
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      off();
    };
  }, []);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(0), 8000);
    return () => clearTimeout(id);
  }, [added]);

  if (!added) return null;
  return (
    <div role="status" data-testid="quiz-refill-notice" dir="rtl" className="rounded-2xl bg-emerald-600 p-3 text-center text-sm font-black text-white shadow-md">
      {isAr ? 'اتفتحت محاولة جديدة في كل الأقسام 🎉 (حد سجّل بكودك)' : 'A new play opened in every section 🎉 (someone registered with your code)'}
    </div>
  );
};
