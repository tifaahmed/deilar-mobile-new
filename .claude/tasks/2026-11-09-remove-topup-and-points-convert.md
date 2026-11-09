# شيل الشحن بالفلوس + تحويل النقاط للمحفظة
## المطلوب (حرفياً)
شيل موضوع انك تدفع فلوس وتتحط فى المحفظه ومفيش طريقه ان نقاط الولاء تتحول للمحفظه
## القرارات
- قاعدة عدم الحذف: مفيش مسح بيانات (loyalty_transactions / wallet_transactions / wallet_topups تفضل زي ما هي). نقفل الميزتين (الباك إند يرفض، التطبيق والموقع يشيلوا الواجهة)، والكود يفضل خامد لحد ما المستخدم يأكد المسح.
- الباك إند يملك القواعد → نعدل فيه الأول وبعدين العقد (بند 13) في الملفات الأربعة.
## PROGRESS
- [ ] استكشاف: POST /wallet/topup, POST /loyalty/convert وواجهاتهم
- [ ] باك إند
- [ ] تطبيق
- [ ] موقع
- [ ] عقد + اختبارات
- [x] باك إند: topup/convert بيرجّعوا 410 + summary wallet_enabled=false/topup_enabled=false؛ اختبارين قدام اتعلّموا skipped + WalletClosedTest جديد
- [x] تطبيق: WalletPanel من غير شحن/تحويل (tsc نضيف)
- [ ] اختبار WalletClosedTest + تعديل src/test/walletPanel.test.tsx + بند 13 في العقد + الموقع (مفيش واجهة ليهم في الموقع حسب البحث)
- [x] WalletClosedTest نجح (2)، walletPanel.test اتحدّث، بند 13 اتحدّث
