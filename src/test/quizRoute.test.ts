import { describe, expect, it } from 'vitest';
import { parseRoute, routeHref } from '../router';
import { parseQuizPath } from '../components/QuizGame';

describe('quiz addresses', () => {
  it.each([
    ['/quiz', ''],
    ['/quiz/', ''],
    ['/quiz/mcq', 'mcq'],
    ['/quiz/mcq/football', 'mcq/football'],
    ['/quiz/history', 'history'],
    ['/quiz/moods/-40', 'moods/-40'],
  ])('%s is the quiz page, with the rest of the address kept', (path, quizPath) => {
    const route = parseRoute(path, '');
    expect(route.quiz).toBe(true);
    expect(route.quizPath).toBe(quizPath);
  });

  it('builds the address back from a route', () => {
    expect(routeHref({ quiz: true })).toBe('/quiz');
    expect(routeHref({ quiz: true, quizPath: 'mcq/fawazeer' })).toBe('/quiz/mcq/fawazeer');
  });

  it('does not take other pages for the quiz', () => {
    expect(parseRoute('/store', '').quiz).toBeFalsy();
    expect(parseRoute('/quizzes', '').quiz).toBeFalsy();
  });

  it('tells which screen, section and points scene an address means', () => {
    expect(parseQuizPath('')).toMatchObject({ step: 'types', sectionId: null });
    expect(parseQuizPath('mcq')).toMatchObject({ step: 'sections' });
    expect(parseQuizPath('mcq/football')).toMatchObject({ step: 'intro', sectionId: 'football' });
    expect(parseQuizPath('mcq/history')).toMatchObject({ step: 'intro', sectionId: 'history' });
    expect(parseQuizPath('history')).toMatchObject({ step: 'history' });
    expect(parseQuizPath('badges')).toMatchObject({ step: 'badges' });
    expect(parseQuizPath('moods')).toMatchObject({ step: 'moods', moodScore: null });
    expect(parseQuizPath('moods/-40')).toMatchObject({ step: 'moods', moodScore: -40 });
    expect(parseQuizPath('moods/70')).toMatchObject({ step: 'moods', moodScore: 70 });
  });

  it('falls back to the sections list for a section that does not exist, and to the start for nonsense', () => {
    expect(parseQuizPath('mcq/nope')).toMatchObject({ step: 'sections' });
    expect(parseQuizPath('whatever/else')).toMatchObject({ step: 'types' });
  });
});
