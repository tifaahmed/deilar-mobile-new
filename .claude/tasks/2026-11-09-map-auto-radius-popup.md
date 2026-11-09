# Map: auto radius growth past 10km opens the filter popup
## المطلوب (حرفياً)
"http://localhost:3000/map?radius=2 انا عامل لما بتغير انواع المنشئات دايره البخث تكبر لخد ما توصل للمكان المطلوب ولكن انا عايز لو تخطيت حاجز ال10كيلو كمل عادى ولكن افتح البوب اب الخاصه بترشيح اماكن
ولكن لو عادى انا الى بيدى الى بكبر الدايره وبغير فى الاماكن تمام عادى مش لازم البوب اب
لكن لو انا اتوماتيكك الدايره بتاعتى بتكبر عشان اوصل لمكان انا عايزه اعمل موضوع فتح البوب اب"
## PROGRESS
- [ ] find auto-grow radius code
- [ ] open filter popup when auto-growth crosses 10km (continue growing); manual changes never open it
- [ ] test + record
- [x] MapView.tsx: auto-widen past 10km opens filter drawer (AUTO_WIDEN_FILTER_KM); tsc + 270 tests pass (no dedicated test yet)
## مهمة تانية (المستخدم حرفياً)
"http://localhost:3000/map?radius=2  كلمه النطاق  هنا فى الدارك موود لونها ابيض على ابيض"
- [x] fix dark-mode (index.css .dark .bg-white\/95|90 rule) contrast of "النطاق" label (map-radius-select label)
