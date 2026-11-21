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
  /** A card number typed whose card has no phone yet. NOT a sign-in and shows nothing: it only lets the app ask for the phone to add. */
  pendingCard?: string;
  leadPhone?: string;
}

const KEY = 'deilar_session';
const ACCOUNTS_KEY = 'deilar_accounts';

/**
 * Every account signed in on this phone. A member (a parent with a child's card, an owner with a second number) can hold several and
 * move between them with NO new code: each keeps the sign-in (`token`) the backend gave it. `write()` keeps the entry of the account that
 * is active in step with the session; only the active one is ever "the session".
 */
/** Most accounts one phone holds at once. */
export const MAX_ACCOUNTS = 2;

export type SavedAccount = Pick<Session, 'token' | 'phone' | 'name' | 'cardNumber' | 'leadPhone'> & { token: string };
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

function readAccounts(): SavedAccount[] {
  try {
    const list = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((a): a is SavedAccount => !!a && typeof a.token === 'string') : [];
  } catch {
    return [];
  }
}

function writeAccounts(list: SavedAccount[]) {
  try {
    if (list.length === 0) localStorage.removeItem(ACCOUNTS_KEY);
    else localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable: no list, the active session still works */
  }
}

/** Keeps the saved entry of the signed-in account equal to the session (adds it the first time it signs in). */
function syncAccount(value: Session | null) {
  if (!value?.token) return;
  const entry: SavedAccount = { token: value.token, phone: value.phone, name: value.name, cardNumber: value.cardNumber, leadPhone: value.leadPhone };
  // The same person signing in again gets a new token: the older entry with that phone is replaced, not listed twice.
  const list = readAccounts().filter((a) => !(entry.phone && a.phone === entry.phone && a.token !== entry.token));
  const at = list.findIndex((a) => a.token === entry.token);
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  // Never more than MAX_ACCOUNTS: if a path other than «add account» got one in, the oldest other account makes room.
  while (list.length > MAX_ACCOUNTS) {
    const drop = list.findIndex((a) => a.token !== entry.token);
    list.splice(drop, 1);
  }
  writeAccounts(list);
}

function write(value: Session | null) {
  syncAccount(value);
  try {
    if (value === null || Object.keys(value).length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): the session lasts until reload, nothing more */
  }
  listeners.forEach((l) => l());
}

export const updateSession = (patch: Session) => write({ ...getSession(), ...patch });

/** The accounts held on this phone (the active one included), oldest first. */
export const getAccounts = (): SavedAccount[] => readAccounts();

/** Whether the saved accounts list changed since the last read is not tracked: the list is read when a screen opens, and again after every session change. */
export function useAccounts(): SavedAccount[] {
  useSession();
  return readAccounts();
}

/** Whether a new account may still be added on this phone. */
export const canAddAccount = (): boolean => readAccounts().length < MAX_ACCOUNTS;

/** Makes another saved account the active one. No code is asked: its own sign-in is still good. Returns false if it is not saved. */
export function switchAccount(token: string): boolean {
  const saved = readAccounts().find((a) => a.token === token);
  if (!saved) return false;
  write({ token: saved.token, phone: saved.phone, name: saved.name, cardNumber: saved.cardNumber, leadPhone: saved.leadPhone });
  return true;
}

/** Forgets one saved account (its sign-in is dropped from the phone). The active session is not touched here. */
export function forgetAccount(token: string) {
  writeAccounts(readAccounts().filter((a) => a.token !== token));
}

/** Signs the ACTIVE account out of this device and lets the popup start over. Other saved accounts stay. */
export function clearSession() {
  const active = getSession().token;
  if (active) forgetAccount(active);
  try {
    localStorage.removeItem(POPUP_KEY);
  } catch {
    /* ignore */
  }
  write(null);
}

export const isSignedIn = (s: Session) => !!s.token;
/** Anything that means "stop showing the free-card popup". */
export const popupSilenced = (s: Session) => !!(s.token || s.cardNumber || s.leadPhone || s.pendingCard);

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
