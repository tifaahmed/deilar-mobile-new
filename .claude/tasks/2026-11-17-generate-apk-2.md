# Generate APK (تاني) 2026-11-17
## المطلوب (حرفياً)
"طلع apk تانى لصفحه ال download"
## القرارات
- debug APK باسم بتاريخ ووقت جديد، من غير ما أكتب فوق القديم. الوجهة: /mnt/c/Users/tifaa/Downloads
## الأوامر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew assembleDebug
## PROGRESS
- [x] build نجح، اتنسخ لـ deilar-debug-20261117-1512.apk
