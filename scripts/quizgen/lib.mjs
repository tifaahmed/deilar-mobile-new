/**
 * Quiz questions built from Wikidata facts — nothing is written from memory.
 *
 *   recipe = { section, category, emoji, query, ask(itemLabel), kind: 'entity' | 'year', explain(itemLabel, ansLabel) }
 *
 * `query` returns ?item ?itemLabel ?ans ?ansLabel ?sl (sitelinks = how famous the item is → the difficulty).
 * An item with more than one answer is skipped (ambiguous). Every label must be Arabic. The wrong options come from the
 * recipe's own answers (same kind of thing), years from the neighbouring years.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CACHE = process.env.QUIZGEN_CACHE ?? '/tmp/quizgen-cache';
mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sparql(query) {
  const file = join(CACHE, createHash('sha1').update(query).digest('hex') + '.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  if (process.env.QUIZGEN_OFFLINE) throw new Error('not cached');
  globalThis.__quizgenNet = true;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(query), {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'quiz-data-builder/1.0' },
        signal: AbortSignal.timeout(90000),
      });
      if (res.ok) {
        const rows = (await res.json()).results.bindings;
        writeFileSync(file, JSON.stringify(rows));
        return rows;
      }
      console.error('wikidata', res.status, 'attempt', attempt);
    } catch (e) {
      console.error('wikidata error', String(e).slice(0, 80), 'attempt', attempt);
    }
    await sleep(8000 * attempt);
  }
  throw new Error('wikidata failed');
}

const ARABIC = /[؀-ۿ]/;
const goodLabel = (v) => typeof v === 'string' && ARABIC.test(v) && !/^Q\d+$/.test(v) && v.length <= 60 && !/[()（）]/.test(v);
const shuffle = (a) => { const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
const DESIGNS = ['cards', 'grid', 'bubbles', 'stadium', 'poster', 'polaroid', 'neon', 'comic'];

export function rowsOf(bindings, kind) {
  const byItem = new Map();
  // A name Wikidata had to disambiguate with brackets ("X (emperor)") is shared by another person/thing: the plain "X" is ambiguous too.
  const homonyms = new Set();
  for (const b of bindings) {
    const l = b.itemLabel?.value;
    if (typeof l === 'string' && /[()（）]/.test(l)) homonyms.add(l.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').trim());
  }
  for (const b of bindings) {
    const item = b.item?.value;
    const itemLabel = b.itemLabel?.value;
    if (homonyms.has(itemLabel)) continue;
    let ans = b.ansLabel?.value;
    if (kind === 'year') { const y = String(b.ans?.value ?? '').match(/^-?\d{1,4}/)?.[0]; ans = y === undefined ? undefined : String(Number(y)); }
    if (kind === 'literal' || kind === 'number') ans = b.ans?.value;
    if (kind === 'year' && String(b.ans?.value ?? '').startsWith('-')) continue; // BCE: "which year" would be a trap
    if (!item || !goodLabel(itemLabel) || !ans || ((kind === 'entity' || kind === 'member') && !goodLabel(ans))) continue;
    const e = byItem.get(item) ?? { itemLabel, answers: new Set(), sl: Number(b.sl?.value ?? 0) };
    e.answers.add(ans);
    byItem.set(item, e);
  }
  // one answer only, else the question would be ambiguous (kind 'member' keeps every answer: one is asked, none is offered as wrong)
  return [...byItem.values()]
    .filter((e) => kind === 'member' ? e.answers.size >= 1 : e.answers.size === 1)
    .map((e) => ({ itemLabel: e.itemLabel, ans: [...e.answers][0], all: e.answers, sl: e.sl }));
}

export function build(recipe, bindings, limit = Infinity) {
  // `ansOk` keeps answers of ONE granularity (e.g. governorates only), so a wrong option can never also be true (a district inside a governorate)
  const rows = rowsOf(recipe.ansOk ? bindings.filter((b) => recipe.ansOk(b.ansLabel?.value ?? '')) : bindings, recipe.kind);
  // two items with the same name would be the same question
  const nameCount = new Map();
  rows.forEach((r) => nameCount.set(r.itemLabel, (nameCount.get(r.itemLabel) ?? 0) + 1));
  const usable = rows.filter((r) => nameCount.get(r.itemLabel) === 1 && r.sl >= (recipe.minSl ?? 20)).sort((a, b) => b.sl - a.sl).slice(0, limit);
  // wrong options come from answers that many items share (countries, positions ...), never from a one-off like a defunct state
  const freq = new Map();
  usable.forEach((r) => r.all.forEach((a) => freq.set(a, (freq.get(a) ?? 0) + 1)));
  const common = [...freq].filter(([, n]) => n >= 3).map(([a]) => a);
  const pool = common.length >= 12 ? common : [...freq.keys()];
  const out = [];
  usable.forEach((r, rank) => {
    let wrong;
    if (recipe.kind === 'year') {
      const y = Number(r.ans);
      const cands = shuffle([-9, -7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7, 9].map((d) => y + d).filter((v) => v > 0 && v <= new Date().getFullYear()));
      wrong = cands.slice(0, 3).map(String);
    } else if (recipe.kind === 'number') {
      const y = Number(r.ans);
      wrong = shuffle([-3, -2, -1, 1, 2, 3, 5].map((d) => y + d).filter((v) => v > 0)).slice(0, 3).map(String);
    } else {
      wrong = shuffle(pool.filter((a) => !r.all.has(a))).slice(0, 3);
    }
    if (wrong.length < 3) return;
    const options = shuffle([r.ans, ...wrong]);
    out.push({
      question: recipe.ask(r.itemLabel),
      options,
      correctAnswerIndex: options.indexOf(r.ans),
      explanation: recipe.explain(r.itemLabel, r.ans),
      category: recipe.category,
      difficulty: Math.min(10, 1 + Math.floor((rank / usable.length) * 10)),
      emoji: recipe.emoji,
      design: DESIGNS[Math.floor(Math.random() * DESIGNS.length)],
      sl: r.sl,
      _source: 'wikidata',
    });
  });
  return out;
}

/** Runs the recipe's query in fame bands (sitelinks), each a small answer, and keeps going when a band keeps failing. */
export async function fetchBands(recipe, bands = [[100, 9999], [50, 100], [30, 50], [20, 30], [14, 20], [10, 14], [7, 10]]) {
  const all = [];
  const failed = [];
  for (const [min, max] of bands) {
    const q = recipe.query.replace('%BAND%', `FILTER(?sl >= ${min} && ?sl < ${max})`);
    try {
      const rows = await sparql(q);
      all.push(...rows);
      console.error(`  ${recipe.id} [${min}-${max}) ${rows.length}`);
    } catch {
      failed.push(`${min}-${max}`);
      console.error(`  ${recipe.id} [${min}-${max}) FAILED`);
    }
    if (globalThis.__quizgenNet) await sleep(1500); // only after a real request, not for an answer read from the cache
    globalThis.__quizgenNet = false;
  }
  return { rows: all, failed };
}
