import type { Question } from './quizSections';

/**
 * The questions built from Wikidata facts (scripts/quizgen) live in src/data/gen/<section>Quiz.gen.json, apart from the
 * hand-made ones in quizSections.ts, and are loaded only when a section is opened, so the app does not parse thousands of
 * questions at start. Arabic only: the English banks are untouched. A section with no file just has no extra questions.
 */
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  football: () => import('./gen/footballQuiz.gen.json'),
  general: () => import('./gen/generalQuiz.gen.json'),
  history: () => import('./gen/historyQuiz.gen.json'),
  cinema: () => import('./gen/cinemaQuiz.gen.json'),
};

const loaded = new Map<string, Promise<Question[]>>();

export function loadExtraQuestions(sectionId: string): Promise<Question[]> {
  const load = LOADERS[sectionId];
  if (!load) return Promise.resolve([]);
  let p = loaded.get(sectionId);
  if (!p) {
    p = load()
      .then((m) => (m.default as { questions: Question[] }).questions)
      .catch(() => []);
    loaded.set(sectionId, p);
  }
  return p;
}
