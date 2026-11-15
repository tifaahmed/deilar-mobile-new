# iOS push (Firebase) — اللي يتعمل على الـ Mac

## الخطوات على الـ Mac (بالترتيب)
1. `git pull` ثم `npm install`
2. `npm run build` ثم `npx cap sync ios`
3. `cd ios/App && pod install` (لو CocoaPods مش متسطب: `sudo gem install cocoapods`)
   - لو طلع خطأ Podfile/Capacitor: `pod repo update` ثم `pod install` تاني
4. افتح **`ios/App/App.xcworkspace`** (مش .xcodeproj)
5. Xcode ← target **App** ← **Signing & Capabilities**:
   - Team: اختار حساب الـ Apple Developer
   - Bundle Identifier لازم = `com.card.dealer` (نفس plist بتاع Firebase)
   - `+ Capability` ← **Push Notifications**
   - `+ Capability` ← **Background Modes** ← علّم **Remote notifications**
6. اتأكد إن `GoogleService-Info.plist` ظاهر تحت مجلد App في Xcode، وفي Build Phases ← Copy Bundle Resources
7. Firebase Console ← Project settings ← **Cloud Messaging** ← Apple app configuration ← ارفع **APNs Authentication Key (.p8)** + Key ID + Team ID (من developer.apple.com ← Keys ← مفتاح بـ Apple Push Notifications service)
8. شغّل على **iPhone حقيقي** (الـ Simulator مش بيستلم FCM) ← وافق على إذن الإشعارات
9. اتأكد إن الـ token اتسجّل: backend يبقى فيه device token للعضو؛ وجرّب إرسال من Firebase Console ← Messaging ← Send test message

## لو حصل خطأ
- `No such module 'FirebaseCore'` ← pod install ما اتعملش أو فتحت .xcodeproj بدل .xcworkspace
- الـ token مش بيوصل ← Bundle ID مش مطابق، أو مفتاح APNs ناقص، أو Push capability ناقصة
- ابعت نص الخطأ لـ Claude

## على الـ backend (مش iOS بس)
- `FCM_PROJECT_ID=deilar` في .env + service-account JSON في `storage/app/private/fcm-service-account.json`

