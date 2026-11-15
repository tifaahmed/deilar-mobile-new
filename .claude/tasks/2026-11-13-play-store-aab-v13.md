# Play Store build 13 / 2.2.7
## المطلوب (حرفياً)
"generate build to upload to gooogle store"
## القرارات
- 12/2.2.6 اتبنى 11-09 والكود اتغير بعده (badges، one-play، relative fee...) → 13 / 2.2.7. الرفع يدوي من Play Console.
## الأمر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew bundleRelease
## PROGRESS
- [x] رفع versionCode 13 / versionName 2.2.7
- [x] build + sign
- [x] نسخ لـ C:\Users\tifaa\Downloads\deilar-2.2.7-13.aab (دايماً هنا، مش ~/Downloads)
- [ ] الرفع على Play Console (على المستخدم)
