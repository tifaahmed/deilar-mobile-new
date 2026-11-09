# Play Store build (AAB)
## المطلوب (حرفياً)
"generate new build to upload to google store"
## القرارات
- رفع versionCode 7→8 و versionName 2.2.1→2.2.2 (Play يرفض نفس versionCode)
- التوقيع: android/signing/keystore.properties أو DEILAR_UPLOAD_* في ~/.gradle/gradle.properties
- الأمر: npm run android:sync && cd android && ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64 ./gradlew bundleRelease
## PROGRESS
- [x] bump version
- [x] android:sync
- [x] bundleRelease
- [x] تأكيد الـ AAB موقّع
- AAB: android/app/build/outputs/bundle/release/app-release.aab
