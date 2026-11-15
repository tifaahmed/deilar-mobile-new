# Generate APK (مع Firebase push)
## المطلوب (حرفياً)
"ابنى apk"
## القرارات
- debug APK، باسم بتاريخ، من غير ما أكتب فوق القديم. الوجهة: /mnt/c/Users/tifaa/Downloads (مش ~/Downloads)
## الأوامر
export ANDROID_HOME=/home/tifaa/Android JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64; npm run android:sync && cd android && ./gradlew assembleDebug
## PROGRESS
- [x] android:sync + assembleDebug
