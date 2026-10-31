# المهمة: تبويب "الولاء والمحفظة" في صفحة العضو (لوحة التحكم)
## المطلوب (حرفياً)
"عمل الناقس" — يقصد الناقص من سؤاله: "هل من لوحة الأعضاء أقدر أتفرج على نقاط الولاء والمحفظة وسجل اللعب الخاصين به والعائلة وأشوف سجل تحويل النقاط لفلوس"
## القرارات
- في صفحة العضو العادية (مش /admin/loyalty): رصيد النقاط + المحفظة + قيمة النقاط بالجنيه، سجل الجولات مجمّع، سجل تحويل نقاط→فلوس، تحويلات الأعضاء، وجدول أقارب العضو بنقاط ومحفظة كل واحد.
- قراءة فقط؛ التعديل اليدوي يفضل في /admin/loyalty (مع تسجيل الأدمن).
## PROGRESS
- [x] فحص صفحة العضو (Admin/User/Membership/Show) والـ controller
- [x] باك: endpoint JSON للملخص + تجميع الجولات
- [x] واجهة: تبويب/قسم في صفحة العضو
- [x] اختبارات

## تنفيذ
- ibusiness_medical: App\Support\AdminMemberLoyalty، prop `loyalty` من AdminUserMembershipShowController، قسم في Pages/Admin/User/Membership/Show.vue، ترجمة member.* عربي/إنجليزي، AGENTS.md، AdminMemberLoyaltyTabTest (25 تأكيد عدّوا)، vite build سليم
- [ ] ⏳ المستخدم: يفتح صفحة عضو ويراجع بعينه؛ migrate؛ commit
