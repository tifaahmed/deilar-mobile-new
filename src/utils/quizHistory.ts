import { useSyncExternalStore } from 'react';

/**
 * Every quiz play, kept on the phone: when it was played, how many answers were right / wrong and the points won or lost.
 * Local only (the backend already holds each answer with its play id and time for signed-in members).
 */
export interface QuizPlay {
  /** The play's id (the same one the answers are uploaded with), so saving it twice keeps one row. */
  id: string;
  played_at: string;
  quiz: string;
  title: string;
  right: number;
  wrong: number;
  /** False when the player left before the last question. */
  completed: boolean;
  points: number;
}

const KEY = 'deilar_quiz_history';
const MAX = 200;
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: QuizPlay[] } | null = null;

const readRaw = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function getHistory(): QuizPlay[] {
  const raw = readRaw();
  if (cache?.raw !== raw) {
    let value: QuizPlay[] = [];
    try {
      value = raw ? (JSON.parse(raw) as QuizPlay[]) : [];
    } catch {
      /* corrupt entry: start clean */
    }
    cache = { raw, value };
  }
  return cache.value;
}

/** Newest first. A play already saved (same id) is replaced, which is how a left-early row becomes the finished one. */
export function savePlay(play: QuizPlay): void {
  const next = [play, ...getHistory().filter((p) => p.id !== play.id)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the game still works */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useQuizHistory = (): QuizPlay[] => useSyncExternalStore(subscribe, getHistory);
