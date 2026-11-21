# Download notification (2026-11-21)
المطلوب (حرفياً): "i want when i dounload and file soo notification in the mobile that i dounloaded file and when click it open in the device"

## القرارات
- كل التحميلات بتعدي على `GallerySaverPlugin.java` (saveImage.ts) → الإشعار يتعمل هناك native، من غير مكتبة جديدة.
- الضغط على الإشعار يفتح الصورة بـ ACTION_VIEW. نص الإشعار بالمصري.

## PROGRESS
- [x] GallerySaverPlugin: قناة إشعارات + إشعار + PendingIntent
- [x] AndroidManifest: POST_NOTIFICATIONS + طلب الإذن (Android 13+)
- [x] gradle compileDebugJavaWithJavac نجح. لسه: تجربة على جهاز + `npx cap sync android` + build APK
