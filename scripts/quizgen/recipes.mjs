/** Every recipe = one kind of fact, read from Wikidata. See lib.mjs. */
const LABEL = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "ar". }';
const q = (where) => `SELECT DISTINCT ?item ?itemLabel ?ans ?ansLabel ?sl WHERE { ${where} ?item wikibase:sitelinks ?sl. %BAND% ${LABEL} }`;
const PLAYER = '?item wdt:P106 wd:Q937857; wdt:P413 ?pos;'; // a real footballer has a playing position (amateurs like writers who once played do not)
const CLUB = '?item wdt:P31 wd:Q476028;';
const FILM = '?item wdt:P31 wd:Q11424; wdt:P495 wd:Q79;'; // an Egyptian film
const SERIES = '?item wdt:P31 wd:Q5398426; wdt:P495 wd:Q79;'; // an Egyptian TV series
const LOW = [[20, 9999], [10, 20], [6, 10], [4, 6], [3, 4], [2, 3]];

export const RECIPES = [
  // ---- football
  { id: 'fb-nat', section: 'football', category: 'أساطير الكرة', emoji: '⚽', kind: 'entity', query: q(`${PLAYER} wdt:P27 ?ans.`), ask: (n) => `ما جنسية لاعب كرة القدم ${n}؟`, explain: (n, a) => `${n} لاعب كرة قدم يحمل جنسية ${a}.` },
  { id: 'fb-pos', section: 'football', category: 'أساطير الكرة', emoji: '⚽', kind: 'entity', query: q(`${PLAYER} wdt:P413 ?ans.`), ask: (n) => `في أي مركز يلعب ${n}؟`, explain: (n, a) => `مركز ${n}: ${a}.` },
  { id: 'fb-birth', section: 'football', category: 'أساطير الكرة', emoji: '🎂', kind: 'year', query: q(`${PLAYER} wdt:P569 ?ans.`), ask: (n) => `في أي عام وُلد لاعب كرة القدم ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { id: 'fb-club-country', section: 'football', category: 'الأندية', emoji: '🏟️', kind: 'entity', query: q(`${CLUB} wdt:P17 ?ans.`), ask: (n) => `في أي دولة يوجد نادي ${n.replace(/^نادي\s+/, '')}؟`, explain: (n, a) => `نادي ${n.replace(/^نادي\s+/, '')} في ${a}.` },
  { id: 'fb-club-venue', section: 'football', category: 'الأندية', emoji: '🏟️', kind: 'entity', query: q(`${CLUB} wdt:P115 ?ans.`), ask: (n) => `ما اسم الملعب الذي يلعب عليه نادي ${n.replace(/^نادي\s+/, '')}؟`, explain: (n, a) => `ملعب نادي ${n.replace(/^نادي\s+/, '')}: ${a}.` },
  { id: 'fb-club-founded', section: 'football', category: 'الأندية', emoji: '📅', kind: 'year', query: q(`${CLUB} wdt:P571 ?ans.`), ask: (n) => `في أي عام تأسس نادي ${n.replace(/^نادي\s+/, '')}؟`, explain: (n, a) => `تأسس نادي ${n.replace(/^نادي\s+/, '')} عام ${a}.` },
  { id: 'fb-club-league', section: 'football', category: 'الأندية', emoji: '🏆', kind: 'entity', query: q(`${CLUB} wdt:P118 ?ans.`), ask: (n) => `في أي دوري يلعب نادي ${n.replace(/^نادي\s+/, '')}؟`, explain: (n, a) => `يلعب نادي ${n.replace(/^نادي\s+/, '')} في ${a}.` },
  { id: 'fb-stadium-country', section: 'football', category: 'الملاعب', emoji: '🏟️', kind: 'entity', query: q(`?item wdt:P31 wd:Q483110; wdt:P17 ?ans.`), ask: (n) => `في أي دولة يقع ملعب ${n.replace(/^(ملعب|استاد|إستاد)\s+/, '')}؟`, explain: (n, a) => `ملعب ${n.replace(/^(ملعب|استاد|إستاد)\s+/, '')} في ${a}.` },

  // ---- general
  { id: 'g-capital', section: 'general', category: 'جغرافيا وعواصم', emoji: '🌍', kind: 'entity', query: q(`?item wdt:P31 wd:Q3624078; wdt:P36 ?ans.`), ask: (n) => `ما عاصمة ${n}؟`, explain: (n, a) => `عاصمة ${n} هي ${a}.` },
  { id: 'g-continent', section: 'general', category: 'جغرافيا وعواصم', emoji: '🌍', kind: 'entity', query: q(`?item wdt:P31 wd:Q3624078; wdt:P30 ?ans.`), ask: (n) => `في أي قارة تقع ${n}؟`, explain: (n, a) => `${n} في ${a}.` },
  { id: 'g-currency', section: 'general', category: 'جغرافيا وعواصم', emoji: '💰', kind: 'entity', query: q(`?item wdt:P31 wd:Q3624078; wdt:P38 ?ans.`), ask: (n) => `ما عملة ${n}؟`, explain: (n, a) => `عملة ${n}: ${a}.` },
  { id: 'g-element-symbol', section: 'general', category: 'علوم', emoji: '🧪', kind: 'literal', query: q(`?item wdt:P31 wd:Q11344; wdt:P246 ?ans.`), ask: (n) => `ما الرمز الكيميائي لعنصر ${n}؟`, explain: (n, a) => `رمز عنصر ${n} هو ${a}.` },
  { id: 'g-element-number', section: 'general', category: 'علوم', emoji: '🧪', kind: 'number', query: q(`?item wdt:P31 wd:Q11344; wdt:P1086 ?ans.`), ask: (n) => `ما العدد الذري لعنصر ${n}؟`, explain: (n, a) => `العدد الذري لعنصر ${n} هو ${a}.` },
  { id: 'g-city-country', section: 'general', category: 'جغرافيا وعواصم', emoji: '🏙️', kind: 'entity', query: q(`VALUES ?t { wd:Q515 wd:Q1549591 } ?item wdt:P31 ?t; wdt:P17 ?ans.`), ask: (n) => `في أي دولة تقع مدينة ${n.replace(/^مدينة\s+/, '')}؟`, explain: (n, a) => `مدينة ${n} في ${a}.` },
  { id: 'g-river-country', section: 'general', category: 'جغرافيا وعواصم', emoji: '🌊', kind: 'entity', query: q(`?item wdt:P31 wd:Q4022; wdt:P17 ?ans.`), ask: (n) => `في أي دولة يجري نهر ${n.replace(/^نهر\s+/, '')}؟`, explain: (n, a) => `نهر ${n.replace(/^نهر\s+/, '')} في ${a}.` },
  { id: 'g-mountain-country', section: 'general', category: 'جغرافيا وعواصم', emoji: '⛰️', kind: 'entity', query: q(`?item wdt:P31 wd:Q8502; wdt:P17 ?ans.`), ask: (n) => `في أي دولة يقع جبل ${n.replace(/^جبل\s+/, '')}؟`, explain: (n, a) => `جبل ${n.replace(/^جبل\s+/, '')} في ${a}.` },
  { id: 'g-novel-author', section: 'general', category: 'فن وأدب', emoji: '📚', kind: 'entity', query: q(`?item wdt:P31 wd:Q8261; wdt:P50 ?ans.`), ask: (n) => `من مؤلف رواية «${n}»؟`, explain: (n, a) => `مؤلف رواية «${n}» هو ${a}.` },
  { id: 'g-painting-artist', section: 'general', category: 'فن وأدب', emoji: '🎨', kind: 'entity', query: q(`?item wdt:P31 wd:Q3305213; wdt:P170 ?ans.`), ask: (n) => `من رسام لوحة «${n}»؟`, explain: (n, a) => `رسم لوحة «${n}» ${a}.` },
  { id: 'g-scientist-birth', section: 'general', category: 'علوم', emoji: '🔬', kind: 'year', query: q(`?item wdt:P106 wd:Q901; wdt:P569 ?ans.`), ask: (n) => `في أي عام وُلد العالم ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { id: 'g-writer-birth', section: 'general', category: 'فن وأدب', emoji: '✍️', kind: 'year', query: q(`?item wdt:P106 wd:Q36180; wdt:P569 ?ans.`), ask: (n) => `في أي عام وُلد الكاتب ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },

  // ---- history
  { id: 'h-battle-year', section: 'history', category: 'حروب ومعارك', emoji: '⚔️', kind: 'year', query: q(`?item wdt:P31 wd:Q178561; wdt:P585 ?ans.`), ask: (n) => `في أي عام وقعت ${n}؟`, explain: (n, a) => `وقعت ${n} عام ${a}.` },
  { id: 'h-war-start', section: 'history', category: 'حروب ومعارك', emoji: '⚔️', kind: 'year', query: q(`?item wdt:P31 wd:Q198; wdt:P580 ?ans.`), ask: (n) => `في أي عام بدأت ${n}؟`, explain: (n, a) => `بدأت ${n} عام ${a}.` },
  { id: 'h-treaty-year', section: 'history', category: 'تاريخ عالمي', emoji: '📜', kind: 'year', query: q(`?item wdt:P31 wd:Q131569; wdt:P585 ?ans.`), ask: (n) => `في أي عام وُقّعت ${n}؟`, explain: (n, a) => `وُقّعت ${n} عام ${a}.` },
  { id: 'h-revolution', section: 'history', category: 'تاريخ عالمي', emoji: '🏛️', kind: 'year', query: q(`?item wdt:P31 wd:Q10931; wdt:P580 ?ans.`), ask: (n) => `في أي عام بدأت ${n}؟`, explain: (n, a) => `بدأت ${n} عام ${a}.` },
  { id: 'h-monarch-birth', section: 'history', category: 'شخصيات تاريخية', emoji: '👑', kind: 'year', query: q(`?item wdt:P106 wd:Q116; wdt:P569 ?ans.`), ask: (n) => `في أي عام وُلد ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { id: 'h-monarch-death', section: 'history', category: 'شخصيات تاريخية', emoji: '👑', kind: 'year', query: q(`?item wdt:P106 wd:Q116; wdt:P570 ?ans.`), ask: (n) => `في أي عام توفي ${n}؟`, explain: (n, a) => `توفي ${n} عام ${a}.` },
  { id: 'h-event-year', section: 'history', category: 'تاريخ عالمي', emoji: '📅', kind: 'year', query: q(`?item wdt:P31 wd:Q13418847; wdt:P585 ?ans.`), ask: (n) => `في أي عام حدث «${n}»؟`, explain: (n, a) => `حدث «${n}» عام ${a}.` },

  // ---- cinema (Egypt only)
  { id: 'c-film-director', section: 'cinema', category: 'أفلام مصرية', emoji: '🎬', kind: 'entity', bands: LOW, query: q(`${FILM} wdt:P57 ?ans.`), ask: (n) => `من أخرج الفيلم المصري «${n}»؟`, explain: (n, a) => `أخرج فيلم «${n}» ${a}.` },
  { id: 'c-film-year', section: 'cinema', category: 'أفلام مصرية', emoji: '🎬', kind: 'year', bands: LOW, query: q(`${FILM} wdt:P577 ?ans.`), ask: (n) => `في أي عام صدر الفيلم المصري «${n}»؟`, explain: (n, a) => `صدر فيلم «${n}» عام ${a}.` },
  { id: 'c-film-cast', section: 'cinema', category: 'أفلام مصرية', emoji: '🎭', kind: 'member', bands: LOW, query: q(`${FILM} wdt:P161 ?ans.`), ask: (n) => `من الممثلين الذين شاركوا في بطولة الفيلم المصري «${n}»؟`, explain: (n, a) => `${a} من فريق تمثيل فيلم «${n}».` },
  { id: 'c-film-writer', section: 'cinema', category: 'أفلام مصرية', emoji: '✍️', kind: 'entity', bands: LOW, query: q(`${FILM} wdt:P58 ?ans.`), ask: (n) => `من كتب سيناريو الفيلم المصري «${n}»؟`, explain: (n, a) => `كتب سيناريو فيلم «${n}» ${a}.` },
  { id: 'c-film-music', section: 'cinema', category: 'أفلام مصرية', emoji: '🎼', kind: 'entity', bands: LOW, query: q(`${FILM} wdt:P86 ?ans.`), ask: (n) => `من وضع موسيقى الفيلم المصري «${n}»؟`, explain: (n, a) => `وضع موسيقى فيلم «${n}» ${a}.` },
  { id: 'c-series-year', section: 'cinema', category: 'مسلسلات مصرية', emoji: '📺', kind: 'year', bands: LOW, query: q(`${SERIES} wdt:P580 ?ans.`), ask: (n) => `في أي عام بدأ عرض المسلسل المصري «${n}»؟`, explain: (n, a) => `بدأ عرض مسلسل «${n}» عام ${a}.` },
  { id: 'c-series-cast', section: 'cinema', category: 'مسلسلات مصرية', emoji: '📺', kind: 'member', bands: LOW, query: q(`${SERIES} wdt:P161 ?ans.`), ask: (n) => `من الممثلين الذين شاركوا في بطولة المسلسل المصري «${n}»؟`, explain: (n, a) => `${a} من فريق تمثيل مسلسل «${n}».` },
  { id: 'c-series-director', section: 'cinema', category: 'مسلسلات مصرية', emoji: '📺', kind: 'entity', bands: LOW, query: q(`${SERIES} wdt:P57 ?ans.`), ask: (n) => `من أخرج المسلسل المصري «${n}»؟`, explain: (n, a) => `أخرج مسلسل «${n}» ${a}.` },
  { id: 'c-actor-birth', section: 'cinema', category: 'نجوم مصريون', emoji: '⭐', kind: 'year', bands: LOW, query: q(`?item wdt:P106 wd:Q33999; wdt:P27 wd:Q79; wdt:P569 ?ans.`), ask: (n) => `في أي عام وُلد الفنان ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { id: 'c-actor-birthplace', section: 'cinema', category: 'نجوم مصريون', emoji: '⭐', kind: 'entity', bands: LOW, query: q(`?item wdt:P106 wd:Q33999; wdt:P27 wd:Q79; wdt:P19 ?ans.`), ask: (n) => `في أي مدينة وُلد الفنان ${n}؟`, explain: (n, a) => `وُلد ${n} في ${a}.` },
];

// ---- Egyptian history (priority: all of these go into the history section before any world question)
const EG = { section: 'history', egypt: true, bands: [[30, 9999], [14, 30], [8, 14], [4, 8], [2, 4], [1, 2]], minSl: 2 };
const MONUMENT = 'VALUES ?mt { wd:Q12516 wd:Q44539 wd:Q32815 wd:Q839954 wd:Q33506 wd:Q57821 wd:Q16560 } ?item wdt:P31 ?mt; wdt:P17 wd:Q79;';
const EGP = (extra) => `?item wdt:P27 wd:Q79; ${extra}`;
const strip = "n.replace(/^(مسجد|معبد|هرم|متحف)\\s+/, '')";
RECIPES.push(
  { ...EG, id: 'h-eg-pharaoh-dynasty', category: 'مصر القديمة', emoji: '🔺', kind: 'entity', query: q(`?item wdt:P39 wd:Q39018; wdt:P53 ?ans.`), ask: (n) => `إلى أي أسرة حاكمة ينتمي الفرعون ${n}؟`, explain: (n, a) => `ينتمي ${n} إلى ${a}.` },
  { ...EG, id: 'h-eg-monument-place', ansOk: (a) => /^محافظة /.test(a), category: 'آثار مصرية', emoji: '🏛️', kind: 'entity', query: q(`${MONUMENT} wdt:P131 ?ans.`), ask: (n) => `أين يقع «${n}» في مصر؟`, explain: (n, a) => `يقع «${n}» في ${a}.` },
  { ...EG, id: 'h-eg-monument-founded', category: 'آثار مصرية', emoji: '🏛️', kind: 'year', query: q(`${MONUMENT} wdt:P571 ?ans.`), ask: (n) => `في أي عام أُنشئ «${n}» في مصر؟`, explain: (n, a) => `أُنشئ «${n}» عام ${a}.` },
  { ...EG, id: 'h-eg-city-founded', category: 'مدن مصرية', emoji: '🏙️', kind: 'year', query: q(`?item wdt:P31 wd:Q515; wdt:P17 wd:Q79; wdt:P571 ?ans.`), ask: (n) => `في أي عام تأسست مدينة ${n.replace(/^مدينة\s+/, '')} المصرية؟`, explain: (n, a) => `تأسست ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-battle-year', category: 'حروب مصر', emoji: '⚔️', kind: 'year', query: q(`?item wdt:P31 wd:Q178561; wdt:P17 wd:Q79; wdt:P585 ?ans.`), ask: (n) => `في أي عام وقعت ${n}؟`, explain: (n, a) => `وقعت ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-war-year', category: 'حروب مصر', emoji: '⚔️', kind: 'year', query: q(`?item wdt:P31 wd:Q198; wdt:P710 wd:Q79; wdt:P580 ?ans.`), ask: (n) => `في أي عام بدأت ${n}؟`, explain: (n, a) => `بدأت ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-politician-birth', category: 'شخصيات مصرية', emoji: '🇪🇬', kind: 'year', query: q(EGP('wdt:P106 wd:Q82955; wdt:P569 ?ans.')), ask: (n) => `في أي عام وُلد السياسي المصري ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-politician-death', category: 'شخصيات مصرية', emoji: '🇪🇬', kind: 'year', query: q(EGP('wdt:P106 wd:Q82955; wdt:P570 ?ans.')), ask: (n) => `في أي عام توفي السياسي المصري ${n}؟`, explain: (n, a) => `توفي ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-monarch-birth', category: 'شخصيات مصرية', emoji: '👑', kind: 'year', query: q(EGP('wdt:P106 wd:Q116; wdt:P569 ?ans.')), ask: (n) => `في أي عام وُلد ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-monarch-death', category: 'شخصيات مصرية', emoji: '👑', kind: 'year', query: q(EGP('wdt:P106 wd:Q116; wdt:P570 ?ans.')), ask: (n) => `في أي عام توفي ${n}؟`, explain: (n, a) => `توفي ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-military-birth', category: 'شخصيات مصرية', emoji: '🎖️', kind: 'year', query: q(EGP('wdt:P106 wd:Q47064; wdt:P569 ?ans.')), ask: (n) => `في أي عام وُلد العسكري المصري ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { ...EG, id: 'h-eg-military-death', category: 'شخصيات مصرية', emoji: '🎖️', kind: 'year', query: q(EGP('wdt:P106 wd:Q47064; wdt:P570 ?ans.')), ask: (n) => `في أي عام توفي العسكري المصري ${n}؟`, explain: (n, a) => `توفي ${n} عام ${a}.` },
);
void strip;

// ---- cinema: the very new (2016 on) and the very old (to 1955), with a lower fame floor than the rest
const NEWY = (v, f) => `${FILM} ${v} FILTER(YEAR(?${f}) >= 2016)`;
const OLDY = (v, f) => `${FILM} ${v} FILTER(YEAR(?${f}) <= 1955)`;
const ERA = { section: 'cinema', era: true, bands: [[10, 9999], [5, 10], [3, 5], [2, 3], [1, 2]], minSl: 1 };
for (const [tag, W, label] of [['new', NEWY, 'حديث'], ['old', OLDY, 'قديم']]) {
  RECIPES.push(
    { ...ERA, id: `c-${tag}-film-director`, category: `أفلام مصرية (${label})`, emoji: '🎬', kind: 'entity', query: q(W('wdt:P57 ?ans; wdt:P577 ?pub.', 'pub')), ask: (n) => `من أخرج الفيلم المصري «${n}»؟`, explain: (n, a) => `أخرج فيلم «${n}» ${a}.` },
    { ...ERA, id: `c-${tag}-film-year`, category: `أفلام مصرية (${label})`, emoji: '🎬', kind: 'year', query: q(W('wdt:P577 ?ans.', 'ans')), ask: (n) => `في أي عام صدر الفيلم المصري «${n}»؟`, explain: (n, a) => `صدر فيلم «${n}» عام ${a}.` },
    { ...ERA, id: `c-${tag}-film-cast`, category: `أفلام مصرية (${label})`, emoji: '🎭', kind: 'member', query: q(W('wdt:P161 ?ans; wdt:P577 ?pub.', 'pub')), ask: (n) => `من الممثلين الذين شاركوا في بطولة الفيلم المصري «${n}»؟`, explain: (n, a) => `${a} من فريق تمثيل فيلم «${n}».` },
  );
}
RECIPES.push(
  { ...ERA, id: 'c-new-actor-birth', category: 'نجوم مصريون', emoji: '⭐', kind: 'year', query: q(`?item wdt:P106 wd:Q33999; wdt:P27 wd:Q79; wdt:P569 ?ans. FILTER(YEAR(?ans) >= 1990)`), ask: (n) => `في أي عام وُلد الفنان ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { ...ERA, id: 'c-old-actor-birth', category: 'نجوم مصريون', emoji: '⭐', kind: 'year', query: q(`?item wdt:P106 wd:Q33999; wdt:P27 wd:Q79; wdt:P569 ?ans. FILTER(YEAR(?ans) <= 1930)`), ask: (n) => `في أي عام وُلد الفنان ${n}؟`, explain: (n, a) => `وُلد ${n} عام ${a}.` },
  { ...ERA, id: 'c-new-series-year', category: 'مسلسلات مصرية', emoji: '📺', kind: 'year', query: q(`?item wdt:P31 wd:Q5398426; (wdt:P495|wdt:P17) wd:Q79; wdt:P580 ?ans. FILTER(YEAR(?ans) >= 2010)`), ask: (n) => `في أي عام بدأ عرض المسلسل المصري «${n}»؟`, explain: (n, a) => `بدأ عرض مسلسل «${n}» عام ${a}.` },
  { ...ERA, id: 'c-series-director2', category: 'مسلسلات مصرية', emoji: '📺', kind: 'entity', query: q(`?item wdt:P31 wd:Q5398426; (wdt:P495|wdt:P17) wd:Q79; wdt:P57 ?ans.`), ask: (n) => `من أخرج المسلسل المصري «${n}»؟`, explain: (n, a) => `أخرج مسلسل «${n}» ${a}.` },
);
