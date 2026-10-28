import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECTIONS, type Question } from '../data/quizSections';

/**
 * Checks every quiz questions file (src/data/*Quiz.json, listed in src/data/quizSections.ts) so it can be edited by hand:
 * run `npm test` after a change. Each rule is one check that names the ids of every question breaking it, e.g.
 * "ids with a problem: 17, 402". A file may be a plain list or `{ "questions": [...] }`.
 */
const DESIGNS = ['cards', 'grid', 'bubbles', 'stadium', 'poster', 'polaroid', 'neon', 'comic'];
const MAX_IMAGE_BYTES = 20 * 1024;

type Q = Record<string, unknown>;
const text = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

it('lists each section once, with its own backend key', () => {
  expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
  expect(new Set(SECTIONS.map((s) => s.key)).size).toBe(SECTIONS.length);
  expect(SECTIONS.every((s) => s.key.startsWith('mcq:'))).toBe(true);
});

describe.each(SECTIONS)('quiz section $id', (section) => {
  const questions = section.questions as unknown as Q[];
  const assets = resolve(__dirname, '../assets', section.assetsFolder);

  /** The ids of the questions for which `bad` is true. */
  const failing = (bad: (q: Q) => boolean): string => questions.filter(bad).map((q) => q.id).join(', ');

  it('has at least ten questions (a play is ten)', () => {
    expect(questions.length).toBeGreaterThanOrEqual(10);
  });

  it('has unique, positive whole-number ids', () => {
    const seen = new Set<unknown>();
    const repeated = questions.filter((q) => seen.has(q.id) || !seen.add(q.id)).map((q) => q.id);
    expect(failing((q) => !(Number.isInteger(q.id) && (q.id as number) > 0)), 'ids that are not positive whole numbers').toBe('');
    expect(repeated.join(', '), 'ids used twice').toBe('');
  });

  it('has the question text', () => {
    expect(failing((q) => !text(q.question)), 'ids with an empty question').toBe('');
  });

  it('has exactly 4 non-empty, different options and a correct answer from 0 to 3', () => {
    const badOptions = (q: Q) => {
      const o = q.options;
      return !(Array.isArray(o) && o.length === 4 && o.every(text) && new Set((o as string[]).map((x) => x.trim())).size === 4);
    };
    expect(failing(badOptions), 'ids whose options are not 4 different texts').toBe('');
    expect(failing((q) => ![0, 1, 2, 3].includes(q.correctAnswerIndex as number)), 'ids whose correctAnswerIndex is not 0-3').toBe('');
  });

  it('has a difficulty from 1 (easiest) to 10 (hardest)', () => {
    expect(failing((q) => !(Number.isInteger(q.difficulty) && (q.difficulty as number) >= 1 && (q.difficulty as number) <= 10)), 'ids whose "difficulty" is not a whole number 1-10').toBe('');
  });

  it('spreads over at least 6 different difficulty levels, so a play can climb from easy to hard', () => {
    const levels = new Set(questions.map((q) => q.difficulty));
    expect(levels.size, `difficulty levels used: ${[...levels].sort().join(', ')}`).toBeGreaterThanOrEqual(6);
  });

  it('has a category and a known design', () => {
    expect(failing((q) => !text(q.category)), 'ids without a category').toBe('');
    expect(failing((q) => !DESIGNS.includes(q.design as string)), `ids whose design is not one of ${DESIGNS.join('/')}`).toBe('');
  });

  it('has a picture (a small .webp in its assets folder) or an emoji', () => {
    expect(failing((q) => !q.image && !text(q.emoji)), 'ids with neither "image" nor "emoji"').toBe('');
    expect(failing((q) => !!q.image && !String(q.image).endsWith('.webp')), 'ids whose image is not a .webp').toBe('');
    expect(failing((q) => !!q.image && !existsSync(resolve(assets, String(q.image)))), `ids whose image file is not in src/assets/${section.assetsFolder}`).toBe('');
    expect(failing((q) => !!q.image && !section.imageOf(String(q.image))), 'ids whose image the game cannot load').toBe('');
  });

  it('keeps every image of the section at 20KB or less', () => {
    const big = readdirSync(assets).filter((f) => statSync(resolve(assets, f)).size > MAX_IMAGE_BYTES);
    expect(big.join(', '), 'images over 20KB').toBe('');
  });
});

// The type is part of the contract the JSON files are read through.
export type _Checked = Question;
