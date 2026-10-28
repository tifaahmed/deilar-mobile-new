import { useSyncExternalStore } from 'react';

/**
 * Which questions of a section this player has met, per section (`quiz` key).
 *
 * A STAGE is one full pass over the section: a question is "solved" in the stage once it was answered right in it.
 * Each play picks `PLAY_SIZE` questions at random, those never met in this stage first, then those answered wrong,
 * and only then ones already solved. When every question of the section is solved the stage ends and the next one
 * starts from zero (`stage` + 1) — that is how a player who has seen everything begins again with all the questions.
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
export const contentKey = (q: PoolItem): string => (q.question ? q.question.replace(/\s+/g, ' ').trim() : `id:${q.id}`);

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

  // The stage is done when every DIFFERENT question has been solved once (questions with the same words are one question).
  const solvedNow = new Set(next.solved);
  const solvedKeys = new Set(pool.filter((q) => solvedNow.has(q.id)).map(contentKey));
  const stageCompleted = pool.every((q) => solvedKeys.has(contentKey(q)));
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

/** How much an answered-wrong / solved question costs against a never-met one, in difficulty levels (see pickQuestions). */
const TIER_PENALTY = { fresh: 0, missed: 3, solved: 6 } as const;

/**
 * The questions of the next play, easiest first and hardest last — and never one the player already solved.
 *
 * A question solved in this stage is out until the stage ends (when every different question is solved), whatever its id;
 * only when fewer than a full play is left to solve does a solved one make up the numbers. Among the rest, the play has
 * `size` slots whose target difficulty climbs evenly from the easiest to the hardest question of the section; each slot
 * takes the question nearest its target, preferring ones never met over ones answered wrong. Ties are random, and
 * questions with the same words are offered once.
 */
export function pickQuestions<T extends { id: number; difficulty: number; question?: string }>(quiz: string, pool: T[], size = PLAY_SIZE): T[] {
  const p = getProgress(quiz);
  const solvedIds = new Set(p.solved);
  const seenIds = new Set(p.seen);
  const solvedKeys = new Set(pool.filter((q) => solvedIds.has(q.id)).map(contentKey));
  const seenKeys = new Set(pool.filter((q) => seenIds.has(q.id)).map(contentKey));

  // One question per text, a random one of the twins.
  const onePerText = (items: T[]): T[] => {
    const taken = new Set<string>();
    return shuffle(items).filter((q) => {
      const key = contentKey(q);
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    });
  };

  // Every unsolved question stays a candidate (twins too, so a slot can take the twin whose difficulty suits it); once one
  // is picked its twins leave the list.
  const unsolved = shuffle(pool.filter((q) => !solvedKeys.has(contentKey(q))));
  const unsolvedTexts = new Set(unsolved.map(contentKey)).size;
  const fillers = unsolvedTexts < size ? onePerText(pool.filter((q) => solvedKeys.has(contentKey(q)))).slice(0, size - unsolvedTexts) : [];
  let left = [...unsolved, ...fillers];

  const tier = (q: T) => (solvedKeys.has(contentKey(q)) ? TIER_PENALTY.solved : seenKeys.has(contentKey(q)) ? TIER_PENALTY.missed : TIER_PENALTY.fresh);
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
    const best = left.reduce((a, b) => (tier(b) + Math.abs(b.difficulty - target) < tier(a) + Math.abs(a.difficulty - target) ? b : a));
    picked.push(best);
    const taken = contentKey(best);
    left = left.filter((q) => contentKey(q) !== taken);
  }

  // A stable sort: equally hard questions keep their random order.
  return picked.sort((a, b) => a.difficulty - b.difficulty);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useProgress = (quiz: string): SectionProgress => {
  const all = useSyncExternalStore(subscribe, readAll);
  return { ...empty(), ...all[quiz] };
};
