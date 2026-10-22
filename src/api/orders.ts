import { ApiError, apiGet, apiGetAuth, apiPost, buildUrl } from './http';

export interface PlacedOrder {
  order_code: string;
  total_amount: number;
  total_amount_before_discount: number | null;
  delivery_price: number;
  /** The pay-on-delivery fee already inside `total_amount`; 0 = none. */
  cod_fee: number;
}

/** The two ways to pay online with Paymob: its bank-card form, or a mobile wallet (Vodafone Cash…). */
export type OnlineChannel = 'card' | 'wallet';

/** The online-payment page a buyer is sent to; `checkout_url` is null when the gateway could not be reached. */
export interface PaymentLink {
  /** Paymob's hosted page — the fallback when the embedded form cannot load. */
  checkout_url: string | null;
  /** What the embedded card form (Paymob Pixel) mounts with: one order, valid for an hour. */
  client_secret: string | null;
  public_key: string | null;
  message: string | null;
}

export interface NewOrder {
  name: string;
  phone: string;
  /** The same address the website's checkout collects. */
  addressType: 'home' | 'work' | 'other';
  governorate: string;
  city: string;
  street: string;
  buildingNumber?: string;
  floorNumber?: string;
  apartmentNumber?: string;
  specialMark?: string;
  notes?: string;
  payment: 'cod' | 'transfer-wallet' | 'paymob';
  /** With `paymob`: which Paymob page opens — the bank card form or the mobile wallet. */
  paymobChannel?: OnlineChannel;
  /** Where the purchase receipt is mailed. Optional. */
  email?: string;
  /** The buyer's card: it, not this field, is what earns the member price — the server checks it. */
  membershipNumber?: string;
  items: { slug: string; quantity: number }[];
}

/**
 * Places a real order. Prices and delivery are decided by the server; only slugs
 * and quantities are sent. Throws `ApiError` (422 with a message when no product
 * in the basket is still available).
 */
export async function placeOrder(order: NewOrder, token?: string): Promise<PlacedOrder & { payment: PaymentLink | null }> {
  const res = await apiPost<{ order: PlacedOrder; payment: PaymentLink | null }>(
    '/mobile/orders',
    {
      customer_full_name: order.name,
      customer_phone: order.phone,
      customer_email: order.email?.trim() || null,
      // One line composed from the parts, smallest to largest — the same way the website writes it.
      customer_address: [order.street, order.buildingNumber, order.floorNumber, order.apartmentNumber, order.city, order.governorate, order.specialMark]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(', ')
        .slice(0, 1000),
      customer_address_type: order.addressType,
      customer_governorate: order.governorate,
      customer_city: order.city,
      customer_street: order.street,
      customer_building_number: order.buildingNumber?.trim() || null,
      customer_floor_number: order.floorNumber?.trim() || null,
      customer_apartment_number: order.apartmentNumber?.trim() || null,
      customer_special_mark: order.specialMark?.trim() || null,
      notes: order.notes || null,
      payment_type: order.payment,
      paymob_channel: order.payment === 'paymob' ? order.paymobChannel ?? null : null,
      membership_number: order.membershipNumber || null,
      items: order.items,
    },
    undefined,
    token,
  );

  return { ...res.order, payment: res.payment ?? null };
}

/** Opens the online payment again for an order not paid yet (declined card, closed page). */
export async function payOrder(orderCode: string, channel?: OnlineChannel): Promise<PaymentLink> {
  const res = await apiPost<{ payment: PaymentLink }>(`/mobile/orders/${encodeURIComponent(orderCode)}/pay`, channel ? { paymob_channel: channel } : {});
  return res.payment;
}

/** Attaches a transfer receipt (photo) to an order already placed. */
export async function uploadReceipt(orderCode: string, file: File): Promise<void> {
  const form = new FormData();
  form.append('receipts[]', file);

  const res = await fetch(buildUrl(`/mobile/orders/${encodeURIComponent(orderCode)}/receipt`), { method: 'POST', headers: { Accept: 'application/json' }, body: form });
  if (!res.ok) throw new ApiError(`Receipt upload failed (${res.status})`, res.status);
}


export interface OrderItem {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  quantity: number;
  old_price: number | null;
  new_price: number | null;
  line_total: number;
}

interface Labelled {
  value: string;
  label: string;
}

/** One order as the tracking screen shows it (the API's own snapshot, never the live catalogue). */
export interface OrderDetail {
  order_code: string;
  placed_at: string | null;
  customer_full_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_governorate: string | null;
  membership_number: string | null;
  notes: string | null;
  total_amount: number;
  total_amount_before_discount: number | null;
  total_paid: number;
  delivery_price: number;
  cod_fee?: number;
  refunded_amount?: number;
  can_pay_online?: boolean;
  delivery_free_reason: string | null;
  payment_type: Labelled;
  payment_status: Labelled;
  delivery_status: Labelled;
  cancel_reason: string | null;
  awaiting_receipt: boolean;
  accepts_receipts: boolean;
  receipts: unknown[];
  items: OrderItem[];
}

/** An order by its code — the code is the key, like on the website. Resolves to null when there is no such order. */
export async function fetchOrder(code: string): Promise<OrderDetail | null> {
  try {
    return (await apiGet<{ order: OrderDetail }>(`/mobile/orders/${encodeURIComponent(code)}`, {}, { ttl: 0 })).order;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** Every order of the signed-in member, newest first (survives clearing the app's data). */
export const fetchMyOrders = (token: string) => apiGetAuth<{ data: OrderDetail[] }>('/orders', token, { per_page: 50 }).then((r) => r.data);

/** Hands the guest orders this device placed to the member who just signed in. Orders that already belong to someone are left alone. */
export const claimOrders = (token: string, codes: string[]) => apiPost<{ data: { claimed: string[] } }>('/orders/claim', { codes }, undefined, token);
