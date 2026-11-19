# Multi-store orders: per-store shipping, split display, invoices
## المطلوب (حرفياً)
حاليا لو العميل اشترا منتجات من متجرين يفترض سعر الشحن بتاع كل واحد يختلف وجوا الطلب والواحد يكون باين انه متقسم الطلبيه على كذا متجر واقدر احمل فاتوره كل واحد على حدا والاتنين مع بعض
## PROGRESS
- [~] explore: products.store_id, order_products, OrderController::store delivery calc, order admin show, invoice existing?
- [x] APP DONE (fork): api/orders.ts quoteOrder/invoiceLink/types; CartCheckoutModal per-parcel lines + delivery_total; OrdersPage parcels + invoice buttons; test src/test/multiStoreShipping.test.tsx (+walletCheckout, walletOrderSplit pass); tsc clean; AGENTS.md section. Not verified on a device/browser; PDF export (downloadInvoicePdf) still shows the single delivery figure.
