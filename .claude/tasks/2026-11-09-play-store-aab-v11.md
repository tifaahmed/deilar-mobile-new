# Play Store build 11 / 2.2.5
## المطلوب (حرفياً)
"تمام انا حطيت البينات فى كل حت سليم جرب ولو الدنيا سليمه اعمل build الان لجوجل ستور"
## القرارات
- 10/2.2.4 كان متبني قبل كده (مش معروف اترفع ولا لأ) → 11 / 2.2.5. الرفع يدوي من Play Console.
- تغييري النهارده في الأدمن (ibusiness_medical) بس؛ التطبيق ماتغيرش. مفيش بيانات referral في الداتابيس المحلية فماقدرتش أجرب العرض.
## الأمر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew bundleRelease
## PROGRESS
- [x] bump + sync + bundleRelease نجح، نسخة في ~/Downloads/deilar-2.2.5-11.aab
- [ ] الرفع على Play Console (على المستخدم)
