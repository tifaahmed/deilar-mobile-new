# كارت منتهي = مفيش استخدام نقاط ولاء في شراء المنتجات (2026-11-21)
المطلوب (حرفياً): "لو صاحب العضويه الكارت بتاعه انتهى مييقدرش يستخدم نقاط اولاء فى شراء المنتجات"
## PROGRESS
- [x] باك: PointsPayments::blockedReason (expired/trial_expired) + رفض 422 `points_card_expired` في Partner/OrderController + `points_blocked` في GET /loyalty + اختبار PointsCapsTest (8 نجحوا)
- [x] التطبيق: CartCheckoutModal يخفي زرار النقاط ويقول السبب + test
- [ ] الموقع (deilar) نفس القاعدة لسه
