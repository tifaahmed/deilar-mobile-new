# المهمة: قانون عام — أي خانة كتابة تتسحب لفوق عشان لوحة المفاتيح متغطيهاش
## المطلوب (حرفياً)
http://localhost:3000  اى مكان فى المشروع وخليها قانون لو هكتب فى اى خانه اسحب الفورمه او الخانه لفوق عشان لوحه المفاتيح متغطيش الخانه
## القرارات
- قاعدة واحدة عامة (مش في كل فورم): listener على focusin + تغيّر visualViewport، يعمل scrollIntoView للخانة المركّز عليها بحيث تبان فوق الكيبورد (يشتغل جوه الـ modals/overlays اللي بتتسكرول).
- تتكتب كقاعدة في CLAUDE.md.
## PROGRESS
- [x] main.tsx: مفيش Keyboard plugin في Capacitor → حل ويب (focusin + visualViewport)
- [x] src/utils/keyboardGuard.ts + installKeyboardGuard() في main.tsx + src/test/keyboardGuard.test.ts (3 عدّوا) + tsc نضيف
- [x] قسم "UI rules" في CLAUDE.md. ⏳ تجربة على موبايل حقيقي (Android/iOS) — الاختبار في jsdom بس
