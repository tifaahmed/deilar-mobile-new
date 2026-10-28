import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/** Pulling down this far (after the finger's resistance) reloads the page. */
const TRIGGER = 64;
const MAX_PULL = 110;
/** The finger travels this much further than the page follows it. */
const RESISTANCE = 0.5;
/** Anything that starts a touch inside these is not a page pull: the map pans, a dialog or a bar scrolls on its own, fields are typed in. */
const IGNORED = '.leaflet-container, .fixed, [role="dialog"], input, textarea, select, [data-no-pull]';

/** True while a screen asks not to be pulled away (a quiz play in progress would be lost by a reload). */
const blocked = () => typeof document !== 'undefined' && document.body.dataset.noPull === '1';

/** Marks the page as one that must not be reloaded by a pull. Returns the undo. */
export function blockPullToRefresh(): () => void {
  document.body.dataset.noPull = '1';
  return () => {
    delete document.body.dataset.noPull;
  };
}

/** A scrollable box between the touch and the page that is not at its top: the pull belongs to that box. */
function insideScrolledBox(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
  }
  return false;
}

const PULL_FLAG = 'deilar_pull_reload';

/**
 * True when THIS page load came from a pull-to-refresh. The app then goes straight back to the page the player was on,
 * without the "your location is set — find the nearest provider" box it shows on a fresh start (whose button also sends the
 * player to the map). Read once when the app loads, and cleared, so only that one load is affected.
 */
export const reloadedByPull: boolean = (() => {
  try {
    const was = sessionStorage.getItem(PULL_FLAG) === '1';
    sessionStorage.removeItem(PULL_FLAG);
    return was;
  } catch {
    return false;
  }
})();

export const reloadPage = () => {
  try {
    sessionStorage.setItem(PULL_FLAG, '1');
  } catch {
    /* storage unavailable: the reload just behaves like a fresh start */
  }
  window.location.reload();
};

/**
 * Pull the page down while it is at the top to reload it (the phone's own pull-to-refresh is switched off in index.css,
 * so this is the only one). Plain CSS and no animation library: it lives in the main bundle.
 */
export const PullToRefresh: React.FC<{ onRefresh?: () => void }> = ({ onRefresh = reloadPage }) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const distance = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const begin = (e: TouchEvent) => {
      const t = e.touches[0];
      const target = e.target instanceof Element ? e.target : null;
      const eligible = !busy.current && !blocked() && e.touches.length === 1 && window.scrollY <= 0 && !target?.closest(IGNORED) && !insideScrolledBox(e.target);
      start.current = eligible && t ? { x: t.clientX, y: t.clientY } : null;
      distance.current = 0;
    };

    const move = (e: TouchEvent) => {
      const from = start.current;
      const t = e.touches[0];
      if (!from || !t) return;

      const dx = t.clientX - from.x;
      const dy = t.clientY - from.y;
      // Sideways or upwards, or the page has since scrolled: not a pull.
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
        start.current = null;
        distance.current = 0;
        setPull(0);
        return;
      }
      distance.current = Math.min(MAX_PULL, dy * RESISTANCE);
      setPull(distance.current);
    };

    const end = () => {
      const reached = distance.current >= TRIGGER;
      start.current = null;
      distance.current = 0;

      if (!reached) return setPull(0);
      busy.current = true;
      setRefreshing(true);
      setPull(TRIGGER);
      // A beat so the spinner is seen, then the page reloads.
      window.setTimeout(onRefresh, 250);
    };

    document.addEventListener('touchstart', begin, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
    return () => {
      document.removeEventListener('touchstart', begin);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
    };
  }, [onRefresh]);

  if (pull === 0 && !refreshing) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center" style={{ transform: `translateY(${Math.max(0, pull - 44)}px)` }} aria-hidden>
      <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200">
        <RefreshCw className={`h-5 w-5 text-[#931A47] ${refreshing ? 'animate-spin' : ''}`} style={refreshing ? undefined : { transform: `rotate(${(pull / TRIGGER) * 270}deg)`, opacity: Math.min(1, pull / 30) }} />
      </div>
    </div>
  );
};
