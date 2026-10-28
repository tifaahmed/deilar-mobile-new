import { describe, expect, it } from 'vitest';
import { SECTIONS, tidyQuestion } from '../data/quizSections';

describe('question numbers are never shown to a player', () => {
  it.each([
    ['معلومة ثفافية #332: في أي دولة توجد صحراء أتاكاما؟', 'في أي دولة توجد صحراء أتاكاما؟'],
    ['لغز رياضي #1: عددان مجموعهما 25 والفرق بينهما 9، ما هو العدد الأكبر؟', 'عددان مجموعهما 25 والفرق بينهما 9، ما هو العدد الأكبر؟'],
    ['فزورة رقم #5: ما هو الشيء الذي يجري بلا أقدام؟', 'ما هو الشيء الذي يجري بلا أقدام؟'],
    ['فزورة رقم 5: ما هو الشيء الذي يجري بلا أقدام؟', 'ما هو الشيء الذي يجري بلا أقدام؟'],
    ['لغز عقارب الساعة #12: إذا كانت الساعة الآن 3:15، كم تكون بعد ساعتين؟', 'إذا كانت الساعة الآن 3:15، كم تكون بعد ساعتين؟'],
    ['من هو مؤسس الدولة المرابطية؟ (رقم 429)', 'من هو مؤسس الدولة المرابطية؟'],
    ['من هو مؤسس الدولة المرابطية؟ (رقم #429)', 'من هو مؤسس الدولة المرابطية؟'],
  ])('takes the number out of "%s"', (input, expected) => {
    expect(tidyQuestion(input)).toBe(expected);
  });

  it('leaves a colon or a year that is part of a question, with no label to take out', () => {
    const q = 'في عام 1990: من فاز بكأس العالم؟';
    expect(tidyQuestion(q)).toBe(q);
  });

  it('leaves a number that is part of the question', () => {
    const q = 'من هو اللاعب الأرجنتيني صاحب الرقم 10 الفائز بكأس العالم 2022؟';
    expect(tidyQuestion(q)).toBe(q);
    expect(tidyQuestion('في أي عام أقيمت أول بطولة لكأس العالم؟')).toBe('في أي عام أقيمت أول بطولة لكأس العالم؟');
  });

  it.each(SECTIONS.map((s) => [s.id, s] as const))('no question of the %s section carries a number in its text', (_id, section) => {
    const numbered = section.questions.filter((q) => /#\d|\(\s*رقم|رقم\s*#?\d+\s*[:：)]|\s[:：]\s/u.test(q.question)).map((q) => q.id);
    expect(numbered.join(', '), 'ids whose text still shows a number').toBe('');
  });

  it.each(SECTIONS.map((s) => [s.id, s] as const))('no question of the %s section opens with a generated section title', (_id, section) => {
    const labelled = section.questions.filter((q) => /^(?:معلومة ثفافية|معلومة ثقافية|لغز[^:؟]{0,40}|فزورة)\s*[:：]/u.test(q.question)).map((q) => q.id);
    expect(labelled.join(', '), 'ids that still start with a title like "لغز رياضي:"').toBe('');
  });
});
