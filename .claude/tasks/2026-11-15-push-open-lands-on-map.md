# فتح التطبيق من الإشعار بيوديني لشاشة الموقع/الخريطة
## المطلوب (حرفياً)
"لما بدخل على التطبيق من الاشعار بيخلينى ادوس على موضوع الموقع الجغرافى ويوديني للخريطه مش بعرف اشوف المكان الى انا عايزه من فتح الاشعار"
## PROGRESS
- [~] فحص: push.ts open() + AreaModal/اختيار الموقع عند أول فتح
## القرار / الإصلاح
- السبب: شاشات بداية التطبيق (LocationGate / NearestPrompt / AreaModal) كانت بتغطي الصفحة، وزر "أقرب مكان" بيعمل navigate('/map') فوق صفحة الإشعار.
- push.ts بيطلق حدث PUSH_OPEN_EVENT قبل navigate؛ App.tsx بيسمعه: stage=done، يقفل الـ area/access، ويمنع handleFindNearest وskipPrompt من تغيير الصفحة (deepLinked ref).
## PROGRESS
- [x] الكود + tsc نظيف
- [x] vitest: كله نجح ما عدا guestTrialFlow و quizPick في التشغيل الكامل (timeout تحت الحمل) ونجحوا لوحدهم
- [ ] لازم APK جديد وتجربة فعلية على موبايل (الإشعار والتطبيق مقفول، وبعدين والتطبيق في الخلفية)
## طلب جديد: "طلع شحن تانى وحطه فى الdwonloads" (فهمتها APK تاني) — [x] بناء debug ونسخ (deilar-debug-20261115-1848.apk) → /mnt/c/Users/tifaa/Downloads باسم بتاريخ
