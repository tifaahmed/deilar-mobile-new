# إدخال كود الإحالة من البروفايل (مرة واحدة)
## المطلوب (حرفياً)
in the personal profile, a member who has NOT entered a referral code can enter one — ONCE for ever. Before it is applied they see a confirmation showing the card number and the member behind it (name); on confirm it is applied. After it is accepted they see the discount they will get, and the subscription plans/links show the discounted price (the backend already returns status.plans[].discounted_price / referral_discount; just draw it). Not possible after they already subscribed. No expiry. Only INDIVIDUAL members (not companies). The member gets nothing; the referrer gets the wallet bonus (backend does it).
Backend: GET /referral brought_by; POST /referral/preview {number}; POST /referral/claim {number, source:'card'}; 422 reasons disabled|not_found|self|mutual|already_referred|company|already_paid.
## القرارات
- التطبيق بيرسم بس. مكون جديد ReferralCodeEntry يتحط في شاشة "ادعُ أصدقاءك" (ReferralScreen) وفي قسم البيانات الشخصية.
- إضافات فقط، مفيش حذف.
## PROGRESS
- [x] قراءة CLAUDE.md + ReferralScreen/ProfileView/PlanPicker (PlanPicker بيرسم discounted_price already)
- [x] api previewReferral + ReferralCodeEntry (ReferralScreen + قسم البيانات الشخصية)
- [x] src/test/referralEntry.test.tsx (4 نجحوا)
- [x] vitest (13 نجحوا) + tsc نضيف
