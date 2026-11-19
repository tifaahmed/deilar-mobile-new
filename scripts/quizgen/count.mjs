#!/usr/bin/env node
/** Offline: rebuild every recipe from the cached Wikidata answers and print how many questions each fame floor keeps. */
import { build, fetchBands } from './lib.mjs';
import { RECIPES } from './recipes.mjs';
process.env.QUIZGEN_OFFLINE = '1';
const floors = [100, 50, 30, 20, 10, 6, 3];
const totals = {};
for (const r of RECIPES) {
  const { rows } = await fetchBands(r, r.bands);
  const line = floors.map((f) => build({ ...r, minSl: f }, rows).length);
  console.log(r.id.padEnd(20), line.join('\t'));
  for (const sec of [r.section]) totals[sec] = (totals[sec] ?? floors.map(() => 0)).map((v, i) => v + line[i]);
}
console.log('floors'.padEnd(20), floors.join('\t'));
for (const [sec, t] of Object.entries(totals)) console.log(sec.padEnd(20), t.join('\t'));
