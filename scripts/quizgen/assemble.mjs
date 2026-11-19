#!/usr/bin/env node
/**
 * Offline: builds src/data/gen/<section>Quiz.gen.json from the cached Wikidata answers.
 *   node scripts/quizgen/assemble.mjs [section...]
 * Nothing in the hand-made files is touched. A generated question is left out when
 *   - its words are already in the section (sameWords), or
 *   - an existing question names the same subject AND has the same right answer (the same fact worded another way).
 * Types are mixed round-robin, most famous first, until the section's target is reached.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { build, fetchBands } from './lib.mjs';
import { RECIPES } from './recipes.mjs';
import { SECTION_FILES, problemWith, sameWords } from '../quizMerge.mjs';

process.env.QUIZGEN_OFFLINE = '1';
// minSl = how famous an item must be; target = how many NEW questions to add (Infinity = all that pass)
const PLAN = {
  football: { minSl: 30, target: 4000 },
  general: { minSl: 20, target: 4000 },
  history: { minSl: 10, target: 4000 }, // the Egyptian recipes (egypt: true) go in first, whole; the world ones fill up to the target
  cinema: { minSl: 3, target: 4000 },
};
const FIRST_ID = 10001;
const sections = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLAN);

mkdirSync('src/data/gen', { recursive: true });
for (const section of sections) {
  const { minSl, target } = PLAN[section];
  const files = SECTION_FILES[section];
  const raw = JSON.parse(readFileSync(files.data, 'utf8'));
  const existing = Array.isArray(raw) ? raw : raw.questions;
  const known = new Set(existing.map((q) => sameWords(q.question)));
  const facts = existing.map((q) => ({ text: q.question, right: q.options[q.correctAnswerIndex] }));

  const lists = [];
  for (const r of RECIPES.filter((x) => x.section === section)) {
    const { rows } = await fetchBands(r, r.bands);
    let qs = build({ ...r, minSl: r.minSl ?? minSl }, rows);
    qs = qs.filter((q) => {
      const key = sameWords(q.question);
      if (known.has(key)) return false;
      const subject = q.explanation; // not used for matching; the subject is the item label inside the question text
      void subject;
      const right = q.options[q.correctAnswerIndex];
      const item = q.question;
      return !facts.some((f) => f.right === right && itemIn(item, f.text));
    });
    // difficulty: rank among what is kept of this type (famous = easy)
    qs.sort((a, b) => b.sl - a.sl);
    qs.forEach((q, i) => (q.difficulty = Math.min(10, 1 + Math.floor((i / qs.length) * 10))));
    console.error(`  ${r.id}: ${qs.length}`);
    qs.egypt = !!r.egypt;
    lists.push(qs);
  }

  const picked = [];
  const seen = new Set();
  const roundRobin = (group, limit) => {
    for (let i = 0; picked.length < limit; i++) {
      let any = false;
      for (const l of group) {
        if (i >= l.length) continue;
        any = true;
        const q = l[i];
        const key = sameWords(q.question);
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push(q);
        if (picked.length >= limit) break;
      }
      if (!any) break;
    }
  };
  roundRobin(lists.filter((l) => l.egypt), Infinity); // priority types: every question
  const egyptCount = picked.length;
  roundRobin(lists.filter((l) => !l.egypt), Math.max(target, egyptCount));
  if (egyptCount) console.log(`${section}: ${egyptCount} priority (Egyptian) questions`);

  const out = [];
  let bad = 0;
  picked.forEach((q) => {
    const { sl, _source, ...clean } = q;
    void sl; void _source;
    if (problemWith(clean, () => true)) { bad++; return; }
    out.push({ id: FIRST_ID + out.length, ...clean });
  });
  writeFileSync(`src/data/gen/${section}Quiz.gen.json`, JSON.stringify({ questions: out }));
  console.log(`${section}: existing ${existing.length} + new ${out.length} = ${existing.length + out.length} (invalid ${bad})`);
}

/** Does `existingText` talk about the subject of `newText`? The subject is the quoted name «…» or the last words before the "؟". */
function itemIn(newText, existingText) {
  const quoted = newText.match(/«([^»]+)»/)?.[1];
  const subject = quoted ?? newText.replace(/؟$/, '').split(/\s+/).slice(-2).join(' ');
  return subject.length >= 3 && existingText.includes(subject);
}
