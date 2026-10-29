# المهمة: رفع صور لأفراد الأسرة (حساب أساسي)
## المطلوب (حرفياً)
عايز القدره انى ارفع الصور لافراد اسرتى لو حسابي اساسي
## القرارات
- "الصورة" = صورة الشخص (avatar على users، نفس مجموعة media اللي يستخدمها العضو لنفسه) — مش صور البطاقة.
- الباك إند أولاً: POST /family/relatives/{id}/avatar (primary.member فقط، قريب من كارتي فقط)، والتطبيق يرسمها في FamilyCircle (avatar_url موجود).
## PROGRESS
- [x] قراءة كيف العضو يرفع أفاتار نفسه (AccountController/ProfileView)
- [x] باك إند: POST /family/relatives/{id}/avatar + اختبار في MemberRelativeEditTest (عدّى ضمن 45 من 45)
- [x] التطبيق: زر رفع/تغيير صورة داخل accordion القريب
