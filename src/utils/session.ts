import { useSyncExternalStore } from 'react';

/**
 * Who is using the app.
 *
 * Two ways in, both optional and both leave the same trace:
 *  - signed in by phone + code  -> `token` (and the member's `cardNumber`, if they hold a card)
 *  - "just show my card"        -> `cardNumber` alone, no token
 * Plus `leadPhone`: a number already handed to the Contact Us inbox through the
 * popup, which is enough to stop asking. `signOut()` clears all of it.
 */
export interface Session {
  token?: string;
  phone?: string;
  name?: string;
  cardNumber?: string;
  leadPhone?: string;
}

const KEY = 'deilar_session';
const POPUP_KEY = 'deilar_popup_closed_at';

const DELAY_KEY = 'deilar_popup_delay';

/** A dismissed popup comes back after a random 1-4 minutes, so it feels like a reminder, not a clock. */
const randomDelay = () => 60_000 + Math.floor(Math.random() * 180_000);

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Session } | null = null;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getSession(): Session {
  const raw = readRaw();
  if (cache?.raw === raw) return cache.value; // stable identity for useSyncExternalStore

  let value: Session = {};
  try {
    value = raw ? (JSON.parse(raw) as Session) : {};
  } catch {
    /* corrupt entry: start clean */
  }
  cache = { raw, value };
  return value;
}

function write(value: Session | null) {
  try {
    if (value === null || Object.keys(value).length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): the session lasts until reload, nothing more */
  }
  listeners.forEach((l) => l());
}

export const updateSession = (patch: Session) => write({ ...getSession(), ...patch });

/** Signs out everywhere on this device and lets the popup start over. */
export function clearSession() {
  try {
    localStorage.removeItem(POPUP_KEY);
  } catch {
    /* ignore */
  }
  write(null);
}

export const isSignedIn = (s: Session) => !!s.token;
/** Anything that means "stop showing the free-card popup". */
export const popupSilenced = (s: Session) => !!(s.token || s.cardNumber || s.leadPhone);

export function useSession(): Session {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSession,
  );
}

export const markPopupClosed = () => {
  try {
    localStorage.setItem(POPUP_KEY, String(Date.now()));
    localStorage.setItem(DELAY_KEY, String(randomDelay()));
  } catch {
    /* ignore */
  }
};

/** Milliseconds until the popup is due again (0 = now). Counts across reloads. */
export function popupDueIn(): number {
  try {
    const delay = Number(localStorage.getItem(DELAY_KEY)) || randomDelay();
    return Math.max(0, (Number(localStorage.getItem(POPUP_KEY)) || 0) + delay - Date.now());
  } catch {
    return 0;
  }
}
