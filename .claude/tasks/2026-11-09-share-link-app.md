# رابط المشاركة = https://deilar.com/app
## المطلوب (حرفياً)
"انا عايز الرابط الى العميل بيشاركه مع الناس يكون فيه الرابط ده https://deilar.com/app بدل https://deilar.com عشان لو فاتح من موبايل يفتح معاه التطبيق او موقع يفتح معاه على اللابتوب ده فى اى مشاركه"
## قرارات
- الموقع (../deilar) عنده route /app (ReferralLinkController::app) بيوجّه حسب الجهاز.
- ثابت واحد SHARE_URL في src/utils/shareResult.ts = https://deilar.com/app، ويُستخدم في: نتيجة اللعبة، مشاركة الكارت (ProfileView)، مشاركة المنتج (ProductPage).
- رابط الدعوة /r/<number> بييجي من الباكند — مش اتغيّر (بيوجّه للمتجر أصلاً).
## PROGRESS
- [~] تعديل الثابت والاستخدامات
- [ ] tsc + اختبارات
