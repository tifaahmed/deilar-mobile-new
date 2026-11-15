import { describe, expect, it } from 'vitest';
import { feedbackPhrase } from '../utils/quizPhrases';

const base = { correct: false, timedOut: false, rightRun: 0, wrongRun: 0, wrongTotal: 0, isAr: true, random: () => 0 };

describe('the line after each answer', () => {
  it('teases more the more wrong answers come in a row', () => {
    expect(feedbackPhrase({ ...base })).toContain('غلط يا حبيبي');
    expect(feedbackPhrase({ ...base, wrongRun: 1 })).toContain('غلط يا باشتنا');
    expect(feedbackPhrase({ ...base, wrongRun: 2 })).toContain('مش قولتلك');
    expect(feedbackPhrase({ ...base, wrongRun: 3 })).toContain('مفيش فايدة');
  });

  it('cheers more the longer the right run, and notices a comeback', () => {
    expect(feedbackPhrase({ ...base, correct: true })).toContain('✅');
    expect(feedbackPhrase({ ...base, correct: true, rightRun: 6 })).toContain('7');
    expect(feedbackPhrase({ ...base, correct: true, wrongRun: 2 })).toContain('💪');
  });

  it('knows a lost streak and a time-out, and speaks English', () => {
    expect(feedbackPhrase({ ...base, rightRun: 4 })).toContain('🥲');
    expect(feedbackPhrase({ ...base, timedOut: true })).toContain('⏰');
    expect(feedbackPhrase({ ...base, isAr: false })).toContain('Wrong');
  });
});
