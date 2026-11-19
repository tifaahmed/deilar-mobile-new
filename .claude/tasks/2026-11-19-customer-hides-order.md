# Customer can hide an untouched order; admin still sees it flagged
## المطلوب (حرفياً)
فى حاله ان المنتج لسه كله لا اندفع ولا اتوافق عليه ولا اتسلم ولا اى حاجه عادي اقدر انى ان صاحب الطلب يخفيه عشان هوا مش موافق عليه بعد تاكيد منه وعايز الادمن يكون شايف ان الطلب ده العميل خفاه من عنده لانه مش عايزه
## القرارات
- NEVER delete: orders.hidden_by_customer_at (add-only). Hidden = excluded from the buyer's own lists only; admin sees everything with a "hidden by customer" badge + filter + log + bell notification.
- Eligible only while untouched: payment pending, delivery pending, nothing paid (total_paid/wallet/points = 0), no receipt, not shipped, not already hidden. Needs explicit confirm. Backend decides (can_hide), clients draw.
## PROGRESS
- [~] backend
- [x] APP done: hideOrder() + types (src/api/orders.ts), forgetOrder (utils/orders.ts), OrdersPage hide button (only when can_hide) + confirm dialog + 422 handling + hidden orders skipped; src/test/hideOrder.test.tsx 5 pass; tsc clean; AGENTS.md. Not seen on a device.
