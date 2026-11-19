import { useSyncExternalStore } from 'react';

/**
 * Which questions of a section this player has met, per section (`quiz` key).
 *
 * A STAGE is one full pass over the section: a question is "solved" in the stage once it was answered right in it.
 * Each play picks `PLAY_SIZE` questions never answered before. A question answered once — right or wrong — never comes back
 * (owner rule 2026-11-18); the stage ends when every question of the section was answered (`stage` + 1).
 * `lifetime` keeps right / wrong counts per question across stages for the history screen.
 * Kept on the phone; the badges (which the stage feeds) are the backend's.
 */
export const PLAY_SIZE = 10;

export interface PoolItem {
  id: number;
  question?: string;
}

/**
 * Two questions with the same words are ONE question, whatever their ids: the generated question files repeat a text under
 * new numbers, and a player must not meet a question they solved just because it has another id.
 */
const keyCache = new WeakMap<object, string>();
export const contentKey = (q: PoolItem): string => {
  // The same question objects are keyed over and over while a play is picked, so the answer is remembered.
  let key = keyCache.get(q);
  if (key === undefined) {
    key = q.question ? q.question.replace(/\s+/g, ' ').trim() : `id:${q.id}`;
    keyCache.set(q, key);
  }
  return key;
};

export interface SectionProgress {
  stage: number;
  /** Ids answered (right or wrong) in this stage. */
  seen: number[];
  /** Ids answered right in this stage. */
  solved: number[];
  /** Stages finished so far. */
  stagesDone: number;
  lifetime: Record<number, { right: number; wrong: number }>;
}

// v2: the question bank was replaced (the same ids now mean other questions), so progress starts clean.
const KEY = 'deilar_quiz_progress_v2';
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Record<string, SectionProgress> } | null = null;

const empty = (): SectionProgress => ({ stage: 1, seen: [], solved: [], stagesDone: 0, lifetime: {} });

function readAll(): Record<string, SectionProgress> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* storage unavailable */
  }
  if (cache?.raw !== raw) {
    let value: Record<string, SectionProgress> = {};
    try {
      value = raw ? (JSON.parse(raw) as Record<string, SectionProgress>) : {};
    } catch {
      /* corrupt entry: start clean */
    }
    cache = { raw, value };
  }
  return cache.value;
}

export const getProgress = (quiz: string): SectionProgress => ({ ...empty(), ...readAll()[quiz] });

function save(quiz: string, progress: SectionProgress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [quiz]: progress }));
  } catch {
    /* storage unavailable: the game still works */
  }
  listeners.forEach((l) => l());
}

/**
 * Notes one answer. Returns the stage the player is in AFTER it (the number the backend gets) and whether this answer
 * finished the stage.
 */
export function recordProgress(quiz: string, pool: PoolItem[], questionId: number, correct: boolean): { stage: number; stageCompleted: boolean } {
  const p = getProgress(quiz);
  const life = p.lifetime[questionId] ?? { right: 0, wrong: 0 };
  const next: SectionProgress = {
    ...p,
    seen: p.seen.includes(questionId) ? p.seen : [...p.seen, questionId],
    solved: correct && !p.solved.includes(questionId) ? [...p.solved, questionId] : p.solved,
    lifetime: { ...p.lifetime, [questionId]: { right: life.right + (correct ? 1 : 0), wrong: life.wrong + (correct ? 0 : 1) } },
  };

  // The stage is done when every DIFFERENT question has been answered once (questions with the same words are one question):
  // an answered question never comes back, so the stage is the whole section.
  const answeredKeys = new Set(pool.filter((q) => next.lifetime[q.id]).map(contentKey));
  const stageCompleted = pool.every((q) => answeredKeys.has(contentKey(q)));
  if (stageCompleted) {
    next.stage = p.stage + 1;
    next.stagesDone = p.stagesDone + 1;
    next.seen = [];
    next.solved = [];
  }

  save(quiz, next);
  return { stage: next.stage, stageCompleted };
}

const shuffle = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};


/**
 * The questions of the next play, easiest first and hardest last — only ones this player has NEVER answered (see `unansweredOf`).
 * The play has `size` slots whose target difficulty climbs evenly from the easiest to the hardest unanswered question; each slot
 * takes the question nearest its target. Ties are random, and questions with the same words are offered once. Fewer than
 * `size` come back when fewer are left, none when the player has answered the whole section.
 */
export function pickQuestions<T extends { id: number; difficulty: number; question?: string }>(quiz: string, pool: T[], size = PLAY_SIZE): T[] {
  let left = shuffle(unansweredOf(quiz, pool));
  let lo = Infinity;
  let hi = -Infinity;
  for (const q of left) {
    lo = Math.min(lo, q.difficulty);
    hi = Math.max(hi, q.difficulty);
  }

  const picked: T[] = [];
  const slots = Math.min(size, left.length); // fixed now: `left` shrinks as questions are taken
  for (let slot = 0; slot < slots; slot++) {
    const target = size > 1 ? lo + ((hi - lo) * slot) / (size - 1) : lo;
    // `left` is shuffled, so the first of equal scores is a random one.
    const best = left.reduce((a, b) => (Math.abs(b.difficulty - target) < Math.abs(a.difficulty - target) ? b : a));
    picked.push(best);
    const taken = contentKey(best);
    left = left.filter((q) => contentKey(q) !== taken);
  }

  // A stable sort: equally hard questions keep their random order.
  return picked.sort((a, b) => a.difficulty - b.difficulty);
}

/**
 * The questions this player has NEVER answered (right or wrong), twins (same words) counted as answered with their twin.
 * Owner rule 2026-11-18: a question that was answered once is never shown again, for good (`lifetime` is kept across stages).
 */
export function unansweredOf<T extends { id: number; question?: string }>(quiz: string, pool: T[]): T[] {
  const lifetime = getProgress(quiz).lifetime;
  const answeredKeys = new Set(pool.filter((q) => lifetime[q.id]).map(contentKey));
  return pool.filter((q) => !answeredKeys.has(contentKey(q)));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useProgress = (quiz: string): SectionProgress => {
  const all = useSyncExternalStore(subscribe, readAll);
  return { ...empty(), ...all[quiz] };
};
