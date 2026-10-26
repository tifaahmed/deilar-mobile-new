import { useRef, useState, type CSSProperties, type TouchEvent } from 'react';

/** Distance (px) a notice must be dragged sideways before it is dismissed. */
const THRESHOLD = 80;

/** Lets a floating notice be swept left or right to dismiss it. Spread `handlers` and `style` on its root. */
export const useSwipeDismiss = (onDismiss: () => void) => {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);

  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchMove: (e: TouchEvent) => {
      const s = start.current;
      if (!s) return;
      const x = e.touches[0].clientX - s.x;
      // A mostly vertical drag is a scroll, not a sweep.
      if (Math.abs(e.touches[0].clientY - s.y) > Math.abs(x)) {
        start.current = null;
        setDx(0);
        return;
      }
      setDx(x);
    },
    onTouchEnd: () => {
      start.current = null;
      if (Math.abs(dx) > THRESHOLD) onDismiss();
      setDx(0);
    },
  };

  const style: CSSProperties = {
    transform: `translateX(${dx}px)`,
    opacity: 1 - Math.min(Math.abs(dx) / 300, 0.6),
    transition: start.current ? 'none' : 'transform 0.2s, opacity 0.2s',
    touchAction: 'pan-y',
  };

  return { handlers, style };
};
