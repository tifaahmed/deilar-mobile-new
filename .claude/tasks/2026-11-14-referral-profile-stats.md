# Referral screen (profile → invite friends): drop "pending earnings", show signed up / paid as 10/2

## المطلوب (حرفياً)
"فى البروفايل انا عايز اشيل ال ارباح المعلقه. وبالنسبه للارقام انا عايز الى سجلو/الى دفعو 10/2. فى جزئيه الى بيدعو الاصدقاء"

## القرارات
- App only (src/components/ReferralScreen.tsx). The website has the same block (marketing.php stat_pending) — not touched, asked.
- One tile "سجّلوا / دفعوا" = registered/subscribed, LTR. Trials tile stays.

## PROGRESS
- [x] remove pending tile + pending sentence
- [x] merge registered + subscribed
- [x] update tests, tsc, vitest
