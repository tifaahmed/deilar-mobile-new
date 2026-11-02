# Mobile cart/checkout: loyalty-points discount + wallet for every product

## المطلوب (حرفياً)
"على تطبيق الموبايل انا عايز ان فى العربه لو المنتجات تقبل خصم نقاط ولاء تظهر الخصم فى العربه والدفع كمان  واما للمحفظه خليها انها مسموح ليها تشتغل طول الوقت لكل المنتجات وده يظهر فى العربه وصفحه الدفع"

## PROGRESS
- [~] استكشاف: wallet_payable على المنتج، WalletPayments، أوردر API، شاشات العربة/الدفع في ../deilar-mobile-new
## التصميم (القرارات)
- المحفظة: تشتغل لكل منتجات الطلب (ما عدش wallet_payable)؛ التوصيل ورسوم COD دايماً فلوس حقيقية. العربة/الدفع بيعرضوها.
- نقاط الولاء: علم جديد على المنتج `points_payable` (افتراضي off، من فورم المنتج بدل wallet_payable). الخصم = جنيهات كاملة بسعر loyalty_points_per_egp، بيتاخد تلقائي لمشتري داخل بالتوكن (مع `use_points` اختياري default true)، من سطور المنتجات المعلّمة بس، قبل المحفظة. الطلب بيحفظ points_used (نقاط) + points_amount (ج.م)؛ amountDue = total - wallet - points_amount.
- الإلغاء/الفشل بعد البيع: النقاط ترجع كنقاط (صف موجب) مرة واحدة بنفس حارس wallet_refunded_at؛ المحفظة/الفلوس الحقيقية ترجع للمحفظة زي ما هو.
- migration add-only: products.points_payable، orders.points_used، orders.points_amount.
## PROGRESS
- [x] backend: migration + Product + Order + PointsPayments + OrderController + request + resources + admin form + mobile product payload
- [x] backend tests (membership_test): PointsPaymentTest + WalletPaymentsTest + PhysicalCard + Paymob = 42 passed
- [x] app (258 vitest, tsc نضيف): types/adapters/cart/checkout/order result/OrdersPage + api/orders (use_points)
- [x] AGENTS.md backend+website (البند 13؛ مفيش بند 13 في AGENTS.md التطبيق) + سجل المهمة في deilar-mobile-new/.claude/tasks

- ملاحظات: الموقع default لـ use_points=false (لحد ما يرسم الخصم)؛ المحفظة بقت لكل المنتجات للموقع كمان؛ علم wallet_payable لسه في الجدول بس مش مقروء؛ migration 2026_11_02_130000_add_points_payments لازم تتشغل (mysqldump الأول)؛ لم يُختبر في متصفح/جهاز
