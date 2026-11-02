import football from './footballQuiz.json';
import fawazeer from './fawazeerQuiz.json';
import general from './generalQuiz.json';
import history from './historyQuiz.json';
import cinema from './cinemaQuiz.json';
import { SECTION_META } from './quizSectionsMeta';
import footballEn from './en/footballQuiz.en.json';
import fawazeerEn from './en/fawazeerQuiz.en.json';
import generalEn from './en/generalQuiz.en.json';
import historyEn from './en/historyQuiz.en.json';
import cinemaEn from './en/cinemaQuiz.en.json';
import type { QuizLang } from './quizLanguage';

/** The ways a question can be drawn (see LOOKS in components/QuizGame.tsx). */
export type QuizDesign = 'cards' | 'grid' | 'bubbles' | 'stadium' | 'poster' | 'polaroid' | 'neon' | 'comic';

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  category: string;
  /** 1 (easiest) to 10 (hardest). A play is drawn easiest-first (utils/quizProgress.ts) and shows this on the card. */
  difficulty: number;
  /** Questions without a picture name an `emoji` to show big instead. */
  image?: string;
  emoji?: string;
  design: QuizDesign;
}

export interface QuizSection {
  id: string;
  /** What the backend files this section's answers, progress and badges under (config/loyalty.php `sections`). */
  key: string;
  title: string;
  /** What a shared result says the game was about: "لعبت تحدي <topic>". */
  topic: string;
  emoji: string;
  /** Tailwind gradient of the section's button. */
  color: string;
  /** Tailwind gradient of the start screen. */
  introBg: string;
  introTitle: string;
  /** The folder under src/assets that holds the pictures named by the questions. */
  assetsFolder: string;
  questions: Question[];
  imageOf: (name: string) => string | undefined;
}

/**
 * A question's number is for the file, never for a player. Some generated questions carry one in their text
 * ("... #332: ...", "فزورة رقم #5: ...", "... (رقم 375)"): it is taken out when the questions are loaded, and the files stay as
 * they are. A number that is part of the question ("صاحب الرقم 10") is left alone.
 */
export function tidyQuestion(text: string): string {
  return text
    // a generated label with its number at the very start: "لغز رياضي #1: ...", "فزورة رقم #5: ..." (the label is a section title)
    .replace(/^[^:：؟?]{1,45}?\s*(?:رقم\s*#?|#)\d+\s*[:：]\s*/u, '')
    .replace(/\s*\(\s*رقم\s*#?\d+\s*\)/gu, '')
    .replace(/\s+رقم\s*#?\d+(?=\s*[:：])/gu, '')
    .replace(/\s*#\d+/gu, '')
    .replace(/\s+([:：])/gu, '$1')
    .replace(/\s{2,}/gu, ' ')
    .trim();
}

// A questions file is either a plain list or `{ "questions": [...] }`; both load as they are.
const bank = (file: unknown): Question[] =>
  ((Array.isArray(file) ? file : (file as { questions: Question[] }).questions) as Question[]).map((q) => ({ ...q, question: tidyQuestion(q.question) }));

const footballImages = import.meta.glob('../assets/quiz/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const fawazeerImages = import.meta.glob('../assets/fawazeer/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const generalImages = import.meta.glob('../assets/general/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const cinemaImages = import.meta.glob('../assets/cinema/*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const historyImages = import.meta.glob('../assets/history/*.webp', { eager: true, import: 'default' }) as Record<string, string>;

/**
 * Game types → sections → questions. Every section here is a multiple-choice section. To add one: put its questions file in
 * src/data, its pictures in src/assets/<folder>, list it below, and add its `key` to `sections` in the backend's
 * config/loyalty.php (that is what gives it badges).
 */
export const SECTIONS: QuizSection[] = [
  {
    ...SECTION_META.football,
    topic: 'كرة القدم',
    color: 'from-emerald-500 to-emerald-600',
    introBg: 'from-emerald-400 via-emerald-500 to-emerald-700',
    introTitle: 'تحدي معلومات كرة القدم',
    assetsFolder: 'quiz',
    questions: bank(football),
    imageOf: (name) => footballImages[`../assets/quiz/${name}`],
  },
  {
    ...SECTION_META.fawazeer,
    topic: 'الفوازير',
    color: 'from-fuchsia-500 to-purple-600',
    introBg: 'from-fuchsia-400 via-purple-500 to-indigo-700',
    introTitle: 'تحدي الفوازير والألغاز',
    assetsFolder: 'fawazeer',
    questions: bank(fawazeer),
    imageOf: (name) => fawazeerImages[`../assets/fawazeer/${name}`],
  },
  {
    ...SECTION_META.general,
    topic: 'المعلومات العامة',
    color: 'from-sky-500 to-blue-600',
    introBg: 'from-sky-400 via-blue-500 to-indigo-700',
    introTitle: 'تحدي المعلومات العامة',
    assetsFolder: 'general',
    questions: bank(general),
    imageOf: (name) => generalImages[`../assets/general/${name}`],
  },
  {
    ...SECTION_META.history,
    topic: 'التاريخ',
    color: 'from-amber-500 to-orange-600',
    introBg: 'from-amber-400 via-orange-500 to-red-700',
    introTitle: 'تحدي التاريخ',
    assetsFolder: 'history',
    questions: bank(history),
    imageOf: (name) => historyImages[`../assets/history/${name}`],
  },
  {
    ...SECTION_META.cinema,
    topic: 'السينما والمسلسلات',
    color: 'from-rose-500 to-red-600',
    introBg: 'from-rose-400 via-red-500 to-purple-800',
    introTitle: 'تحدي السينما والمسلسلات',
    assetsFolder: 'cinema',
    questions: bank(cinema),
    imageOf: (name) => cinemaImages[`../assets/cinema/${name}`],
  },
];

/**
 * English questions live in src/data/en/<section>Quiz.en.json (same fields as the Arabic files, no pictures: each names an
 * `emoji`). Their ids are moved up by EN_ID_OFFSET so a player's progress and answers in English never mix with the Arabic ones.
 */
export const EN_ID_OFFSET = 100000;

const bankEn = (file: unknown): Question[] => (file as { questions: Question[] }).questions.map((q) => ({ ...q, id: q.id + EN_ID_OFFSET }));

const EN: Record<string, { topic: string; introTitle: string; questions: Question[] }> = {
  football: { topic: 'football', introTitle: 'Football Trivia Challenge', questions: bankEn(footballEn) },
  fawazeer: { topic: 'riddles', introTitle: 'Riddles & Puzzles Challenge', questions: bankEn(fawazeerEn) },
  general: { topic: 'general knowledge', introTitle: 'General Knowledge Challenge', questions: bankEn(generalEn) },
  history: { topic: 'history', introTitle: 'History Challenge', questions: bankEn(historyEn) },
  cinema: { topic: 'movies & series', introTitle: 'Movies & Series Challenge', questions: bankEn(cinemaEn) },
};

/** A section in the language the player chose: the English one has its own title, topic and questions, and no pictures. */
export function sectionIn(section: QuizSection, lang: QuizLang | null): QuizSection {
  if (lang !== 'en') return section;
  const en = EN[section.id];
  if (!en) return section;
  const titleEn = (SECTION_META as Record<string, { titleEn?: string }>)[section.id]?.titleEn ?? section.title;
  return { ...section, title: titleEn, topic: en.topic, introTitle: en.introTitle, questions: en.questions, imageOf: () => undefined };
}
