# Wrong-answer penalty controlled from the admin panel

## المطلوب (حرفياً)
"عايز تحكم من لوحه التحكم الخساره فى السؤال تساوي سالب كام نقطه وخلى القيمه حاليا ان السؤال الغلط ب 0"

## القرارات
- Rules/numbers live in ../ibusiness_medical (backend): `config/loyalty.php` points_wrong, `App\Support\LoyaltyPoints::forAnswer`, admin settings page /admin/setting (like `loyalty_points_per_egp`).
- The app only mirrors it to show offline (`QUIZ_WRONG_POINTS`, `quizPoints()` in src/utils/quizStore.ts) - best: backend returns the value in GET /loyalty and the app uses it.
- Default now: wrong answer = 0 points.

## PROGRESS
- [ ] explore backend (setting, LoyaltyPoints, endpoints that return loyalty config)
- [ ] backend: admin setting `loyalty_points_wrong` (default 0), used by forAnswer, test
- [ ] backend: return it in GET /loyalty (+ mobile/loyalty?) 
- [ ] app: use the returned value (fallback 0), update CLAUDE.md contract text in all 3 projects
- [ ] tests + report

## طلبات إضافية (حرفياً)
- "انا عايز اللعبه تتلعب والنت مقفول عادي فا خزن الى محتاجه عشان اللعبه تتشتغل" -> cache what the game needs (penalty from backend, tiers, badges catalog...) so it plays fully offline
- "كمل الاسئله الى بالانجليزي لحد ال1000" -> continue English questions to ~1000 per section (see 2026-11-01-english-hardcoded-arabic.md, scripts/build_en_quiz.py)
## PROGRESS (2)
- [x] backend: LoyaltyPoints::pointsWrong() + setting loyalty_points_wrong default 0 + migration 2026_11_01_100000 + controllers + tests (QuizLoyaltyTest 24 passed on membership_test DB). NOT deployed: run `php artisan migrate` on the live server to create the setting row.
- [x] app: rules (points_wrong + speed_tiers) cached in localStorage `deilar_quiz_rules`, quizPoints uses them offline; test in quizStore.test.ts
- [x] contract text updated in deilar-mobile-new/CLAUDE.md, deilar/CLAUDE.md, deilar/AGENTS.md, ibusiness_medical/AGENTS.md
- [ ] admin page /admin/loyalty only SHOWS the penalty; it is edited in /admin/setting (loyalty_points_wrong)
- [~] English questions: ~230-240 per section so far (fawazeer 97); continue with scripts/build_en_quiz.py dump/add_batch
