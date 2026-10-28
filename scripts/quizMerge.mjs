#!/usr/bin/env node
/**
 * Adds new questions to a quiz section without ever adding a repeat.
 *
 *   npm run quiz:merge -- <section> <new-questions.json> [--dry]
 *
 * <section> is football | fawazeer | general | history. The new file may be a plain list or `{ "questions": [...] }` in the
 * same shape as the section's own file. A new question is skipped when
 *   - its words are already in the section (the same words with another number or another id are the same question),
 *   - its words repeat inside the new file itself, or
 *   - it is not valid (not 4 different options, a wrong correctAnswerIndex, no difficulty 1-10, no image/emoji, a picture
 *     that is not in the section's assets folder ...).
 * The questions that pass get the next free ids and are appended; nothing already in the file is changed.
 * `--dry` prints the report and writes nothing.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const SECTION_FILES = {
  football: { data: 'src/data/footballQuiz.json', assets: 'src/assets/quiz' },
  fawazeer: { data: 'src/data/fawazeerQuiz.json', assets: 'src/assets/fawazeer' },
  general: { data: 'src/data/generalQuiz.json', assets: 'src/assets/general' },
  history: { data: 'src/data/historyQuiz.json', assets: 'src/assets/history' },
};

export const DESIGNS = ['cards', 'grid', 'bubbles', 'stadium', 'poster', 'polaroid', 'neon', 'comic'];

/** Same rule as `tidyQuestion` in src/data/quizSections.ts (a test keeps the two equal): a question's number is not part of it. */
export function tidy(text) {
  return String(text)
    .replace(/^[^:：؟?]{1,45}?\s*(?:رقم\s*#?|#)\d+\s*[:：]\s*/u, '')
    .replace(/\s*\(\s*رقم\s*#?\d+\s*\)/gu, '')
    .replace(/\s+رقم\s*#?\d+(?=\s*[:：])/gu, '')
    .replace(/\s*#\d+/gu, '')
    .replace(/\s+([:：])/gu, '$1')
    .replace(/\s{2,}/gu, ' ')
    .trim();
}

/** What makes two questions the same. */
export const sameWords = (text) => tidy(text).replace(/\s+/g, ' ');

const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

/** Why a question cannot go in, or null. `hasImage(name)` says whether a picture file exists. */
export function problemWith(q, hasImage) {
  if (!q || typeof q !== 'object') return 'not an object';
  if (!nonEmpty(q.question)) return 'no question text';
  if (!Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(nonEmpty)) return 'options are not 4 texts';
  if (new Set(q.options.map((o) => o.trim())).size !== 4) return 'options are not all different';
  if (![0, 1, 2, 3].includes(q.correctAnswerIndex)) return 'correctAnswerIndex is not 0-3';
  if (!Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 10) return 'difficulty is not a whole number 1-10';
  if (!nonEmpty(q.category)) return 'no category';
  if (q.design !== undefined && !DESIGNS.includes(q.design)) return `unknown design "${q.design}"`;
  if (q.image) {
    if (!String(q.image).endsWith('.webp')) return 'image is not a .webp';
    if (!hasImage(q.image)) return `image "${q.image}" is not in the section's assets folder`;
  } else if (!nonEmpty(q.emoji)) return 'neither image nor emoji';
  return null;
}

/**
 * Merges `incoming` into `existing`. Pure: returns what to write and a report.
 * @param {object[]} existing
 * @param {object[]} incoming
 * @param {(name: string) => boolean} [hasImage]
 * @returns {{ merged: object[], added: object[], duplicates: number, invalid: Array<{ at: number, why: string }> }}
 */
export function merge(existing, incoming, hasImage = () => true) {
  const known = new Set(existing.map((q) => sameWords(q.question)));
  let nextId = existing.reduce((max, q) => Math.max(max, q.id), 0) + 1;
  const added = [];
  const invalid = [];
  let duplicates = 0;

  incoming.forEach((q, at) => {
    const why = problemWith(q, hasImage);
    if (why) return void invalid.push({ at, why });

    const key = sameWords(q.question);
    if (known.has(key)) return void (duplicates += 1);
    known.add(key);

    const out = {
      id: nextId++,
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
      category: q.category.trim(),
      difficulty: q.difficulty,
    };
    if (q.image) out.image = q.image;
    else out.emoji = q.emoji;
    out.design = q.design ?? DESIGNS[(nextId - 1) % DESIGNS.length];
    added.push(out);
  });

  return { merged: [...existing, ...added], added, duplicates, invalid };
}

const questionsOf = (file) => (Array.isArray(file) ? file : file.questions);

function main(argv) {
  const dry = argv.includes('--dry');
  const [section, source] = argv.filter((a) => !a.startsWith('--'));
  const spec = SECTION_FILES[section];

  if (!spec || !source) {
    console.error(`Usage: npm run quiz:merge -- <${Object.keys(SECTION_FILES).join('|')}> <new-questions.json> [--dry]`);
    process.exit(2);
  }

  const dataPath = resolve(ROOT, spec.data);
  const file = JSON.parse(readFileSync(dataPath, 'utf8'));
  const incoming = questionsOf(JSON.parse(readFileSync(resolve(source), 'utf8')));
  const { merged, added, duplicates, invalid } = merge(questionsOf(file), incoming, (name) => existsSync(resolve(ROOT, spec.assets, name)));

  console.log(`Section ${section}: ${questionsOf(file).length} questions before`);
  console.log(`  new file: ${incoming.length} questions`);
  console.log(`  added: ${added.length}   repeated (skipped): ${duplicates}   invalid (skipped): ${invalid.length}`);
  invalid.slice(0, 10).forEach(({ at, why }) => console.log(`    #${at + 1} of the new file: ${why}`));
  if (invalid.length > 10) console.log(`    ... and ${invalid.length - 10} more`);
  console.log(`  after: ${merged.length} questions${dry ? ' (dry run: nothing written)' : ''}`);

  if (!dry && added.length > 0) {
    const out = Array.isArray(file) ? merged : { ...file, ...(file.totalQuestions !== undefined ? { totalQuestions: merged.length } : {}), questions: merged };
    writeFileSync(dataPath, `${JSON.stringify(out, null, 2)}\n`);
    console.log('Written. Now run `npm test` to check the file.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
