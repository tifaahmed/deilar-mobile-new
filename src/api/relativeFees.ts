import { apiGetAuth, apiPost } from './http';
import type { PlacedOrder } from './orders';

/** What a relative costs, as the backend says it (`RelativeFee`, edited in /admin/setting). The app never computes a price. */
export interface RelativeFeeInfo {
  monthly: number;
  months: number;
  /** One relative, the whole period, paid at once. */
  per_relative: number;
  /** What is on sale per relative: one month or the whole period (the backend's prices, never computed here). */
  plans?: { key: 'month' | 'year'; price: number; months: number }[];
  kind: 'individual' | 'company';
  pay_online: boolean;
  /** A company card: the team is told to call (monthly / salary deduction / instalments); paying the year at once is also offered. */
  request_only: boolean;
}

export interface RelativeFeeScreen {
  fee: RelativeFeeInfo;
  payment_methods: { online: boolean; online_card: boolean; online_wallet: boolean; cod: boolean; wallet: boolean; instapay: boolean };
  /** Whether this card may pay now; otherwise `reason`: `trial` (they try with the trial), `parent_not_paid` (a relative on an unpaid card buys a normal plan), `not_current`, `no_card`. */
  can_pay?: boolean;
  reason?: string | null;
  /** Who can be paid for: waiting relatives AND those already active or lapsed (renewal). A relative who signed in sees only themself. */
  waiting: { id: number; name: string | null; relationship: string | null; state?: string; expiration_date?: string | null }[];
}

export const fetchRelativeFees = (token: string) => apiGetAuth<{ data: RelativeFeeScreen }>('/mobile/relative-fees', token).then((r) => r.data);

/** Makes the order that pays these relatives' fee (online payment is then opened with `payOrder`). Throws `ApiError`. */
export const placeRelativeFeeOrder = (
  token: string,
  relativeIds: number[],
  payment: 'cod' | 'transfer-wallet' | 'paymob',
  opts: { plan?: 'month' | 'year'; usePoints?: boolean } = {},
) =>
  apiPost<{ order: PlacedOrder }>(
    '/mobile/relative-fees/orders',
    { relative_ids: relativeIds, payment_type: payment, plan: opts.plan, use_points: opts.usePoints ? true : undefined },
    undefined,
    token,
  ).then((r) => r.order);
