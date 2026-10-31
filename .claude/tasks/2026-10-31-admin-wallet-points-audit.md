# المهمة: لوحة التحكم تعرض نقاط وفلوس المحفظة لكل عضو + أي تعديل يتسجل مين عمله
## المطلوب (حرفياً)
"انا عايز انى اقدر اشوف من لوحه التحكم النقاط والفلوس فى المحفظه لكل واحد وار تعديل عليها يكون في تسجيل مين عمل ايه"
## القرارات
- الأرقام والقواعد في ibusiness_medical (الباك إند)؛ دفاتر loyalty_transactions و wallet_transactions append-only، لا تعديل ولا حذف.
- أي تعديل يدوي = صف جديد فيه note + id الأدمن (من عمل ايه ومتى).
## PROGRESS
- [x] (سابق) فاتورة الطلب بتوضح المحفظة/المتبقي/إجمالي المدفوع + invoiceWallet.test.ts (195 اختبار عدّوا)
- [x] فحص: كان فيه منح نقاط بالأدمن بس، ومفيش تعديل محفظة ولا سجل لكل عضو
- [x] عرض النقاط ورصيد المحفظة لكل عضو (قائمة + صفحة العضو مع سجل الحركات)
- [x] تعديل رصيد المحفظة يدوياً (إضافة/خصم) بسبب إلزامي + تسجيل الأدمن
- [x] سجل مراجعة: مين / عمل ايه / قبل-بعد / إمتى
- [x] اختبارات باك إند

## تنفيذ
- ibusiness_medical: QuizLoyaltyController (adjustWallet, ledger, قائمة الأعضاء بدون بحث)، routes admin.loyalty.wallet.adjust / members.ledger، WalletTransaction::creator، Pages/Admin/Loyalty/Index.vue (نموذج المحفظة + سجل العضو + آخر تعديلات المحفظة)، السبب إلزامي للنقاط والمحفظة، AGENTS.md
- اختبارات: AdminWalletLedgerTest (5) + AdminQuizLoyaltyTest (7) = 12 عدّوا؛ vite build سليم
- [ ] ⏳ المستخدم: يفتح /admin/loyalty ويجرب بالعين؛ لا commit؛ migrate لسه
