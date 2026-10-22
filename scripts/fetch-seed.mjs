// Downloads the small lookup lists the home page and filters need and saves them INSIDE the app
// (src/seed/lookups.json), so the first launch paints them with no network wait; the live answer
// still replaces them a moment later. Re-run before a store release:  npm run seed
import { writeFileSync } from 'node:fs';

const API = process.env.VITE_API_URL ?? 'https://card.deilar.com/api/v1';
const PATHS = ['/mobile/facility-types', '/mobile/governorates', '/mobile/store-categories', '/mobile/product-types'];
const out = {};

for (const lang of ['ar', 'en']) {
  out[lang] = {};
  for (const path of PATHS) {
    const res = await fetch(`${API}${path}?lang=${lang}`);
    if (!res.ok) throw new Error(`${path} (${lang}) answered ${res.status}`);
    out[lang][path] = await res.json();
  }
}

writeFileSync(new URL('../src/seed/lookups.json', import.meta.url), JSON.stringify(out));
console.log(`Saved ${PATHS.length} lists x 2 languages to src/seed/lookups.json`);
