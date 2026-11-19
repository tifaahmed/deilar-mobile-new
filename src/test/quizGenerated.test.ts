import { describe, expect, it } from 'vitest';
import { SECTIONS, tidyQuestion } from '../data/quizSections';
import { loadExtraQuestions } from '../data/quizExtra';
import { contentKey } from '../utils/quizProgress';

const DESIGNS = ['cards', 'grid', 'bubbles', 'stadium', 'poster', 'polaroid', 'neon', 'comic'];

// The questions built from Wikidata (scripts/quizgen) must be as clean as the hand-made ones and never repeat one.
describe.each(SECTIONS.map((s) => [s.id, s] as const))('generated questions of %s', (id, section) => {
  it('are valid, never repeat, and never repeat a hand-made question', async () => {
    const extra = await loadExtraQuestions(id);
    const base = new Set(section.questions.map(contentKey));
    const baseIds = new Set(section.questions.map((q) => q.id));
    const seenText = new Set<string>();
    const seenId = new Set<number>();
    const problems: string[] = [];

    for (const q of extra) {
      const text = tidyQuestion(q.question);
      if (seenId.has(q.id) || baseIds.has(q.id) || q.id >= 100000) problems.push(`id ${q.id}`);
      seenId.add(q.id);
      if (seenText.has(text) || base.has(text)) problems.push(`repeat: ${text}`);
      seenText.add(text);
      if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map((o) => o.trim())).size !== 4 || q.options.some((o) => !o.trim())) problems.push(`options ${q.id}`);
      if (![0, 1, 2, 3].includes(q.correctAnswerIndex)) problems.push(`answer ${q.id}`);
      if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 10) problems.push(`difficulty ${q.id}`);
      if (!q.emoji && !q.image) problems.push(`no picture ${q.id}`);
      if (!DESIGNS.includes(q.design)) problems.push(`design ${q.id}`);
      if (/#\d/.test(q.question) || q.options.some((o) => /^0\d+$/.test(o))) problems.push(`leaked number ${q.id}`);
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  it('all four answer places are used about equally', async () => {
    const extra = await loadExtraQuestions(id);
    if (extra.length < 100) return;
    const places = [0, 0, 0, 0];
    extra.forEach((q) => places[q.correctAnswerIndex]++);
    places.forEach((n) => expect(n / extra.length).toBeGreaterThan(0.2));
  });
});
