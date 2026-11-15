import { apiGetAuth, apiPost } from './http';
import type { PlacedOrder } from './orders';

/** What a relative costs, as the backend says it (`RelativeFee`, edited in /admin/setting). The app never computes a price. */
export interface RelativeFeeInfo {
  monthly: number;
  months: number;
  /** One relative, the whole period, paid at once. */
  per_relative: number;
  kind: 'individual' | 'company';
  pay_online: boolean;
  /** A company card: the team is told to call (monthly / salary deduction / instalments); paying the year at once is also offered. */
  request_only: boolean;
}

export interface RelativeFeeScreen {
  fee: RelativeFeeInfo;
  payment_methods: { online: boolean; online_card: boolean; online_wallet: boolean; cod: boolean; wallet: boolean; instapay: boolean };
  /** Relatives added and waiting for their fee. */
  waiting: { id: number; name: string | null; relationship: string | null }[];
}

export const fetchRelativeFees = (token: string) => apiGetAuth<{ data: RelativeFeeScreen }>('/mobile/relative-fees', token).then((r) => r.data);

/** Makes the order that pays these relatives' fee (online payment is then opened with `payOrder`). Throws `ApiError`. */
export const placeRelativeFeeOrder = (token: string, relativeIds: number[], payment: 'cod' | 'transfer-wallet' | 'paymob') =>
  apiPost<{ order: PlacedOrder }>('/mobile/relative-fees/orders', { relative_ids: relativeIds, payment_type: payment }, undefined, token).then((r) => r.order);
