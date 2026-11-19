import { useEffect, useState, type RefObject } from 'react';

/** What sits under a map on the page: the slim bottom bar, its gap and the phone's safe area is added by CSS. */
const BOTTOM_RESERVE = '3.75rem';

/**
 * The height that makes a map box end exactly above the bottom bar on THIS phone, whatever its size (rotation, a taller or
 * shorter screen, a toolbar above the map that grew). Measured from where the box starts on the page, so no part of the map
 * is ever left behind the bar. `watch` re-measures when something above the box changes (the mode, a filter row...).
 */
export function useFitMapHeight(ref: RefObject<HTMLElement | null>, watch: unknown = null): string {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (el) setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      observer?.disconnect();
    };
  }, [ref, watch]);

  if (top === null) return 'clamp(18rem, calc(100dvh - 15rem), 40rem)';
  return `clamp(16rem, calc(100dvh - ${top}px - ${BOTTOM_RESERVE} - env(safe-area-inset-bottom)), 52rem)`;
}
