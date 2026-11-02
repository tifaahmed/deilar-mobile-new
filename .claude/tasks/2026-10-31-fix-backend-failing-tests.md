# المهمة: إصلاح مشاكل الباك إند (66 اختبار فاشل في التشغيل الكامل)
## المطلوب (حرفياً)
"صلح اى مشاكل تبع الباك اند"
## القرارات
- التمييز: كود إنتاج فيه عيب → أصلح الكود؛ اختبار قديم بيفترض سلوك اتغيّر عن قصد → عدّل الاختبار. ما أغيّرش سلوك مقصود عشان اختبار يعدي.
- الاختبارات على قاعدة الاختبار فقط، مش قاعدة التشغيل.
## PROGRESS
- [ ] تصنيف الفشل بالسبب (من scratchpad/full.txt)
- [ ] إصلاح كل مجموعة + إعادة تشغيل ملفاتها
- [ ] تشغيل كامل نهائي

## تقدّم 2026-10-31 18:05
- [x] أصلحت: PartnerFreeDelivery، Facility* (contracted_at)، ProductDescriptionImageUpload (store_id)، TagTranslations (applies_to)، FacilityBannerSuggest (+ عيب إنتاج: الخصم 20 كان يتبعت 2 للـ AI)، StoreMembership، Auth/Profile/DeleteAccount (اتحوّلت لمسارات Jetstream الحقيقية)، Area*/Boundary*/GovernorateBorders (seeders؛ اختبارين بيعتمدوا على بيانات حقيقية مستوردة اتعلّموا skipped بسبب واضح)
- [ ] فاضل: SettingCrud، AdminUserLogsAndManagedBy، DashboardBlock، PartnerPhoneLogin، TrialCard، VisitorTracking، MobileApi، FacilitiesApi، PaymobPayment، SalesExcelImport

## نتيجة نهائية 2026-10-31 18:50
- تشغيل كامل: 870 نجح / 1 فاشل / 10 skipped (كان 70 فاشل). الفاشل الأخير (FacilityListExportTest) اتصلح وعدّى منفرداً. 2 skipped في AreaFiling بسبب إنهم محتاجين بيانات حقيقية مستوردة (مدن مش بتتعمل بالـ seeders).
- عيوب إنتاج اتصلحت: خصم 20% كان يتبعت 2% للـ AI؛ لوحة الأدمن كانت بتقع لو جدول settings مش موجود وقت النشر.
- [x] كل المجموعات اتقفلت.
