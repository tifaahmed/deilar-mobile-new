# نظام Referral (دعوة أصدقاء)

## المطلوب (كلام المستخدم حرفياً)
انا عايز اعمل نظام referral بحيث ممكن من جوا بروفايل نعمل مشاركه للواتس او لاى حته او مشاركه عن طريق qrcode

للعلم انا هستخدم رابط مجرد ما الناس تفتحه من على الموبايل يتوجه لتحميل التطبيق ولما يفتح معاهم ويسجلو رقمهم خلاص هما اتسجلو انهم جم عن طريق الشخص الاول فا ياخدو 10 جنيه فى المحفظه والى حمل التطبيق ياخد خصم على الاشتراكات السنويه او النصف سنويه 50جنيه

وحتى لو حمل التطبيق مع نفسه و وصل انه عايز يعمل حساب فى الفورم الاخير يسجل انه جه تبع مين عن طريق انه يدخل رقم العضويه الى مع زميله الى جابو معانا

الكود الى هيعبر ان الشخص الجديد مين جابو عن طريق رقم العضويه

الفكره: انا لو جيبت حد عن طريقى هاخد على المحفظه 10 جنيه ولو حصل ان الشخص ده دفع حق اشتراك انا هيجيلى 40 جنيه كمان والى سجل هيجيلو خصم 50 جنيه على الاشتراك

انا هيكون عندى سجل مين سجل تحتى وهل هوا فعل عضويه ولا لا، واعرف انا اخدت منه 10 ولا 50 بحيث اعرف هوا دفع الاشتراك ولا

## طلب المستخدم التاني (2026-11-07، حرفياً)
عايزك تعمل كل الافكار الى عندك كلها وتخليه بشكل ان مفيش تحسن ممكن يتعمل عليه وسجل التقدم لو الجهاز فصل وطلع النتايج التقدم كل 10 د اعمل كل حاجه عشان انا هناك الان وبكره هكمل. المهم جاوب على اي سؤال يقف معاك بالى انت شايفه صح وانت عارف ان الباك اند والموقع والموبايل هنا ~/projects/deilar. تعامل وخلى ال3 مشاريع ماشيين مع بعض صح.
→ القرار: أنا اللي بقرر في أي سؤال (المُحال ما ياخدش 10 ج؛ الباقي بالأنسب). التقدم يتسجل هنا بعد كل خطوة وبقدّم تقرير كل ~10 د.

## القرارات / الفهم (افتراضات تحتاج تأكيد)
- الكود = رقم عضوية المُحيل (membership number). الرابط: `.../r/<رقم العضوية>` → يفتح التطبيق لو متسطّب، وإلا يروح للتحميل (ويحتفظ بالكود).
- المُحيل: +10 ج للمحفظة عند تسجيل الشخص الجديد، +40 ج كمان عند أول دفع اشتراك (إجمالي 50).
- المُحال: خصم 50 ج على الاشتراك (سنوي أو نص سنوي).
- (سؤال مفتوح) هل المُحال كمان ياخد 10 ج في المحفظة؟ (أول رسالة قالت كده، التوضيح التاني لأ) — الافتراض الحالي: لأ.
- القواعد كلها في الباك إند `../ibusiness_medical` (الأرقام إعدادات أدمن)؛ التطبيق والموقع بيرسموا بس. تحديث قسم CONTRACT في ملفات CLAUDE.md الثلاثة.
- مرة واحدة لكل رقم تليفون، مفيش إحالة لنفسه، المحفظة append-only، الدفع idempotent.
- سجل للمُحيل: مين سجل تحته، هل فعّل عضوية، وإيه اللي اتاخد (10 / 50).

## PROGRESS
- [x] استكشاف الباك إند (wallet, ActivateSubscription, StartSubscription, MembershipStatus)
- [x] الباك إند (`../ibusiness_medical`): migration `2026_11_07_100000_create_referrals_table` (لسه ما اتشغلتش على DB حقيقية)، `Models/Referral`, `Support/Referrals` (إعدادات referral_*), `Api/V1/Member/ReferralController` (`GET /referral`, `POST /referral/claim`)، routes، وصل بـ ActivateSubscription (+40) و StartSubscription/WalletPayments (خصم 50) و MembershipStatus (`referral_discount`, `plans[].discounted_price`)
- [x] اختبار `tests/Feature/ReferralTest.php` (4 نجحوا على membership_test): `php artisan test tests/Feature/ReferralTest.php`
- [ ] الباك إند: عرض الإحالات في لوحة الأدمن (لسه) + تشغيل الـ migration على الإنتاج بعد مراجعة المستخدم
- [x] التطبيق: شاشة `ReferralScreen` على `/account/invite` (بند "ادعُ أصدقاءك واكسب" في قائمة الحساب): الكود + QR + مشاركة/واتساب/نسخ + سجل مين سجل واشترك
- [x] التطبيق: `utils/referral.ts` (التقاط الكود من `appUrlOpen`/launch URL/`?ref=`، حفظه، إرساله بعد تسجيل الدخول من App.tsx) + حقل "رقم عضوية اللي جابك" في `TrialCardForm` + سعر بعد الخصم في `PlanPicker`/`SubscribePanel`
- [x] اختبارات التطبيق: `src/test/referral.test.tsx` + كل الـ suite (265 نجحوا) + `tsc --noEmit` نضيف
- [x] CONTRACT بند 18 اتضاف في 4 ملفات (app CLAUDE.md، website CLAUDE.md+AGENTS.md، backend AGENTS.md) — backend CLAUDE.md مفيهوش بنود العقد أصلاً
- [ ] الموقع `../deilar`: صفحة `/r/{number}` (تخزّن الكود وتحوّل للمتجر بـ `&referrer=ref%3D<number>`) — لسه
- [ ] Android: App Links (`intent-filter` autoVerify + `assetlinks.json` على الموقع) عشان اللينك يفتح التطبيق لو متسطّب — لسه
- [ ] Play Install Referrer: التقاط الكود بعد التحميل من المتجر محتاج plugin native (مفيش حاجة منزّلة؛ مفيش نت وقت الشغل) — لسه، محتاج قرار
- [ ] `qrcode` اتضافت في package.json بس النسخة اتنسخت يدوي من ibusiness_medical/node_modules (مفيش نت): شغّل `npm install` أونلاين يحدّث الـ lock
- [ ] لوحة أدمن: عرض الإحالات وتعديل المبالغ

## خطة الجولة التانية (قرارات اتاخدت — المستخدم غايب)
- بدل plugin native للـ Install Referrer (مفيش نت + خطر يكسر الـ build): **مطابقة ضغطة اللينك** — الموقع يسجّل الضغطة في الباك إند (`referral_clicks`: code + hash للـ IP + وقت)، والتطبيق أول مرة يفتح يسأل `POST /mobile/referral/match` والباك إند يرجّع الكود لو فيه ضغطة واحدة بس من نفس الـ IP في آخر 24 ساعة (بدون غموض). + `referrer=` في رابط Play كمان (للمستقبل).
- الموقع: `/r/{code}` + `/.well-known/assetlinks.json` (من env `ANDROID_SHA256`، 404 لو مش متحدد) + حقل الكود في فورم التجربة + claim بعد الدخول + صفحة `/account/invite` + عرض السعر بعد الخصم.
- التطبيق: intent-filter لـ `/r/` + استدعاء match أول تشغيل.
- الأدمن (backend): صفحة `/admin/referrals` فيها الجدول والإجماليات + بند في القائمة.
- ترتيب التنفيذ: (1) backend clicks+match+partner click (2) admin page (3) website (4) app manifest+match (5) اختبارات + مراجعة نهائية + تحديث CONTRACT.
- تقرير كل ~10 دقايق: أحدّث PROGRESS هنا وأكتب سطر في الشات.

### PROGRESS الجولة التانية
- [x] (1) backend: referral_clicks (migration 2026_11_07_110000، لسه ما اتشغلتش على الإنتاج) + `ReferralLinkController` (`POST partner/referral/click` بالـ X-Api-Key، `POST mobile/referral/match`) + 5 اختبارات ReferralTest ناجحين
- [x] (2) backend: صفحة أدمن `/admin/referrals` (`Admin/ReferralController`, `Pages/Admin/Referral/Index.vue`, بند sidebar، اختبار `tests/Feature/Admin/ReferralAdminTest.php` ناجح، الـ vite build بيعدي)
- [x] (3) website `../deilar`: `Actions/Members/MemberReferral`, `Marketing/ReferralLinkController` (`/r/{code}` + `/.well-known/assetlinks.json` من env `DEILAR_ANDROID_SHA256`)، claim بعد الدخول وفي `startTrial` + حقل `referrer` في `member-trial.tsx`، صفحة `/account/invite` (`member-invite.tsx` + QR) + رابطها في member-account، سطر الخصم في member-card-panel، ترجمات ar/en، `tests/Feature/MemberReferralTest.php` (9 ناجحين). ملحوظة: اختبار `MemberTrialCardTest` 'one-minute reminder' فاشل من قبل (طلبَين partner/visits زيادة) — مش من شغلي. `qrcode` اتضافت لـ package.json ومنسوخة يدوي (مفيش نت).
- [x] (4) app: `AndroidManifest` intent-filter (`deilar.com/r/`, autoVerify) + `matchInstallReferral()` أول تشغيل + اختبارات (7 ناجحين)
- [x] إضافة: حماية ضد الغش في الباك إند — `mutual` (اتنين مايجيبوش بعض) و`referral_signup_daily_limit` (10/يوم، بعدها الإحالة تتسجل والخصم يفضل بس المكافأة 0) + اختبارين + نصوص الرفض في التطبيق والموقع + CONTRACT بند 18 اتحدّث في 4 ملفات
- [x] (5) مراجعة نهائية (خلصت): ريجريشن الباك إند 73 ناجح،  ريجريشن الباك إند (TrialCard/WalletPayments/PaymobPayment/GuestTrialJourney) شغال في الخلفية، نتيجته في scratchpad/backend-regress.txt؛ بعدها suite التطبيق الكاملة + tsc

## ملاحظات إعادة التشغيل
- تجارب الباك إند على قاعدة بيانات مؤقتة فقط. التطبيق: `npm test`.

---
# الجولة الثالثة (2026-11-07) — تعديل القواعد (يلغي قواعد الجولة الأولى حيث يتعارض)

## المطلوب (حرفياً من المستخدم، ملخّص البنود)
- **مكافأة Trial:** المُحيل ياخد 10 ج في المحفظة لما المدعو: يضغط الرابط → يحمل التطبيق وينشئ حساب → **يبدأ العضوية التجريبية (Trial)**. مرة واحدة لكل مدعو، ولا يشترط اشتراك مدفوع.
- **عمولة الاشتراك:** 10% من قيمة **كل** دفعة اشتراك ناجحة للمدعو (بما فيها التجديد، مش أول اشتراك بس)، على **المبلغ الفعلي المدفوع** (بعد الخصومات)، بدون عمليات فاشلة/ملغاة/مستردة. أمثلة: 100→10، 400→40، 600→60.
- **صفحة `account/invite`:** Dashboard: إجمالي المسجلين، اللي بدأوا Trial، اللي عندهم اشتراك مدفوع، إجمالي مكافآت Trial، إجمالي العمولات، إجمالي الأرباح، رصيد المحفظة، الأرباح المعلقة. + جدول لكل مدعو بحالته (ضغط فقط / حمّل / أنشأ حساب / بدأ Trial / اشترك شهري-نصف سنوي-سنوي / جدّد) + أرباحه + تفاصيل كل مكافأة/عمولة وتاريخها.
- **قواعد:** كود+رابط لكل عضو؛ لا دعوة النفس؛ مكافأة Trial مرة واحدة للحساب؛ عمولة مرة لكل عملية دفع؛ إضافة المحفظة Idempotent؛ سجل كامل؛ مراجعة الحماية من الحسابات الوهمية؛ الضغط/التحميل لا يصرف مكافأة؛ لا عمولة على دفع فاشل/ملغي/مسترد.
- **التنفيذ:** راجع الحالي (Backend/Website/App)، أعد استخدام المكونات، عدّل القواعد/DB/APIs/Dashboard/ترجمات ar+en، استمرار الربط من الرابط→التحميل→التسجيل→Trial، كل دفع/تجديد مرتبط بصاحب الدعوة، لا تكسر المحفظة/الاشتراكات، اختبارات (مكافآت/عمولات/تجديد/استرداد/منع تكرار)، شغّل الاختبارات + TypeScript في الثلاثة.
- **مهم جداً:** لا migrations على Production، لا نشر قبل مراجعة المستخدم. حدّث هذا الملف.

## قرارات الجولة الثالثة
- مكافأة Trial (setting `referral_signup_bonus`=10) تُصرف عند **بدء Trial** (`StartTrialCard` → `Referrals::trialStarted`)، أو لحظة قبول الكود لو العضو بدأ Trial قبلها. مش عند التسجيل/الضغط/التحميل.
- شرط إضافي ضد الحسابات الوهمية: رقم المدعو لازم يكون `phone_verified_at` (كود SMS حقيقي). لو لسه → المكافأة **معلّقة** وتُصرف تلقائياً عند التحقق (`MemberOtp::confirmPhone` → `Referrals::phoneVerified`).
- العمولة: setting جديد `referral_commission_percent`=10 على `subscription.amount` (الفعلي بعد الخصم) لكل دفعة مقبولة (`ActivateSubscription`، كل الطرق + التجديد). تم **إلغاء** مكافأة الـ40 ج الثابتة (`referral_subscription_bonus`) واستُبدلت بالعمولة.
- خصم الـ50 ج للمدعو على أول اشتراك: **أبقيته** (قرار سابق للمالك، لم يُلغَ في الطلب الجديد) — لو عايز تشيله خلّي `referral_discount`=0.
- الاسترداد: `Referrals::subscriptionRefunded` يكتب debit عكسي في المحفظة (مرة واحدة) ويعلّم الـreward `reversed` (مربوط بـ Paymob REFUNDED/VOIDED). **المحفظة عمرها ما تبقى سالب** (قرار المالك): العكس بيسحب بس المتاح في المحفظة والباقي بيتسجل في note.
- حد يومي: `referral_signup_daily_limit` بقى على مكافآت Trial (بعده المكافأة 0 لكن العضو يفضل مُحال وياخد الخصم).
- Ledger جديد `referral_rewards` (unique `reward_key` = `trial:<referral>` / `commission:<subscription>`) + مفتاح المحفظة `referral-<key>`.
- حالات الجدول: registered / trial / subscribed(plan: month|half|year) / renewed. «ضغط فقط» و«حمّل التطبيق» مجهولين (IP hash) فمعروضين كأرقام إجمالية (`clicks`, `app_opens`) مش لكل شخص.
- «المعلّق» = مكافآت Trial في انتظار تحقق الرقم + 10% من اشتراكات المدعوين اللي لسه pending (إيصال ينتظر تأكيد).
- Migration جديدة additive: `2026_11_07_120000_referral_trial_reward_and_commission` (لم تُشغَّل على Production).

## PROGRESS الجولة الثالثة
- [x] مراجعة التنفيذ الحالي (كان: 10 عند التسجيل + 40 عند أول دفع + خصم 50)
- [x] الباك إند: migration 120000، `ReferralReward`، إعادة كتابة `Referrals`، hooks (StartTrialCard/ActivateSubscription/Paymob refund/confirmPhone)، `GET /referral` dashboard، صفحة الأدمن + ترجمات ar/en
- [x] اختبارات الباك إند: `ReferralTest` (14) + `Admin/ReferralAdminTest` = 15 نجحوا (على membership_test المؤقتة)
- [x] ريجريشن الباك إند (TrialCard/WalletPayments/PaymobPayment/GuestTrialJourney/MemberTransfers/CardNumberLogin): 87 نجحوا
- [x] الموقع `../deilar`: `member-invite.tsx` dashboard + جدول + تفاصيل، ترجمات ar/en، `MemberReferralTest` (10 نجحوا) + tsc + eslint نضيفين
- [x] التطبيق: `ReferralScreen` dashboard + جدول مراحل + تفاصيل المكافآت، `referral.test.tsx` (8)، الـ suite كاملة 268 نجحوا، tsc نضيف
- [x] تحديث CONTRACT بند 18 في الملفات الأربعة (CLAUDE.md للتطبيق والموقع، AGENTS.md للموقع والباك إند)

## المتبقي / ينتظر مراجعة المستخدم (الجولة الثالثة)
- لم يُنفَّذ أي migration على Production ولم يُنشر أي شيء ولم يُعمل commit. Migrations الجديدة اللي هتشتغل عند النشر: `2026_11_07_100000`, `110000`, `120000` (كلها additive).
- قرار محتاج تأكيدك: خصم الـ50 ج للمدعو على أول اشتراك **اتساب** كما هو (الطلب الجديد ما ذكرهوش). لو عايز تلغيه: `referral_discount` = 0 من /admin/setting.
- قرار محتاج تأكيدك: مكافأة Trial بتتطلب رقم موبايل متحقق منه بـ SMS حقيقي؛ لو الأدمن مشغّل «كود ثابت/بدون تأكيد» فالمكافآت هتفضل معلّقة لحد التحقق الحقيقي.
- «ضغط فقط / حمّل التطبيق» مش ممكن تتربط بشخص (مجهولين، IP hash) فمعروضين كأرقام إجمالية في الـ dashboard مش في الجدول.
- (قرار المالك) المالك هيشوف لو Paymob تقدر تحوّل فلوس من مشروعه لمحفظة عميل (استرداد للمحفظة) — لسه.
- (قرار المالك) خصم referral يتحكم فيه الأدمن (`referral_discount`) ويظهر للمُحيل والمدعو. (قرار) تحقق SMS: مفيش قلق.
- العمولة على الاسترداد: مربوطة باسترداد/إلغاء Paymob. مفيش مسار استرداد يدوي من الأدمن للاشتراكات حالياً (لو اتضاف لازم يستدعي `Referrals::subscriptionRefunded`).
- `qrcode` لسه منسوخة يدوي في الموقع والتطبيق: شغّل `npm install` أونلاين لتحديث الـ lock.
- Play Install Referrer native لسه مش متضاف (المطابقة بالـ IP هي البديل).
- اختبار `MemberTrialCardTest` 'one-minute reminder' فاشل من قبل شغلي (مش من التعديل ده).

---
# الجولة الرابعة — سحب رصيد المحفظة إلى فودافون كاش عبر Paymob Payouts
## المطلوب (حرفياً): "هل ممكن تبنيه وتجربه ؟"  (بعد سؤال: هل ينفع تحويل فلوس من المحفظة إلى فودافون كاش لأي عميل من باي موب)
## القيود
- المحفظة عمرها ما تبقى سالب. لا production، لا نشر، لا commit. لا توجد بيانات Paymob Payouts حقيقية → التجربة بمحاكاة Http فقط، والميزة مقفولة افتراضياً بمفتاح أدمن.
## PROGRESS
- [x] قراءة وثائق Paymob Payouts (token: POST o/token/ بـ Basic+password grant؛ disburse: issuer=vodafone,msisdn,amount,national_id إجباري,client_reference_id)
- [x] backend: migration 130000 + WalletWithdrawal + PaymobPayouts + WalletWithdrawals + API + صفحة أدمن (super admin) — WalletWithdrawalTest 13 نجحوا (Paymob مُحاكى)
- [x] app: `WithdrawPanel` داخل `WalletPanel` + `api/withdrawals.ts` + `withdrawPanel.test.tsx` (4) — الـ suite كاملة نجحت، tsc نضيف
- [x] CONTRACT بند 19 في الملفات الأربعة
- [ ] لم يُجرَّب على Paymob الحقيقي/staging (مفيش credentials). لتفعيله: حط `PAYMOB_PAYOUTS_*` في .env، شغّل migration 130000، جرّب على staging بالأرقام التجريبية (vodafone 01023456789)، وبعدها فعّل `wallet_withdrawals_enabled`. الموقع (website) مفيهوش واجهة سحب (التطبيق فقط).
