/**
 * The names of the quiz sections, apart from their questions, so code that runs all over the app (the "you can play
 * again" notice) knows them without loading the questions. The questions and pictures are in quizSections.ts.
 */
export const SECTION_META = {
  football: { id: 'football', key: 'mcq:football', title: 'الكورة', emoji: '⚽' },
  fawazeer: { id: 'fawazeer', key: 'mcq:fawazeer', title: 'الفوازير', emoji: '🧩' },
  general: { id: 'general', key: 'mcq:general', title: 'معلومات عامة', emoji: '🌍' },
  history: { id: 'history', key: 'mcq:history', title: 'التاريخ', emoji: '🏛️' },
} as const;

export const SECTION_LIST = Object.values(SECTION_META);
