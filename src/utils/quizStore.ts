import { useSyncExternalStore } from 'react';
import { apiGet, apiGetAuth, apiPost, ApiError } from '../api/http';
import { getSession } from './session';
import { reportClientError } from './reportError';

/**
 * The quiz game's answers, kept on the phone and sent to the backend in the background.
 *
 * Nothing here is awaited by the game: an answer is written to localStorage first (so playing
 * offline, or never signing in, costs nothing), then a flush is scheduled. A flush runs only
 * when a member is signed in and the phone is online; what the backend accepted is removed
 * from the queue, anything else stays for the next try (app opened, connection back, sign-in).
 * Every answer carries an id made here, and the backend books an id once, so a lost reply that
 * makes us send a batch twice cannot pay the member twice.
 *
 * The points are the backend's call (`config/loyalty.php` in ibusiness_medical); `QUIZ_POINTS`
 * below only lets the game show the same figure while offline. Keep them equal.
 */
export const QUIZ_POINTS = 10;

export interface QuizAnswer {
  id: string;
  play_id: string;
  quiz: string;
  question_id: number;
  correct: boolean;
  timed_out: boolean;
  answered_at: string;
  /** The stage the player is in AFTER this answer (see quizProgress.ts). */
  stage: number;
}

/** One badge as the backend draws it: the rules and thresholds are its (config/loyalty.php), the app only paints them. */
export interface BadgeInfo {
  quiz: string;
  key: string;
  kind: 'solved' | 'streak' | 'stage' | string;
  threshold: number;
  /** Set by the admin (/admin/loyalty); null = the app words it itself. */
  title: string | null;
  icon: string | null;
  /** Loyalty points the badge pays once, when it is earned. */
  reward_points: number;
  progress: number;
  earned: boolean;
  earned_at: string | null;
}

/** One line of the member's loyalty log, as the backend builds it (`GET /loyalty/history`). */
export type HistoryEntry =
  | { type: 'play'; at: string; play_id: string; quiz: string | null; right: number; wrong: number; points: number }
  | { type: 'badge'; at: string; quiz: string; key: string; kind: string | null; threshold: number | null; title: string | null; icon: string | null; points: number }
  | { type: 'admin'; at: string; points: number; note: string | null };

interface HistoryCache {
  token: string;
  points: number;
  entries: HistoryEntry[];
}

const HISTORY_KEY = 'deilar_loyalty_history';

interface Server {
  points: number;
  token: string;
  badges?: BadgeInfo[];
}

interface LoyaltyData {
  points: number;
  badges?: BadgeInfo[];
}

const SEEN_KEY = 'deilar_quiz_badges_seen';

const QUEUE_KEY = 'deilar_quiz_queue';
const SERVER_KEY = 'deilar_loyalty_server';
const BATCH = 100;
const FLUSH_DELAY_MS = 3000;
const REQUEST_TIMEOUT_MS = 15000;

const listeners = new Set<() => void>();
let queueCache: { raw: string | null; value: QuizAnswer[] } | null = null;
let serverCache: { raw: string | null; value: Server | null } | null = null;
let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the game still works, it just forgets on reload */
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

/** Answers not yet accepted by the backend. Stable identity between changes (useSyncExternalStore). */
export function getQueue(): QuizAnswer[] {
  const raw = read(QUEUE_KEY);
  if (queueCache?.raw !== raw) queueCache = { raw, value: parse<QuizAnswer[]>(raw, []) };
  return queueCache.value;
}

function getServer(): Server | null {
  const raw = read(SERVER_KEY);
  if (serverCache?.raw !== raw) serverCache = { raw, value: parse<Server | null>(raw, null) };
  return serverCache.value;
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Files one answer on the phone and schedules the upload. Never throws, never waits. */
export function recordQuizAnswer(a: Omit<QuizAnswer, 'id' | 'answered_at'>): void {
  write(QUEUE_KEY, JSON.stringify([...getQueue(), { ...a, id: newId(), answered_at: new Date().toISOString() }]));
  scheduleFlush();
}

export function scheduleFlush(delay = FLUSH_DELAY_MS): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flushQuizAnswers(), delay);
}

/** Sends the queued answers if a member is signed in and the phone is online. Safe to call any time, any number of times. */
export async function flushQuizAnswers(): Promise<void> {
  const token = getSession().token;
  if (flushing || !token || getQueue().length === 0 || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;

  flushing = true;
  try {
    while (getQueue().length > 0) {
      const batch = getQueue().slice(0, BATCH);
      const result = await Promise.race([
        apiPost<{ data: LoyaltyData }>('/loyalty/quiz-answers', { answers: batch, platform: 'app' }, undefined, token),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), REQUEST_TIMEOUT_MS)),
      ]);
      const sent = new Set(batch.map((b) => b.id));
      write(QUEUE_KEY, JSON.stringify(getQueue().filter((q) => !sent.has(q.id))));
      write(SERVER_KEY, JSON.stringify({ points: result.data.points, badges: result.data.badges, token } satisfies Server));
      void refreshHistory();
    }
  } catch (error) {
    // No connection / a slow one / signed out: keep everything and try again later. Anything else is a bug worth a log.
    if (error instanceof ApiError && error.status >= 400 && error.status !== 401 && error.status !== 429) reportClientError('Quiz upload failed', error, { status: error.status });
  } finally {
    flushing = false;
  }
}

/** Re-reads the member's balance and badge catalog (when online and signed in). Quiet on failure: the saved copy stays. */
export async function refreshLoyalty(): Promise<void> {
  const token = getSession().token;
  if (!token || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;

  try {
    const { data } = await apiGetAuth<{ data: LoyaltyData }>('/loyalty', token);
    write(SERVER_KEY, JSON.stringify({ points: data.points, badges: data.badges, token } satisfies Server));
  } catch {
    /* offline or signed out: keep what we have */
  }
}

/** A badge on offer, the same for everyone. */
export interface BadgeDef {
  quiz: string;
  key: string;
  kind: string;
  threshold: number;
  title: string | null;
  icon: string | null;
  reward_points: number;
}

const CATALOG_KEY = 'deilar_badge_catalog';

/** Reads every badge on offer (public: no sign-in needed) and keeps it on the phone for offline. Quiet on failure. */
export async function refreshBadgeCatalog(): Promise<void> {
  try {
    const { data } = await apiGet<{ data: { badges: BadgeDef[] } }>('/mobile/loyalty/badges', undefined, { ttl: 0 });
    write(CATALOG_KEY, JSON.stringify(data.badges));
  } catch {
    /* offline: the saved list stays */
  }
}

/** All the badges on offer, as last read from the backend (empty until the first read). */
export function useBadgeCatalog(): BadgeDef[] {
  return parse<BadgeDef[]>(useSyncExternalStore(subscribe, () => read(CATALOG_KEY)), []);
}

/** Reads the loyalty log from the backend (plays, badges with their reward, points given by the admin). Quiet on failure: the saved copy stays. */
export async function refreshHistory(): Promise<void> {
  const token = getSession().token;
  if (!token || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;

  try {
    const { data } = await apiGetAuth<{ data: { points: number; entries: HistoryEntry[] } }>('/loyalty/history', token);
    write(HISTORY_KEY, JSON.stringify({ token, points: data.points, entries: data.entries } satisfies HistoryCache));
  } catch {
    /* offline or signed out: keep what we have */
  }
}

/** The saved backend log of the signed-in member (empty for a guest or after signing in as someone else). */
export function useLoyaltyHistory(): { entries: HistoryEntry[]; points: number | null } {
  const raw = useSyncExternalStore(subscribe, () => read(HISTORY_KEY));
  const token = getSession().token;
  const saved = parse<HistoryCache | null>(raw, null);

  return saved && token && saved.token === token ? { entries: saved.entries, points: saved.points } : { entries: [], points: null };
}

/** Badges earned and not yet shown to the player, and the saved catalog. */
export function useBadges(): { badges: BadgeInfo[]; unseen: BadgeInfo[] } {
  const server = useSyncExternalStore(subscribe, getServer);
  const seenRaw = useSyncExternalStore(subscribe, () => read(SEEN_KEY));
  const token = getSession().token;
  const badges = server && token && server.token === token ? (server.badges ?? []) : [];
  const seen = new Set(parse<string[]>(seenRaw, []));

  return { badges, unseen: badges.filter((b) => b.earned && !seen.has(`${b.quiz}|${b.key}`)) };
}

export function markBadgesSeen(badges: BadgeInfo[]): void {
  const seen = new Set(parse<string[]>(read(SEEN_KEY), []));
  badges.forEach((b) => seen.add(`${b.quiz}|${b.key}`));
  write(SEEN_KEY, JSON.stringify([...seen]));
}

/** Retry whenever the app opens or the connection returns. Call once; returns the cleanup. */
export function startQuizSync(): () => void {
  const retry = () => scheduleFlush(500);
  window.addEventListener('online', retry);
  document.addEventListener('visibilitychange', retry);
  retry();

  return () => {
    window.removeEventListener('online', retry);
    document.removeEventListener('visibilitychange', retry);
  };
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export interface LoyaltyView {
  /** Points on the phone that the backend has not seen yet. */
  pending: number;
  /** Everything: what the backend holds for the signed-in member (as of the last upload) plus `pending`. */
  total: number;
  answers: number;
}

/** What this phone's player has earned so far (signed in or not). */
export function useLoyalty(): LoyaltyView {
  const queue = useSyncExternalStore(subscribe, getQueue);
  const server = useSyncExternalStore(subscribe, getServer);
  const token = getSession().token;
  const pending = queue.reduce((sum, a) => sum + (a.correct ? QUIZ_POINTS : -QUIZ_POINTS), 0);
  const held = server && token && server.token === token ? server.points : 0;

  return { pending, total: held + pending, answers: queue.length };
}
