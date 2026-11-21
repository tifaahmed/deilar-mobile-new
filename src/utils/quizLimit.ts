import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * How many times a player may start each quiz section in a day.
 *
 * Every section has its own allowance (`PLAYS_PER_DAY`), so five sections allow five plays in all, one each. A play is
 * counted when it STARTS, so leaving half-way does not give it back. The day ends at midnight on the phone: once a
 * section's allowance is used, it opens again then, and `useQuizLimit` gives the time left for a countdown.
 * The backend keeps the same rule for points (`plays_per_day` in config/loyalty.php) — change both together.
 */
export const PLAYS_PER_DAY = 1;

const USAGE_KEY = 'deilar_quiz_daily';
const NOTIFIED_KEY = 'deilar_quiz_notified';
/** Extra plays earned TODAY by sharing the referral code (on every section) and how many refills are left today (null = not known). */
const BONUS_KEY = 'deilar_quiz_share_bonus';

interface ShareBonus {
  day: string;
  bonus: number;
  left: number | null;
}

interface DayUsage {
  day: string;
  count: number;
}
type Usage = Record<string, DayUsage>;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the limit just forgets on reload */
  }
  listeners.forEach((l) => l());
};

function parse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** The phone's calendar day, `2026-10-27`. */
export const dayKey = (at: number = Date.now()): string => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** The next midnight on the phone: when every section's allowance is back. */
export const nextOpenAt = (at: number = Date.now()): number => {
  const d = new Date(at);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
};

const bonusState = (at: number = Date.now()): ShareBonus => {
  const b = parse<ShareBonus | null>(read(BONUS_KEY), null);
  return b && b.day === dayKey(at) ? b : { day: dayKey(at), bonus: 0, left: null };
};

/** Extra plays on EVERY section today, earned by sharing the referral code (0 on a new day). The backend keeps the same count for points. */
export const shareBonusToday = (at: number = Date.now()): number => bonusState(at).bonus;

/** Plays a section allows today: the daily one plus what sharing earned. */
export const allowanceToday = (at: number = Date.now()): number => PLAYS_PER_DAY + shareBonusToday(at);

const refillListeners = new Set<(added: number) => void>();

/**
 * Called when today's stored bonus goes UP after it was already known (someone registered under the member's code, or any
 * other refill the app had not seen). Not called for the first value of the day: that is a load, not news.
 */
export function onRefillGranted(l: (added: number) => void): () => void {
  refillListeners.add(l);
  return () => void refillListeners.delete(l);
}

/** Stores what the backend says about today's share refills (from the share reply, `GET /loyalty` or the upload reply). */
export function applyShareState(s: { share_bonus_plays_today?: number; bonus_plays_today?: number; share_refills_left_today?: number; refills_left_today?: number }): void {
  const bonus = s.bonus_plays_today ?? s.share_bonus_plays_today;
  const left = s.refills_left_today ?? s.share_refills_left_today;
  if (bonus === undefined && left === undefined) return;
  const stored = parse<ShareBonus | null>(read(BONUS_KEY), null);
  const known = !!stored && stored.day === dayKey();
  const cur = bonusState();
  const next = bonus ?? cur.bonus;
  write(BONUS_KEY, { day: cur.day, bonus: next, left: left ?? cur.left } satisfies ShareBonus);
  if (known && next > cur.bonus) refillListeners.forEach((l) => l(next - cur.bonus));
}

/** Refills left today (null = not known yet: the member is shown the share offer anyway). */
export const useShareRefillsLeft = (): number | null => {
  const raw = useSyncExternalStore(subscribe, () => read(BONUS_KEY));
  void raw;
  return bonusState().left;
};

const usageOf = (all: Usage, key: string, at: number = Date.now()): number => (all[key]?.day === dayKey(at) ? all[key].count : 0);

/** Plays already started today in a section. */
export const playsUsed = (key: string): number => usageOf(parse<Usage>(read(USAGE_KEY), {}), key);

/** Counts a play that is starting now. */
export function registerPlay(key: string): void {
  const all = parse<Usage>(read(USAGE_KEY), {});
  write(USAGE_KEY, { ...all, [key]: { day: dayKey(), count: usageOf(all, key) + 1 } });
}

/** `HH:MM:SS`. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}

export interface QuizLimit {
  used: number;
  left: number;
  locked: boolean;
  /** Milliseconds until the allowance is back (0 when not locked). */
  msLeft: number;
}

/** A section's allowance today; while it is used up, re-renders every second so a countdown can run (and flips when it ends). */
export function useQuizLimit(key: string): QuizLimit {
  const raw = useSyncExternalStore(subscribe, () => `${read(USAGE_KEY)}|${read(BONUS_KEY)}`);
  const [now, setNow] = useState(() => Date.now());
  const used = usageOf(parse<Usage>(read(USAGE_KEY), {}), key, now);
  const allowed = allowanceToday(now);
  const locked = used >= allowed;

  useEffect(() => {
    setNow(Date.now());
    if (!locked) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [locked, raw]);

  return { used, left: Math.max(0, allowed - used), locked, msLeft: locked ? Math.max(0, nextOpenAt(now) - now) : 0 };
}

/** The sections (by key) whose allowance is used up today, with when each opens again. */
export function lockedSections(keys: string[], at: number = Date.now()): string[] {
  const all = parse<Usage>(read(USAGE_KEY), {});
  return keys.filter((k) => usageOf(all, k, at) >= allowanceToday(at));
}

/** The raw usage, to re-read when it changes. */
export const useUsageRaw = (): string | null => useSyncExternalStore(subscribe, () => `${read(USAGE_KEY)}|${read(BONUS_KEY)}`);

/**
 * Sections that were locked on an earlier day and whose "you can play again" notice has not been shown yet — a player
 * who was away when the countdown ended gets it when they come back.
 */
export function unseenReopened(keys: string[]): string[] {
  const all = parse<Usage>(read(USAGE_KEY), {});
  const notified = parse<Record<string, string>>(read(NOTIFIED_KEY), {});
  return keys.filter((k) => all[k] && all[k].count >= PLAYS_PER_DAY && all[k].day !== dayKey() && notified[k] !== all[k].day);
}

/** Remembers that the notice for this section's locked day was shown, so it comes once. */
export function markReopenedNotified(keys: string[]): void {
  const all = parse<Usage>(read(USAGE_KEY), {});
  const notified = parse<Record<string, string>>(read(NOTIFIED_KEY), {});
  keys.forEach((k) => {
    if (all[k]) notified[k] = all[k].day;
  });
  write(NOTIFIED_KEY, notified);
}

/** Marks the sections locked TODAY as notified when their countdown ends in this session. */
export function markLockedNotified(keys: string[]): void {
  markReopenedNotified(keys);
}

export type NotifyPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export const notifyPermission = (): NotifyPermission => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

/** Asks the player to allow system notices (must be called from a tap). */
export async function requestQuizNotifications(): Promise<NotifyPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a system notice when the player allowed them; never throws. */
export function systemNotice(title: string, body: string): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(title, { body });
  } catch {
    /* some webviews refuse the constructor: the in-app notice is still shown */
  }
}
