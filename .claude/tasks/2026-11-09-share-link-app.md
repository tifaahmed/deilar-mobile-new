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
- [x] SHARE_URL + ProfileView + ProductPage (tsc نضيف؛ اختبارات: فشل timeouts قديم مش من التعديل)
- [x] DEILAR_ANDROID_SHA256 (بصمة upload key) في ../deilar/.env و .env.example
- [x] AndroidManifest: intent-filter لـ /app كمان (يحتاج بناء AAB جديد)
- [ ] المستخدم: يحط DEILAR_ANDROID_SHA256 على السيرفر + بصمة Play App Signing من Play Console، وبعدين بناء/رفع نسخة جديدة
- [x] المستخدم حط البصمة على السيرفر + تأكد من assetlinks.json (deilar.com و www بدون redirect)
- [x] بصمة Play App Signing (5C:F8:...:F3:23) اتضافت جنب upload في .env المحلي (deilar + ibusiness_medical)
- [x] AAB اتبنى ومتوقّع بمفتاح الرفع: ~/Downloads/deilar-2.2.4-10.aab (versionCode 10 / 2.2.4)
- [ ] رفعه على Play Console (على المستخدم)
أوامر: export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew bundleRelease
