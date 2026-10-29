# المهمة: الحساب الأساسي يعدّل/يحذف أقاربه ويكمّل البيانات الناقصة
## المطلوب (حرفياً)
http://localhost:3000/card/members خليني اقدر انى اعدل على الاقارب لو انا الحساب الاساسي زي انى احذفهم واذيفهم وادخل البياانت الناقسه
## القرارات
- الباك إند يملك القواعد: مسارات /family/children (update/destroy) موجودة؛ لازم أشوف إيه المسموح لغير الأبناء.
- الإضافة تفضل pending لحد موافقة الأدمن؛ لا مسار لإنشاء قريب active من العضو.
## PROGRESS
- [x] قراءة updateChild/destroyChild/UpdateRelative + can_edit
- [x] باك إند: PATCH/DELETE /family/relatives/{id} (FamilyController::updateRelative/destroyRelative)؛ المعتمد (approved) بيتكمّل الناقص بس ولا يتغير الاسم؛ التليفون الجديد غير موثق؛ can_edit/can_delete/locked في /family؛ editable في /family/overview؛ MemberRelativeEditTest (+ تعديل اختبار القانون القديم في MemberFamilyTest)
- [x] التطبيق: RelativeTools في FamilyCircle (تعديل/استكمال، حذف بتأكيد)
- [~] اختبارات التطبيق عدّت؛ اختبارات الباك إند عدّت (45 من 45). ⏳ عقد CLAUDE.md بند 7 لسه بيقول الأب بس يعدّل الأبناء
- [ ] AddMemberForm للأقارب غير الأبناء (إضافة بالصور) مش اتلمس
