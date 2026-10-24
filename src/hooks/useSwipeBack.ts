import { useEffect } from 'react';

const EDGE = 40; // px from either screen edge where a back swipe may start
const DISTANCE = 70; // px it must travel sideways
const MAX_DRIFT = 60; // px of vertical drift tolerated

/**
 * Swiping in from the left or right edge of the screen goes back one page, like the system gesture — so it also
 * works with 3-button navigation. Every page is a real History entry (see router.tsx), so this is `history.back()`;
 * it does nothing on the first page. Starting at the edge keeps map panning and carousels untouched.
 */
export function useSwipeBack() {
  useEffect(() => {
    let start: { x: number; y: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const w = window.innerWidth;
      start = e.touches.length === 1 && (t.clientX <= EDGE || t.clientX >= w - EDGE) ? { x: t.clientX, y: t.clientY } : null;
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = Math.abs(t.clientY - start.y);
      const fromLeft = start.x <= EDGE;
      start = null;

      // From the left edge swipe right, from the right edge swipe left (inward).
      if (dy > MAX_DRIFT || (fromLeft ? dx : -dx) < DISTANCE) return;
      if (window.history.length > 1) window.history.back();
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);
}
