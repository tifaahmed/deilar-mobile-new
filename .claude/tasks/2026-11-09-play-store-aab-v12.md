# Play Store build 12 / 2.2.6
## المطلوب (حرفياً)
"طلعلى واحد جديد ارفعه على جوجل ستور"
## القرارات
- 11/2.2.5 اتبنى قبل كده → 12 / 2.2.6 (فيه خانة إدخال الرفيرال في البروفايل). الرفع يدوي من Play Console.
## الأمر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew bundleRelease
## PROGRESS
- [x] بُني ووُقّع ونُسخ لـ C:\Users\tifaa\Downloads\deilar-2.2.6-12.aab
- [ ] الرفع على Play Console (على المستخدم)

## طلب إضافي
"generate apk" — APK release لنفس الإصدار 12 / 2.2.6: ./gradlew assembleRelease
