# Card login without phone → must add own phone + OTP, saved forever
## المطلوب (حرفياً)
"صحيح انا عايز لو عميل سجل دخول ب بيانات كرت وهوا من غير رقم تليفون لازم تخليه يضيف رقم تليفون خاص بيه ويجيله otp ويكون صح ساعتها هيتسجله التليفون ده كا رقم عضويته وللابد الراجل مسجل على حسابه"
## قرارات
- العقد (CLAUDE.md بند 14) فيه الفلو ده جزئياً؛ نشوف اللي متنفذ فعلاً ونكمل الناقص.
## PROGRESS
- [x] فحص: الفلو متنفذ بالكامل (تطبيق: AccessModal step addphone + AddPhoneReminder؛ باك: Mobile/CardLoginController requestPhone/verifyPhone)
- [x] مفيش كود محتاج تعديل؛ بانتظار تأكيد المستخدم لو عايز تغيير تاني
