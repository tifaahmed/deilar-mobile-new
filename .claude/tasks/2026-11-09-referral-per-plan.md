# خصم الإحالة والعمولة لكل باقة (مش رقم ثابت)
## المطلوب (حرفياً)
انا عايز اصلح ان لما الشخص هيشارك الرابط لاى حد ويسجل الى سجل هياخد خصم متغير على حسب باقات الاسعار الى موجوده عندنا مش رقم ثابت ياريت تصلح ده فى الباكاند والفرونت والتطبيق يعنى مثلا لما الشهر ب 100 الخصم 25 ولما النصف سنه ب 400 هياخد خصم 50 ولا السنه ب 600 هياخد خصم 100
الفكره كل باقه وليها الخصم بتاعها زي كا كل باقه بنائا عليها الشخص الى شارك هياخد فلوس عليها فى المحفظه اما 10% لاى حاجه او رقم محدد لكل باقه ادينى الخيار لده وطبقه
## القرارات
- الباك إند يملك القواعد (ibusiness_medical)؛ الموقع والتطبيق بيرسموا بس. تحديث بند 18 في ملفات العقد.
- لكل باقة: خصم للمُحال (EGP) + عمولة للمُحيل (نسبة % أو مبلغ ثابت، اختيار لكل باقة)، مع fallback للقيم القديمة.
## PROGRESS
- [x] قراءة Referrals.php + MembershipPlan
- [x] باك إند: إعدادات لكل باقة (referral_discount_<plan>, referral_commission_use_fixed_<plan>, _percent_<plan>, _fixed_<plan>) + Referrals::discountFor/commissionFor/rulesByPlan + apply بالباقة + migration 2026_11_09_100000 (لسه ما اتشغلتش على DB حقيقية) + /referral amounts.plans + status.plans[].referral_discount
- [x] اختبارات باك إند اتكتبت في ReferralTest (لسه ما خلصتش: php artisan test بيتعارض مع جلسات تانية على membership_test)
- [x] موقع: member-invite.tsx جدول الباقات + lang en/ar
- [x] تطبيق: ReferralScreen جدول الباقات + اختبار (9 نجحوا، tsc نضيف)
- [x] عقد بند 18 في 4 ملفات
- [ ] تشغيل ReferralTest وتأكيد النتيجة: cd ../ibusiness_medical && php artisan test tests/Feature/ReferralTest.php
- [ ] php artisan migrate على الـ DB الحقيقية (بموافقة المستخدم)
- [ ] صفحات الأدمن /admin/setting: الإعدادات الجديدة بتظهر تلقائياً (seed) — راجع من المتصفح
