# المهمة: الأدمن ينقل فلوس/نقاط بين الأعضاء + يحوّل نقاط عضو لمحفظته
## المطلوب (حرفياً)
"اعمل رقم a والباقى انا هعمله بعدين" — يقصد الاقتراح (1): للأدمن "نقل فلوس أو نقاط من عضو لعضو" و"تحويل نقاط عضو لمحفظته"، كل واحد عملية واحدة (atomic) بتتسجل باسم الأدمن وبسبب إلزامي.
## القرارات
- الباك إند يملك القواعد. صفوف دفتر جديدة فقط (append-only)، created_by = الأدمن، note إلزامي.
- النقل: المرسل لازم يكفيه الرصيد (محفظة ≥ المبلغ؛ نقاط ≥ المبلغ)، العضوين يتقفلوا بترتيب id، خصم + إضافة في transaction واحدة.
- تحويل نقاط عضو لمحفظته من الأدمن: بنفس سعر النقطة (loyalty_points_per_egp)، بيتجاوز مفتاح التفعيل والحد الأدنى (قرار الأدمن)، لازم النقاط تكفي.
- الباقي (التطبيق/الأيقونات/المتصفح/commit/migrate) المستخدم هيعمله بعدين.
## PROGRESS
- [x] قراءة LoyaltyWallet::convert و MemberTransfers
- [x] باك: Support + controller + routes + تسجيل Log
- [x] واجهة /admin/loyalty
- [x] اختبارات

## تنفيذ (2026-10-31 18:50)
- ibusiness_medical: App\Support\AdminLedgerMoves (transfer + convertPoints، transaction واحدة، قفل بترتيب id، صفوف دفتر فقط بـ created_by والسبب)، QuizLoyaltyController::{transfer,convertPoints}، routes admin.loyalty.transfer / admin.loyalty.convert، نموذجين لكل عضو في Pages/Admin/Loyalty/Index.vue، ترجمة عربي/إنجليزي، AGENTS.md.
- اختبارات: AdminLedgerMovesTest (7) عدّت؛ vite build سليم.
- التشغيل الكامل للباك إند: 870 نجح، 1 فاشل (FacilityListExportTest عمود Assigned manager الجديد) واتصلح وعدّى؛ كان 70 فاشل قبل ما نبدأ إصلاح الباك إند.
- [ ] ⏳ المستخدم (بعدين، قال هيعملها): APK على الـ Oppo، فتح المفاتيح، commit.
