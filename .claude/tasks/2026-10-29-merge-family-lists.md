# المهمة: دمج قائمتي أفراد الكارت في قائمة واحدة
## المطلوب (حرفياً)
http://localhost:3000/card/members  ليه هنا انا شايف افراد الكارت مرتين فوق وتحت انا عايز ادمجهم فى مره واحده
## PROGRESS
- [x] القائمتين: ProfileView beneficiaries (قديمة) + FamilyCircle
- [x] الدمج: القديمة بقت للزائر بدون حساب فقط، وكتلة "بانتظار الموافقة" اتشالت (FamilyCircle بيعرض pending/rejected + السبب؛ rejection_reason في /family/overview). ⏳ مراجعة بالمتصفح
- [x] (تصحيح بعد ملاحظة المستخدم) رجّعت الرقم القومي/تاريخ الميلاد/الحالة/الصلة جوه accordion الـ FamilyCircle؛ الباك إند بيبعت الرقم القومي والميلاد لصاحب الكارت الأساسي بس (FamilyOverviewController ownerView)
