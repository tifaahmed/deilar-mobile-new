import React, { useEffect, useState } from 'react';
import { SECTION_LIST } from '../data/quizSectionsMeta';
import { lockedSections, markReopenedNotified, nextOpenAt, systemNotice, unseenReopened, useUsageRaw } from '../utils/quizLimit';
import { navigate } from '../router';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';

const KEYS = SECTION_LIST.map((s) => s.key);
const titleOf = (key: string) => SECTION_LIST.find((s) => s.key === key);

/**
 * Tells the player a quiz section is open again after its daily allowance ran out ("you can play now").
 * Works wherever they are in the app: a banner at the top, plus a system notice when they allowed notices. If the
 * countdown ended while the app was closed, the banner appears the next time it opens.
 */
export const QuizReadyNotifier: React.FC = () => {
  const usage = useUsageRaw();
  const [ready, setReady] = useState<string[]>([]);
  const swipe = useSwipeDismiss(() => setReady([]));

  const announce = (keys: string[]) => {
    if (keys.length === 0) return;
    setReady(keys);
    markReopenedNotified(keys);
    const names = keys.map((k) => titleOf(k)?.title).filter(Boolean).join(' و');
    systemNotice('ديلر — تقدر تلعب دلوقتي! 🎮', `محاولاتك اتجددت في ${names}. تعالى كمّل التحدي!`);
  };

  // The player was away when the countdown ended.
  useEffect(() => {
    announce(unseenReopened(KEYS));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A countdown is running while the app is open: announce when it ends.
  useEffect(() => {
    const locked = lockedSections(KEYS);
    if (locked.length === 0) return;
    const id = setTimeout(() => announce(locked), Math.max(0, nextOpenAt() - Date.now()) + 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage]);

  useEffect(() => {
    if (ready.length === 0) return;
    const id = setTimeout(() => setReady([]), 15000);
    return () => clearTimeout(id);
  }, [ready]);

  return (
    <>
      {/* Plain CSS animation: this component lives in the main bundle, which must not carry the animation library. */}
      {ready.length > 0 && (
        <div
          role="status"
          dir="rtl"
          {...swipe.handlers}
          style={swipe.style}
          className="animate-in slide-in-from-top-6 fade-in duration-300 fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-emerald-600 p-3 text-white shadow-xl"
        >
          <span className="text-3xl">🎮</span>
          <div className="min-w-0 flex-1 text-right">
            <p className="text-sm font-black">تقدر تلعب دلوقتي!</p>
            <p className="text-xs font-semibold text-emerald-50">محاولاتك اتجددت في {ready.map((k) => `${titleOf(k)?.emoji ?? ''} ${titleOf(k)?.title ?? ''}`).join(' و')}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setReady([]);
              navigate('/quiz');
            }}
            className="shrink-0 cursor-pointer rounded-xl bg-white px-3 py-2 text-sm font-black text-emerald-700"
          >
            العب
          </button>
          <button type="button" aria-label="إغلاق" onClick={() => setReady([])} className="shrink-0 cursor-pointer text-lg font-black text-white/80">
            ✕
          </button>
        </div>
      )}
    </>
  );
};
