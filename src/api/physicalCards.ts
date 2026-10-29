import { apiGetAuth, apiPost } from './http';
import type { PlacedOrder } from './orders';

/** What the "order a physical card" screen draws. The backend decides who may order and every price (`PhysicalCard`). */
export interface PhysicalCardInfo {
  eligible: boolean;
  /** Why not: `no_card`, `relative` (pay to become a primary member) or `not_current` (trial or expired). */
  reason: 'no_card' | 'relative' | 'not_current' | null;
  /** One card, and shipping once per order — both from /admin/setting. */
  price: number;
  shipping_price: number;
  cod_fee: number;
  max_per_card: number;
  payment_methods: { online: boolean; online_card: boolean; online_wallet: boolean; cod: boolean; wallet: boolean; instapay: boolean };
  /** The card numbers that can be ordered: the holder's own and every approved relative's. */
  cards: { membership_number: string; name: string | null; relationship: string | null; is_me: boolean }[];
}

export const fetchPhysicalCards = (token: string) => apiGetAuth<{ data: PhysicalCardInfo }>('/mobile/physical-cards', token).then((r) => r.data);

export interface PhysicalCardOrderBody {
  items: { membership_number: string; quantity: number }[];
  name: string;
  phone: string;
  governorate: string;
  city: string;
  street: string;
  specialMark?: string;
  notes?: string;
  email?: string;
  payment: 'cod' | 'transfer-wallet' | 'paymob';
}

/** Places the order (an ordinary order whose lines are cards). Online payment is then opened with `payOrder`. Throws `ApiError`. */
export const placePhysicalCardOrder = (token: string, b: PhysicalCardOrderBody) =>
  apiPost<{ order: PlacedOrder }>(
    '/mobile/physical-cards/orders',
    {
      items: b.items,
      customer_full_name: b.name,
      customer_phone: b.phone,
      customer_email: b.email?.trim() || null,
      customer_address: [b.street, b.city, b.governorate, b.specialMark].map((p) => p?.trim()).filter(Boolean).join(', ').slice(0, 1000),
      customer_governorate: b.governorate,
      customer_city: b.city,
      customer_street: b.street,
      customer_special_mark: b.specialMark?.trim() || null,
      notes: b.notes?.trim() || null,
      payment_type: b.payment,
    },
    undefined,
    token,
  ).then((r) => r.order);
