# المهمة: "تعذر التحقق من الرقم" في بوب أب رقم الكارت (كارت 99999)
## المطلوب (حرفياً)
http://localhost:3000/map#card-number-popup  انا جالى تعذر التحقق من الرقم، حاول مرة أخرى — وانا رقم الكارت 99999
## PROGRESS
- [x] السبب: GET /mobile/card/99999 يرجّع 500 — عمود memberships.relationship مش موجود في قاعدة ibusiness_medical المحلية؛ 3 migrations pending (2026_10_29_100000 / 140000 / 150000)
- [x] php artisan migrate اتشغل بموافقة المستخدم (3 migrations DONE)؛ /mobile/card/99999 بقى 200. ⏳ تأكيد المستخدم من المتصفح
