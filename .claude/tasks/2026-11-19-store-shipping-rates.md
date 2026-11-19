# Store shipping price per governorate + free delivery threshold (backend + website + app)
## المطلوب (حرفياً)
the price can be for specific government or one price for all and the free delivery after certain price can be different also  update that in the app the the card deilar and the deilar project
(سياق: صفحة admin/store/1/edit مفيهاش فلوس شحن للمتجر)
## القرارات
- backend owns the numbers. stores.shipping_price + stores.free_shipping_threshold (default for all, nullable = not set); table store_shipping_rates (store_id, governorate_id, price, free_threshold; null = follow default) for per-governorate overrides. Migration ADD ONLY.
- Resolution: override field if not null else store default. 0 = free.
- Clients (website ../deilar, app ../deilar-mobile-new) only DRAW what the backend returns (StoreResource `shipping`).
## PROGRESS
- [~] explore (backend store form/requests/resource, website store page, app store screen)
- [x] ALL DONE (backend+website+app): website StoreProfile/types/store-show.tsx/lang en+ar (tsc clean); app types.ts+StoreDetailView.tsx (tsc clean). Not browser-verified. Deploy: backend `migrate --force` (backup first), website/app rebuild.
