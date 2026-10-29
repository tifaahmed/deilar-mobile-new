# المهمة: متظهرش بوب أب "الأقرب" لو الموقع المحفوظ هو نفسه الحالي أو قريب جداً
## المطلوب (حرفياً)
http://localhost:3000/card#nearest-popup  لو انا معايا بالفعل الموقع الجغرافى بتاعه والموقع الجديد هوا هوا الى معايا او قريب جدا  ساعتها مش لازم اظهر ال بوب اب ده
## PROGRESS
- [x] المنطق: App.tsx stage + NearestPrompt (LocationGate.tsx)
- [x] stage جديد "locating" بدون رسم؛ لو الـ fix الجديد ≤500م من المحفوظ أو مفيش fix جديد → done من غير بوب أب (مع سؤال المنطقة لو مش محفوظة)؛ غير كده → nearest. gps.ts isSameSpot + src/test/gpsSameSpot.test.ts. tsc + 22 اختبار عدّوا. ⏳ مراجعة بالمتصفح
