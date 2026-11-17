# فلتر المحافظة والمدينة في /store (زي /map?view=list)
## المطلوب (حرفياً)
"http://localhost:3000/store انا عايز اقدر انى افلتر بالحافظه والمدينه ولو واحده فيهم فاضيه متظهرش زرايرها وخليها بنفس الفكر هنا http://localhost:3000/map?view=list"
## PROGRESS
- [x] الباك إند GET /mobile/store-areas (+StoreAreasTest) + StoreAreaFilter.tsx موصّل في StoreView (governorate_id/city_id)؛ storeAreaFilter.test 2/2
## إضافة: كل أشرطة الترتيب (الأقرب/الأعلى خصم/الأكتر زيارة/الأحدث) تبقى سلايدر يتشد: StoreView تم، فاضل MapView + StoreMapView (وضع القايمة) + أي مكان تاني
## إضافة: عناصر القايمة (MapView list + StoreMapView list) — نسبة الخصم جنب نوع المنشأة بدل جنب الاسم
## إضافة: زرار الفلترة العايم (sliders) في /map?view=list يطلع فوق شوية عشان بيغطي الأيقونات الثابتة (MapView + StoreMapView)
- [x] زرار الفلترة العايم: bottom-40 → calc(14.5rem+safe-area) في MapView + StoreMapView (فوق زرار التواصل الثابت)؛ أشرطة الترتيب سلايدر في الخريطتين؛ الخصم جنب النوع في قوايم الخرايط
## إضافة: شيل سطر «المحافظة والمدينة + موقعي الحالي» من /map?view=list (MapView.tsx) — طلب المستخدم حرفياً: 'شيل السطر ده'
- [x] السطر اتشال من MapView (list) و StoreAreaFilter (/store)؛ tsc نضيف
