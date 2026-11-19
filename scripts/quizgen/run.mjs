#!/usr/bin/env node
/** node scripts/quizgen/run.mjs <section> — fetches every recipe of the section and writes OUT/<id>.json plus a count line. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { build, fetchBands } from './lib.mjs';
import { RECIPES } from './recipes.mjs';

const OUT = process.env.QUIZGEN_OUT ?? '/tmp/quizgen-out';
mkdirSync(OUT, { recursive: true });
const section = process.argv[2];
for (const recipe of RECIPES.filter((r) => r.section === section)) {
  const { rows, failed } = await fetchBands(recipe, recipe.bands);
  const questions = build(recipe, rows);
  writeFileSync(`${OUT}/${recipe.id}.json`, JSON.stringify(questions));
  console.log(`${section} ${recipe.id}: rows ${rows.length} -> questions ${questions.length}${failed.length ? ' (failed bands: ' + failed.join(',') + ')' : ''}`);
}
console.log(`${section} DONE`);
