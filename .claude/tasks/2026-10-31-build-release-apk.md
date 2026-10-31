# Release APK (production) with the latest changes
## المطلوب (حرفياً)
"طلع apk بالجديد على البروداكشن"
## قرارات
- API: https://card.deilar.com/api/v1 (.env.production). versionCode 6 / 2.2.0 كما هو في build.gradle (آخر release على الجهاز كان 5).
- التوقيع من ~/.gradle/gradle.properties (DEILAR_UPLOAD_*).
## الأوامر
npm run android:sync && cd android && ./gradlew assembleRelease
الناتج: android/app/build/outputs/apk/release/app-release.apk ثم نسخة في ~/Downloads (و/mnt/c/Users/tifaa/Downloads لو موجود)
## PROGRESS
- [x] build + sync + assembleRelease
- [x] تأكيد التوقيع + versionCode من الناتج
- [x] نسخ لـ Downloads
