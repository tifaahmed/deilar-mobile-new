import { describe, expect, it } from 'vitest';
import { merge as mergeScript, problemWith, sameWords, tidy } from '../../scripts/quizMerge.mjs';
import { SECTIONS, tidyQuestion } from '../data/quizSections';

interface Merged {
  merged: Array<Record<string, unknown>>;
  added: Array<{ id: number; design: string }>;
  duplicates: number;
  invalid: Array<{ at: number; why: string }>;
}
const merge = (existingQuestions: unknown[], incoming: unknown[], hasImage?: (name: string) => boolean) => mergeScript(existingQuestions as never, incoming as never, hasImage) as unknown as Merged;

const q = (over: Record<string, unknown> = {}) => ({ question: 'ما عاصمة فرنسا؟', options: ['باريس', 'ليون', 'نيس', 'مرسيليا'], correctAnswerIndex: 0, explanation: 'باريس.', category: 'جغرافيا', difficulty: 1, emoji: '🗼', ...over });
const existing = [{ id: 7, question: 'ما عاصمة مصر؟', options: ['القاهرة', 'الجيزة', 'أسوان', 'الأقصر'], correctAnswerIndex: 0, explanation: '', category: 'جغرافيا', difficulty: 1, emoji: '🏜️', design: 'cards' }];

describe('merging new questions into a section', () => {
  it('adds a valid new question with the next free id and leaves the old ones as they are', () => {
    const { merged, added, duplicates, invalid } = merge(existing, [q()]);

    expect(added).toHaveLength(1);
    expect(added[0].id).toBe(8);
    expect(DESIGNS_OK).toContain(added[0].design);
    expect(merged[0]).toBe(existing[0]);
    expect(duplicates + invalid.length).toBe(0);
  });

  it('skips a question whose words are already there, whatever its number or id', () => {
    const { added, duplicates } = merge(existing, [q({ question: 'ما عاصمة مصر؟' }), q({ question: 'لغز #12: ما عاصمة مصر؟' }), q({ question: '  ما عاصمة   مصر؟ ' })]);
    expect(added).toHaveLength(0);
    expect(duplicates).toBe(3);
  });

  it('skips a repeat inside the new file itself, keeping the first', () => {
    const { added, duplicates } = merge(existing, [q(), q({ options: ['باريس', 'لندن', 'روما', 'مدريد'] })]);
    expect(added).toHaveLength(1);
    expect(duplicates).toBe(1);
  });

  it.each([
    [{ options: ['أ', 'ب', 'ج'] }, 'options'],
    [{ options: ['أ', 'أ', 'ج', 'د'] }, 'different'],
    [{ correctAnswerIndex: 4 }, 'correctAnswerIndex'],
    [{ difficulty: 11 }, 'difficulty'],
    [{ difficulty: undefined }, 'difficulty'],
    [{ emoji: undefined }, 'neither'],
    [{ design: 'fancy' }, 'design'],
    [{ category: '' }, 'category'],
    [{ question: ' ' }, 'question'],
  ])('refuses an invalid question (%j)', (over, word) => {
    const { added, invalid } = merge(existing, [q(over as Record<string, unknown>)]);
    expect(added).toHaveLength(0);
    expect(invalid[0].why).toContain(word);
  });

  it('refuses a picture that is not in the assets folder, and accepts one that is', () => {
    expect(problemWith(q({ emoji: undefined, image: 'x.webp' }), () => false)).toContain('assets');
    expect(problemWith(q({ emoji: undefined, image: 'x.webp' }), () => true)).toBeNull();
    expect(problemWith(q({ emoji: undefined, image: 'x.png' }), () => true)).toContain('webp');
  });

  it('numbers the new questions from the highest id, not from the count', () => {
    const { added } = merge(existing, [q(), q({ question: 'سؤال آخر؟' })]);
    expect(added.map((a) => a.id)).toEqual([8, 9]);
  });

  it('works out "the same words" exactly as the game does', () => {
    for (const text of ['فزورة رقم #5: ما هو الشيء؟', 'من هو؟ (رقم 429)', 'معلومة ثفافية #332: في أي دولة؟', 'صاحب الرقم 10', 'لغز رياضي #1: عددان 25 والفرق 9']) {
      expect(tidy(text)).toBe(tidyQuestion(text));
    }
    expect(sameWords('  أ   ب ')).toBe('أ ب');
  });

  it('finds no repeat in any section as it stands', () => {
    for (const section of SECTIONS) {
      const keys = section.questions.map((x) => sameWords(x.question));
      expect(new Set(keys).size, `${section.id} repeats a question`).toBe(keys.length);
    }
  });
});

const DESIGNS_OK = ['cards', 'grid', 'bubbles', 'stadium', 'poster', 'polaroid', 'neon', 'comic'];
