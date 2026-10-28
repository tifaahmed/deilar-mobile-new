import { beforeEach, describe, expect, it } from 'vitest';
import { SECTIONS } from '../data/quizSections';
import { PLAY_SIZE, contentKey, getProgress, pickQuestions, recordProgress } from '../utils/quizProgress';

const QUIZ = 'mcq:football';

/** The real question bank of the first section. */
const bank = SECTIONS[0].questions;

/** A small controlled bank: 40 questions, four on each level from 1 to 10 (id 1 = level 1, id 10 = level 10, id 11 = level 1 ...). */
const small = Array.from({ length: 40 }, (_, i) => ({ id: i + 1, difficulty: (i % 10) + 1, question: `سؤال ${i + 1}` }));
const solve = (pool: typeof small, ids: number[]) => ids.forEach((id) => recordProgress(QUIZ, pool, id, true));

describe('picking the questions of a play', () => {
  beforeEach(() => localStorage.clear());

  it('draws 10 different questions from the real bank, easiest first and hardest last', () => {
    for (let run = 0; run < 30; run++) {
      const deck = pickQuestions(QUIZ, bank);
      const levels = deck.map((q) => q.difficulty);

      expect(deck).toHaveLength(PLAY_SIZE);
      expect(new Set(deck.map((q) => q.id)).size).toBe(PLAY_SIZE);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
      // It climbs across the whole range, not 10 questions of one level.
      expect(levels[0]).toBeLessThanOrEqual(2);
      expect(levels[PLAY_SIZE - 1]).toBeGreaterThanOrEqual(9);
      expect(new Set(levels).size).toBeGreaterThanOrEqual(8);
    }
  });

  it.each(SECTIONS.map((s) => [s.id, s] as const))('draws a climbing play from the %s section too, and keeps its progress apart', (_id, section) => {
    for (let run = 0; run < 10; run++) {
      const levels = pickQuestions(section.key, section.questions).map((q) => q.difficulty);
      expect(levels).toHaveLength(PLAY_SIZE);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
      expect(levels[PLAY_SIZE - 1] - levels[0]).toBeGreaterThanOrEqual(6);
    }

    recordProgress(section.key, section.questions, section.questions[0].id, true);
    expect(getProgress(section.key).solved).toEqual([section.questions[0].id]);
    SECTIONS.filter((other) => other.key !== section.key).forEach((other) => expect(getProgress(other.key).solved).toEqual([]));
  });

  it('is different every time (so a player does not get the same ten again)', () => {
    const plays = new Set(Array.from({ length: 10 }, () => pickQuestions(QUIZ, bank).map((q) => q.id).join(',')));
    expect(plays.size).toBeGreaterThan(5);
  });

  it('gives a bank of just ten questions in full, easiest first', () => {
    const ten = small.slice(0, 10);
    expect(pickQuestions(QUIZ, ten).map((q) => q.difficulty)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('never offers a question that was solved, while enough are left to make a play', () => {
    // Everything from level 5 up is solved: the 20 left are all easy (levels 1-4), far from the hard slots of the climb.
    solve(small, small.filter((q) => q.difficulty >= 5).map((q) => q.id));
    const solved = new Set(small.filter((q) => q.difficulty >= 5).map((q) => q.id));

    for (let run = 0; run < 30; run++) {
      expect(pickQuestions(QUIZ, small).filter((q) => solved.has(q.id))).toHaveLength(0);
    }
  });

  it('brings back questions answered wrong when too few new ones are left, but never solved ones', () => {
    // 26 solved, ids 31-40 answered wrong, and only ids 1-4 never met: the play is those four plus the ones to retry.
    solve(small, smallIdsRange(5, 30));
    small.slice(30).forEach((q) => recordProgress(QUIZ, small, q.id, false));
    const solved = new Set(smallIdsRange(5, 30));

    for (let run = 0; run < 20; run++) {
      const deck = pickQuestions(QUIZ, small);
      expect(deck).toHaveLength(PLAY_SIZE);
      expect(deck.filter((q) => solved.has(q.id))).toHaveLength(0);
      expect(deck.filter((q) => q.id > 30)).toHaveLength(6);
      expect(deck.filter((q) => q.id <= 4)).toHaveLength(4);
    }
  });

  it('treats questions with the same words as one: solving one keeps its twins away, and a play holds only one of them', () => {
    const twins = [
      { id: 1, difficulty: 1, question: 'ما عاصمة مصر؟' },
      { id: 2, difficulty: 1, question: 'ما عاصمة مصر؟' },
      { id: 3, difficulty: 1, question: '  ما عاصمة   مصر؟ ' },
      ...Array.from({ length: 20 }, (_, i) => ({ id: 10 + i, difficulty: (i % 10) + 1, question: `سؤال آخر ${i}` })),
    ];
    expect(contentKey(twins[0])).toBe(contentKey(twins[2]));

    for (let run = 0; run < 30; run++) {
      expect(pickQuestions(QUIZ, twins).filter((q) => q.id <= 3).length).toBeLessThanOrEqual(1);
    }

    recordProgress(QUIZ, twins, 2, true);
    for (let run = 0; run < 30; run++) {
      expect(pickQuestions(QUIZ, twins).filter((q) => q.id <= 3)).toHaveLength(0);
    }
  });

  it('only a solved question may fill a play when fewer than ten are left to solve', () => {
    solve(small, smallIdsRange(1, 35)); // 5 left unsolved
    const deck = pickQuestions(QUIZ, small);

    expect(deck).toHaveLength(PLAY_SIZE);
    expect(deck.filter((q) => q.id > 35)).toHaveLength(5);
    expect(deck.filter((q) => q.id <= 35)).toHaveLength(5);
  });

  it('starts a new stage with every question when all were solved', () => {
    small.forEach((q, i) => {
      const result = recordProgress(QUIZ, small, q.id, true);
      expect(result.stageCompleted).toBe(i === small.length - 1);
    });

    expect(getProgress(QUIZ)).toMatchObject({ stage: 2, stagesDone: 1, seen: [], solved: [] });
    expect(pickQuestions(QUIZ, small)).toHaveLength(PLAY_SIZE);
  });

  it('ends a stage once every DIFFERENT question is solved, not every id', () => {
    const twins = [
      { id: 1, difficulty: 1, question: 'أ' },
      { id: 2, difficulty: 1, question: 'أ' },
      { id: 3, difficulty: 2, question: 'ب' },
    ];
    expect(recordProgress(QUIZ, twins, 1, true).stageCompleted).toBe(false);
    expect(recordProgress(QUIZ, twins, 3, true).stageCompleted).toBe(true); // 'أ' and 'ب' are solved: id 2 is the same question as id 1
    expect(getProgress(QUIZ).stage).toBe(2);
  });

  it.each(SECTIONS.map((s) => [s.id, s] as const))('walks a whole stage of the %s section without showing any question twice', (_id, section) => {
    const different = new Set(section.questions.map(contentKey)).size;
    const seen = new Set<string>();
    let repeats = 0;
    let plays = 0;
    let completed = false;

    while (!completed && plays < 400) {
      plays++;
      const deck = pickQuestions(section.key, section.questions);
      expect(deck.length).toBeGreaterThan(0);
      expect(new Set(deck.map(contentKey)).size).toBe(deck.length); // never two of the same question in one play

      for (const q of deck) {
        if (seen.has(contentKey(q))) repeats++;
        seen.add(contentKey(q));
        completed = recordProgress(section.key, section.questions, q.id, true).stageCompleted || completed;
      }
    }

    expect(completed).toBe(true);
    expect(seen.size).toBe(different);
    // The only repeats allowed are the fillers of the very last play, when fewer than ten were left.
    expect(repeats).toBeLessThan(PLAY_SIZE);
    expect(plays).toBeLessThanOrEqual(Math.ceil(different / PLAY_SIZE) + 1);
    expect(getProgress(section.key).stage).toBe(2);
  });
});

function smallIdsRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
