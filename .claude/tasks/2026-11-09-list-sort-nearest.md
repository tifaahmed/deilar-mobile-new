# List view: replace km filter with "sort by nearest"
## المطلوب (حرفياً)
"http://localhost:3000/map?view=list&radius=2   هنا لما اروح للقائمه مش عايز اشوف الفلتر الخاص بعدد الكليلو مترات عايز بداله ترتيب بالاقرب
والفروع الى ظاهره لو عامل الترتيب بالاقرب اظهر الفروع الاقرب لكن لو عامل بحث بالمحافظه والمدينه اظهر الفروع الاقرب للمحافظه ديه او المدينه ديه"
## PROGRESS
- [ ] read list view code (MapView.tsx ~line 183 listParams, 432 radiusSelect)
- [ ] replace list radius select with sort-by-nearest; with gov/city chosen sort nearest to that gov/city
- [ ] tests
- [x] app: list has "الأقرب" button (default) + top discount; km select removed from list; radius_km null; sort=nearest sent
- [x] backend (ibusiness_medical): nearestBranchKm/leadBranch take governorate/city → nearest WITHIN chosen place (additive)
- [ ] add backend test for area-nearest ordering (not done); AAB needs rebuild to include these
