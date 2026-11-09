# Release build + رفع على Google Play
## المطلوب (حرفياً)
"اعملى build ارفعه على متجر جوجل"
## القرارات
- مفيش service account / fastlane / API رفع على الجهاز → الرفع نفسه يدوي من Play Console (المستخدم). أنا أبني AAB موقّع.
- versionCode 8→9 / 2.2.3 (8 اتبنى النهارده ومش معروف اترفع ولا لأ؛ Play يرفض المكرر)
## الأوامر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew bundleRelease
الناتج: android/app/build/outputs/bundle/release/app-release.aab → Downloads/deilar-2.2.3-9.aab
## PROGRESS
- [x] bump 9 / 2.2.3
- [x] sync + bundleRelease (نجح)
- [x] تأكيد التوقيع + نسخ Downloads/deilar-2.2.3-9.aab
- [ ] الرفع على Play Console (على المستخدم)
