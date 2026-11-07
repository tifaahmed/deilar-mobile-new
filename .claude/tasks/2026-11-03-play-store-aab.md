# Play Store build (AAB)
## المطلوب (حرفياً)
"generate build to upload to google store"
## قرارات
- Play يحتاج AAB موقّع: ./gradlew bundleRelease. التوقيع من android/signing/keystore.properties أو DEILAR_UPLOAD_* في ~/.gradle/gradle.properties.
- API: .env.production (card.deilar.com). versionCode 6 / 2.2.0 من build.gradle.
## الأوامر
export ANDROID_HOME=/home/tifaa/Android; npm run android:sync && cd android && ./gradlew bundleRelease
الناتج: android/app/build/outputs/bundle/release/app-release.aab
## PROGRESS
- [x] فحص التوقيع
- [x] sync + bundleRelease (نجح)
- [x] تأكيد التوقيع + نسخ: /mnt/c/Users/tifaa/Downloads/deilar-2.2.0-6.aab
- [x] versionCode 7 / 2.2.1 اتبنى ونُسخ: Downloads/deilar-2.2.1-7.aab (الملف القديم 2.2.0-6 اتمسح)
