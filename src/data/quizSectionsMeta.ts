/**
 * The names of the quiz sections, apart from their questions, so code that runs all over the app (the "you can play
 * again" notice) knows them without loading the questions. The questions and pictures are in quizSections.ts.
 */
export const SECTION_META = {
  football: { id: 'football', key: 'mcq:football', title: 'الكورة', titleEn: 'Football', emoji: '⚽' },
  fawazeer: { id: 'fawazeer', key: 'mcq:fawazeer', title: 'الفوازير', titleEn: 'Riddles', emoji: '🧩' },
  general: { id: 'general', key: 'mcq:general', title: 'معلومات عامة', titleEn: 'General knowledge', emoji: '🌍' },
  history: { id: 'history', key: 'mcq:history', title: 'التاريخ', titleEn: 'History', emoji: '🏛️' },
  cinema: { id: 'cinema', key: 'mcq:cinema', title: 'سينما ومسلسلات مصرية', titleEn: 'Egyptian movies & series', emoji: '🎬' },
} as const;

export const SECTION_LIST = Object.values(SECTION_META);
