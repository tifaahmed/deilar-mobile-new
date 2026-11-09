# رفع الأيقونات الثابتة فوق النافبار
## المطلوب (حرفياً)
"الايقونات الثابته محتاجه تطلع فوق شويه عشان بتظهر ورا النافبار الى تحت"
## القرارات
- الأيقونتين: FloatingContactButton (bottom-20) و ReferProviderButton (bottom-36 + الفقاعة 9.4rem) — الاتنين مش بيحسبوا safe-area-inset-bottom بينما النافبار ارتفاعه 4.125rem + inset.
- الحل: bottom بـ calc(... + env(safe-area-inset-bottom)) ورفع ~1rem.
## PROGRESS
- [x] تعديل الـ bottom في الملفين
- [x] الاختبارات نجحت (7/7)
- [ ] build جديد للتطبيق لو عايز تشوفه على الموبايل
