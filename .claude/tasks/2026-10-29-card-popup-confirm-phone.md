# المهمة: في بوب أب رقم الكارت اعرض آخر 4 أرقام من التليفون قبل إرسال الكود
## المطلوب (حرفياً)
http://localhost:3000/map#card-number-popup  هنا   قبل ارسال كود التحقق وريني اخر 4 ارقام عشان اتاكد قبل ما ارسل — بحيث اتاكد من اخر4 ارقام الخاصين بالتليفون
## القيود
- الباك إند يملك القواعد: أي endpoint جديد/تعديل يتم في ibusiness_medical أولاً + تحديث بند 14 في CLAUDE.md (التلاتة).
- رقم الكارت لوحده لا يفتح شيء؛ لا SMS قبل تأكيد العضو.
## PROGRESS
- [x] قراءة AccessModal + CardLoginController
- [x] باك إند: POST /mobile/auth/card/phone-hint + اختبار في CardNumberLoginTest (⏳ لم يتشغل: php artisan test بيعلّق، قاعدة membership_test غالباً مش شغالة)
- [x] التطبيق: AccessModal يعرض آخر 4 أرقام (cardHint) قبل زر الإرسال
- [x] tsc + guestTrialFlow عدّوا. ⏳ بند 14 في CLAUDE.md اتحدّث هنا بس (لسه الموقع والباك إند) + مراجعة بالمتصفح
