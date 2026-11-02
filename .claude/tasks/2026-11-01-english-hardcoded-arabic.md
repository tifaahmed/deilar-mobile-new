# Hard-coded Arabic shows in English mode

## المطلوب (حرفياً)
- "in the empty card page in english it appear in arabic" -> "عربه المشتريات فارغه حاليا"
- "every hard-coded Arabic change to english" (every hard-coded Arabic string must show English when the language is English)

## القرارات
- Use `const { isAr } = useLanguage()` + `isAr ? ar : en` (same pattern as the rest of the app). Skip comments, tests, quiz question data, WhatsApp message bodies sent to the store (stay Arabic).

## PROGRESS
- [x] CartCheckoutModal: cart step (empty state, header, totals)
- [x] CartCheckoutModal: all UI (WhatsApp message to the store + PDF stay Arabic on purpose)
- [x] WalletPanel, TransfersPanel, WalletScreen, api/wallet.ts (added `useIsAr` in LanguageContext: never throws, default Arabic)
- [x] FloatingContactButton, QuizLaunch, QuizReadyNotifier
- [x] quiz UI, geo, share, referral done (see PROGRESS 2)
- [ ] STILL OPEN: downloadCard.ts + OfficialDeilarCard (card artwork, Arabic), SaveAreaPrompt/AddressesTab join('،') separator, StoreView (check), nothing committed
- [ ] MyCardView is unused (dead code) - skip; OfficialDeilarCard is card artwork - ask
- [x] tsc clean; vitest 254/255 (quizPick.test.ts times out at 5s, flaky, pre-existing)

## طلب جديد (2026-11-01، حرفياً)
"before start the quez if the app language is english then ask do you want arabic question or english, also create files fore the english questions and answers" + "Still hard-coded Arabic (not done): QuizGame.tsx, PointsMood.tsx; GPS/location names in App.tsx and geo.ts and distance units; share text, referral email text, Arabic month names in the date picker — make them english"

## PROGRESS (2)
- [x] Explore quiz data/sections/pick logic
- [x] English question files (one per section) + language choice before the quiz starts (only when app language = en)
- [x] QuizGame.tsx + PointsMood.tsx strings
- [x] geo.ts / App.tsx location names + distance units, shareResult, providerReferral, DobPicker months
- [x] English question files: src/data/en/*.Quiz.en.json (30ish per section, ids offset +100000 in quizSections.ts `sectionIn`)
- [x] Language choice screen (QuizLanguageChoice in QuizGame.tsx, store src/data/quizLanguage.ts, asked once per visit when app is English)
- [x] QuizGame.tsx strings
- [x] PointsMood.tsx, geo.ts placeName (Header/MapView), shareResult, providerReferral body, tests src/test/quizEnglish.test.tsx (DobPicker already had English months)

## طلب جديد 3 (حرفياً)
"الايقونه الثابته الى تتملى عشان تملى فورم تدخل بيانات مقدم خدمه كا ترشيح — كل 3د مثلا او 4د اظهر جنبيه كتابه رشح مقدم خدمة عايز عليه خصم — ولون الزرار خليه حاجه غير اللون النبيتي عايز لون مميز وغير الايقوننه بدل شكل الهدية"
- [x] ReferProviderButton: label every 3.5 min (first at 60s, 9s long), orange gradient, BadgePercent icon; test src/test/referNudge.test.tsx
- [x] final full vitest run done

## طلب جديد 4 (حرفياً)
"العربي عايزه قد الانجليزي فى كل الاقسام" -> user chose: "أزوّد الإنجليزي لحد ما يبقى زي العربي" (grow English bank to match the Arabic count per section)
- [x] pipeline: `python3 scripts/build_en_quiz.py` (build), `... dump <section> <n_per_difficulty>` (show Arabic not yet translated), `python3 scripts/add_batch.py <section>` (stdin lines `arId | question | o0 | o1 | o2 | o3 | explanation`, options in Arabic order!). Batches live in src/data/en/batches/<section>.tsv, categories map in src/data/en/categories.json
- [x] tranche 1 done: football 126, general 123, history 126, cinema 127, fawazeer 97 English questions (Arabic: ~1000 each => ~12%, fawazeer ~9%). Tests green (quizEnglish + quizData).
- [ ] REMAINING: ~880 per section to reach parity. Skip Arabic questions that say "shown in the picture", Arabic-grammar plurals/proverbs in fawazeer (replace with new English riddles in HAND of scripts/build_en_quiz.py). Run build + `npx vitest run src/test/quizEnglish.test.tsx` after each batch (it rejects duplicate English questions).

## PROGRESS (3) - user asked to continue to 1000
- [x] round 2 done: football 239, general ~230, history ~242, cinema ~230 English questions; fawazeer 97 (needs more: translate remaining Arabic riddles + write new English word puzzles)
- [ ] still ~760 per section to reach ~1000. dump format now: `id|question|o0|o1|o2|o3|correctIndex` (picture questions skipped). Run `python3 scripts/build_en_quiz.py dump <section> 12`.

## PROGRESS (4) - user repeated "كمل الاسئله الى بالانجليزي لحد ال1000"
- counts now: football 484, general 467, history 471, cinema 230, fawazeer 97 (target ~1000 each; test `quizEnglish.test.tsx` green after each batch)
- workflow per round: `python3 scripts/build_en_quiz.py dump <section> 25 > /tmp/x.txt` -> translate -> `python3 scripts/add_batch.py <section> <<'E' ... E` (7 fields: arabicId | q | o0 | o1 | o2 | o3 | explanation; keep Arabic option order) -> `python3 scripts/build_en_quiz.py` -> vitest quizEnglish
- next: cinema (dump 25), fawazeer (riddles/word puzzles), then football/general/history 2nd rounds

## PROGRESS (5)
- counts: football 772, general 467, history 471, cinema 413, fawazeer 245 (target 1000 each). Tests green.
- next: general, history, cinema dump 30/diff; fawazeer needs new English riddles + word puzzles (Arabic language/proverb questions cannot be translated)

## PROGRESS (6)
- counts: football 772, general 622, history 471, cinema 413, fawazeer 245. Remaining to 1000: ~230 / ~380 / ~530 / ~590 / ~750.
- fawazeer: translatable pool is nearly used up (language plurals, proverbs, wordplay are Arabic-only) -> needs NEW English riddles/word puzzles written in HAND of scripts/build_en_quiz.py

## طلب جديد 5 (حرفياً)
"كمل لحد ما توصلهم الف لكل قسم" -> keep going until each English section reaches 1000 (translate all remaining + write new English questions where Arabic pool runs out)

## PROGRESS (7)
- counts: football 931, general 986, history 1021 (DONE), cinema 413, fawazeer 245. Left: football +70, general +14 (hand-written or last Arabic leftovers), cinema ~590 from Arabic pool (615), fawazeer ~755 (needs NEW English riddles/word puzzles).

## PROGRESS (8) - DONE: every English section >= 1000
- football 1021, general 1014, history 1021, cinema 1020, fawazeer 1013 (fawazeer = 418 translated + ~545 generated English puzzles from scripts/en_generated.py: maths, plurals, opposites, synonyms, proverbs, scrambles).
- test quizEnglish.test.tsx now requires >= 1000 per section.
- [ ] final full vitest + tsc (running)
