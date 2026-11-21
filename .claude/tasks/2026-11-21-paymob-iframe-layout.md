# Paymob wallet iframe يبوّظ تصميم التطبيق (2026-11-21)
المطلوب (حرفياً): "فى طلب الكارت الفيزيال لما بقرر انى ادفع عن طريق باى موب محفظه وادخل على الifram الخاص ب باى موب التصميم عندى بيضرب وبلاقى نفسي بعمل scroll left and right فى التطبيق كله وكل الصفحات بلاقى نفسي محتاج اعمل اعاده تحميل برا عشان ابعاد التطبيق ترجع سليمه"
## PROGRESS
- [~] قراءة مكان فتح iframe/checkout (PaymobPixel, physical card order)
- [x] PaymobFrame: في التطبيق المثبّت (Capacitor native) مفيش iframe — بيفتح المتصفح الداخلي + polling للتأكيد؛ ومعاه resetViewportZoom() عند إغلاق الـ frame (للويب). test: paymobFrame.test.tsx
- [ ] ما اتجربش على جهاز؛ السبب مش متأكد منه 100% (مفيش جهاز هنا) — لو لسه بيحصل نشوف الـ visualViewport.scale
