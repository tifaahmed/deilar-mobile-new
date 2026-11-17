# Generate APK (آخر تعديلات 2026-11-17)
## المطلوب (حرفياً)
"بعد ما تخلص اعمل apk وابعته للdowmloads"
## القرارات
- debug APK باسم بتاريخ ووقت، من غير ما أكتب فوق أي ملف قديم. الوجهة: /mnt/c/Users/tifaa/Downloads
## الأوامر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew assembleDebug
## PROGRESS
- [x] build نجح (1m22s)، اتنسخ لـ deilar-debug-20261117-1436.apk في Downloads
