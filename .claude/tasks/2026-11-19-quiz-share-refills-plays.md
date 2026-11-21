# Quiz: sharing the referral code refills the daily plays on all sections
## المطلوب (حرفياً)
لما اللعبه بلعبها انا ليا محاوله واحده يوميه انا عايز لو شاركت الرفيرال كود تتفع المحاولات تانى كلها على كل الاقسام ولو لعبت عادى جدا نقاط الولاء توصلنى عادى جدا
## القرارات
- backend owns it: a verified-by-tap "I shared my referral code" (POST /referral/shared) gives +1 play on EVERY section for today, at most `quiz_share_refills_per_day` times a day (admin setting, default 1; 0 = off) — a share cannot be verified, so the cap stops farming. Points for those extra plays are booked normally (daily cap on points allows plays_per_day + refills).
- app: adds today's bonus to each section's play cap; offline-safe.
## PROGRESS
- [~] backend
- [x] app: api/referral.ts markReferralShared, utils/referralShare.ts, quizLimit bonus (allowanceToday/applyShareState/useShareRefillsLeft), quizStore reads bonus from GET /loyalty + upload reply, ReferralScreen calls on share/WhatsApp/copy with notice, QuizGame LockedPanel share button. tsc clean; vitest quizLimit/quizStore/referral/referralShareRefill pass. Not verified on a device.
- [x] coordinator extra: ShareUnlockButton (components/ShareUnlock.tsx) in LockedPanel x2, result screen, sections-list banner (LockedSectionsBanner), per used-up card (SectionUnlockRow); polite note when refills_left=0; "ارجع للعبة" after granted share. tsc clean; vitest shareUnlock/quizLimit/referralShareRefill/referral/quizStore = 34 pass. Not verified on a device.
- [x] app auto-refresh DONE: QuizRefillWatcher (open / foreground / 60 s, single in-flight refreshLoyalty), onRefillGranted event from applyShareState (not on first load of the day), notice «حد سجّل بكودك»; tsc clean, quizRefillWatcher + quiz/share/wallet tests pass.
