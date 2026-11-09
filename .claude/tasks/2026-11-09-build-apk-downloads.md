# Build + APK → Downloads
## المطلوب (حرفياً)
"generate new build and apk and copy to the download"
## القرارات
- مفيش ذكر لـ release → debug APK (زي الطلبات السابقة "generate apk").
## الأوامر
npm run android:sync && cd android && ANDROID_HOME=/home/tifaa/Android ./gradlew assembleDebug
الناتج: android/app/build/outputs/apk/debug/app-debug.apk ثم نسخ لـ ~/Downloads و /mnt/c/Users/tifaa/Downloads
## PROGRESS
- [x] android:sync
- [x] assembleDebug (نجح)
- [x] نسخ باسم بتاريخ (من غير ما نكتب فوق app-debug.apk القديم): deilar-debug-20261109-1036.apk
