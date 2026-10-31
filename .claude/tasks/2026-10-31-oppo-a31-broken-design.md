# Oppo A31 broken design
## المطلوب (حرفياً)
"i have phone oppo a31 why the app there so broken design colos icons even size"
## PROGRESS
- [~] فحص: tailwind version, CSS features (oklch/color-mix/@layer), minSdk, WebView, viewport, force-dark, font scale
- [ ] إصلاح
- [x] السبب: Tailwind v4 (oklch/@layer/@property/dvh) على WebView قديم (Android 9)
- [x] الإصلاح: postcss.config.mjs (cascade-layers, oklab, @property defaults, dvh fallback) + build.cssTarget chrome69 في vite.config.ts؛ 216 اختبار نجحوا
- [ ] بناء APK جديد وتجربته على الـ Oppo A31 (المستخدم)
