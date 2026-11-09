# نقل المحفظة من اللعبة للبروفايل الشخصي
## المطلوب (حرفياً)
حط المحفظه من اللعبه وحطها ف البروفايل الشخصي فى زرار خاص بيه جوا
## القرارات
- المحفظة (WalletPanel/WalletScreen) تتشال من شاشة اللعبة (QuizGame) وتبقى بند/زرار في قائمة البروفايل (ProfileView nav) يفتح WalletScreen. لا حذف للمكوّن نفسه.
## PROGRESS
- [ ] قراءة QuizGame:613 + WalletScreen + ProfileView nav + router
- [ ] تنفيذ + تحديث الاختبارات (walletScreen/walletPanel/quiz)
- [x] لقيت زرار «محفظتي» موجود فعلاً في قائمة الحساب (ProfileView + profileWalletRow.test) → اللي اتعمل: شلت WalletPanel من شاشة اللعبة QuizGame؛ المحفظة بتتفتح من البروفايل (WalletScreen). tests 15 نجحوا
