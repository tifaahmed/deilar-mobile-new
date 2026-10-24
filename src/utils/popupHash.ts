import { useEffect } from 'react';

/** Popups that are open right now, oldest first; the URL hash names the newest one. */
const open: string[] = [];

function sync() {
  const { pathname, search, hash } = window.location;
  const name = open[open.length - 1];
  const next = name ? `#${name}` : '';
  // A hash that is not ours (an anchor) is left alone.
  if (hash === next || (hash && !hash.endsWith('-popup'))) return;
  window.history.replaceState(window.history.state, '', pathname + search + next);
}

/**
 * Shows an open popup in the URL (`/map?radius=10#new-visit-popup`) and clears it when it closes.
 * Name it `<what>-popup`. Path and query are never touched, so filters survive.
 */
export function usePopupHash(name: string, active = true) {
  useEffect(() => {
    if (!active) return;
    open.push(name);
    sync();
    return () => {
      const i = open.lastIndexOf(name);
      if (i >= 0) open.splice(i, 1);
      sync();
    };
  }, [name, active]);
}
