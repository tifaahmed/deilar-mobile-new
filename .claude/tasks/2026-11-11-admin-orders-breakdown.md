# تفصيل الطلبات في الأدمن
## المطلوب (حرفياً)
"افتكر توضح كويس فى الطلبات فى الادمن كم فلوس حقيقي وكم محفظه وكم فزيكال والموضع تبيكال من موقع ديلر ~/projects/deilar/deilar"
## ملاحظات / أسئلة مفتوحة
- مش واضح 100%: "فزيكال" = كارت فيزيكال (kind) أو نقاط؟ و"تبيكال" = تطبيق؟ → افتراضي: أعمدة (فلوس حقيقية amount_due / محفظة wallet_amount / نقاط points_amount) + نوع الطلب (منتجات/كارت فيزيكال) + المصدر (تطبيق/موقع ديلر). أأكد مع المستخدم في الرد.
## PROGRESS
- [x] ibusiness_medical: AdminOrderListResource + AdminOrderShowResource (real_paid, wallet, points, channel) + OrderListTable.vue + OrderShowView.vue + lang en/ar + OrderPaymentBreakdownTest (2 passed)
- [ ] لسه: build الـ Vue للأدمن (npm run build في الباك إند) + تأكيد المستخدم على معنى «فزيكال/تبيكال»
