# المهمة: طلب كارت حقيقي (فيزيكال) يوصل للعضو ولأفراد أسرته
## المطلوب (حرفياً)
http://localhost:3000/card  انا عايز انى اقدر اطلب كارت حقيقي  يجيلي ويجى لافراد اسرتى وممكن اشترى كذا كارت من نفس الرقم

ولكن من جدول الاعدادات انا عايز اتحكم بكم سعر طلب الكارت الfizical  وبكم سعر الشحن عموما

وحطها سعر الكاررت 50 وسعر الشحن 50

ده لو صاحب الكارت عضويه اساسيه وعضويه سنويه مش شهريه

## القرارات (الباك إند يملك القواعد → ibusiness_medical أولاً)
- مؤهل: عضو أساسي (مش قريب) ببطاقة مدفوعة وسارية، سنوي أو نصف سنوي (تعديل بطلب المستخدم). مش تجريبي ولا منتهي.
- إعدادين في /admin/setting: سعر الكارت الفيزيكال (افتراضي 50) وسعر الشحن (افتراضي 50)؛ العميل لا يحسب السعر.
- الكارت لنفس الرقم عدة نسخ (quantity)، ولكل فرد من الأسرة (primary + أقاربه) كمان.
- الدفع بطرق الدفع المفعّلة (PaymentMethods) — كما في الطلبات؛ مش قائمة ثابتة في العميل.
- (المستخدم أكد) لازم يتدفع ثمنه بطرق الدفع المفعّلة في الإعدادات ويعتبر Order كامل — اتنفّذ بإدخاله في جدول orders الموجود (source=physical_card)، من غير جداول منفصلة.
## PROGRESS
- [x] استكشاف الطلبات/الإعدادات
- [x] تصميم: orders الموجود + سطور OrderProduct بدون product_id
- [~] باك إند: PhysicalCard (إعدادات 50/50 + أهلية) + migration 2026_10_29_170000 + Mobile\PhysicalCardController + routes GET /mobile/physical-cards و POST /mobile/physical-cards/orders؛ اختبار PhysicalCardOrderTest شغال في الخلفية. ⏳ migrate محلياً
- [ ] التطبيق (/card)
- [ ] لوحة الأدمن (الإعدادات + متابعة الطلبات)
- [ ] عقد CLAUDE.md
- (طلب إضافي) وضّح الفرق في الداشبورد إن الطلب منتجات ولا كروت → badge + فلتر نوع الطلب في /admin/order (source=physical_card)
- [x] الأدمن: kind في AdminOrderListResource/ShowResource + فلتر kind في AdminOrderListController + badge في OrderListTable/OrderShowView + select في OrderListFilterContent + lang en/ar (order.kind*). ⏳ vite build للتحقق + مراجعة بصرية
- [x] PhysicalCardOrderTest: 3 عدّوا
- [x] التطبيق: route /card/physical (router CARD_SECTIONS) + PhysicalCardOrder.tsx + api/physicalCards.ts + زر في ProfileView + src/test/physicalCardOrder.test.tsx (2 عدّوا) + tsc نضيف
- [x] vite build للأدمن نجح (Vue سليم)؛ php artisan migrate اشتغل محلياً (إعدادين 50/50)
- [x] عقد CLAUDE.md بند 16 (التطبيق فقط)
- [ ] ⏳ لسه: بند 15+16 في AGENTS.md الباك إند وCLAUDE.md الموقع؛ مراجعة بالمتصفح (خصوصاً Paymob/الأدمن)؛ migrate على الإنتاج؛ npm run build للأدمن؛ الموقع (deilar) ما اتلمسش
- (تعديل من المستخدم) الشرط السنوي اتشال: أي أساسي مدفوع غير تجريبي (شهري/نصف سنوي/سنوي) يطلب.
