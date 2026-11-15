# محاولة واحدة لكل قسم
## المطلوب (حرفياً)
"انا عايز ان فى الالعاب يكون معايا 5 محاولات بس 1 محاوله لكل قسم"
## القرارات
- 5 أقسام × محاولة واحدة في اليوم لكل قسم (نفس نظام اليوم/منتصف الليل الحالي). PLAYS_PER_DAY 5 → 1.
- الباك إند أولاً: ../ibusiness_medical config/loyalty.php plays_per_day (env LOYALTY_QUIZ_PLAYS_PER_DAY) ثم الأب + النصوص + CLAUDE.md.
## PROGRESS
- [x] backend config (default 1) + QuizLoyaltyTest
- [x] app quizLimit.ts + نصوص QuizGame + test (6 passed)
- [x] CLAUDE.md x3 (التحديث على ملفات الباك إند والموقع والتطبيق)
