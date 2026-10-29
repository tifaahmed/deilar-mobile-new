# المهمة: أفراد الأسرة اسم وصورة بس، والباقي في accordion
## المطلوب (حرفياً)
http://localhost:3000/card/members  عايز افراد الاسره تكون ظاهره اسماء وصوره بس لما بضغط تفتح accordion
## القرارات
- المقفول: صورة الشخص (avatar من الباك إند، وحرف أول لو مفيش) + الاسم + الصلة/شارات صغيرة (أنت/أساسي). الباقي (تليفون، رقم العضوية، نقاط، شارات إنجاز، صورة الكارت) جوه الـ accordion.
## PROGRESS
- [x] باك إند: avatar_url + phone_verified في /family/overview
- [x] FamilyCircle: accordion (صورة+اسم مقفول؛ تليفون/نقاط/شارات/كارت جوه)
- [x] tsc + src/test/familyCircle.test.tsx عدّوا. ⏳ مراجعة بالمتصفح
