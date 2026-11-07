import { apiGetAuth, apiPost, ApiError } from './http';

/**
 * Cash wallet money out to Vodafone Cash, as `GET /wallet/withdrawals` answers it (`WithdrawalController` in ibusiness_medical).
 * Every rule (the switch, minimum, maximum, daily cap, who may) is the backend's; the app only relays what was typed and draws the answer.
 */
export interface WithdrawalRules {
  /** The admin switch AND Paymob Payouts being set up. When false nothing is offered. */
  enabled: boolean;
  min: number;
  max: number;
  daily_max: number;
  /** true = paid at once with no admin approval. */
  auto: boolean;
}

export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'rejected' | 'canceled';

export interface Withdrawal {
  id: number;
  amount: number;
  /** Masked: 0101••••678. */
  msisdn: string;
  status: WithdrawalStatus;
  created_at: string | null;
  paid_at: string | null;
  /** The money went back to the wallet. */
  refunded: boolean;
}

export async function fetchWithdrawals(token: string): Promise<{ rules: WithdrawalRules; withdrawals: Withdrawal[] } | null> {
  try {
    const res = await apiGetAuth<{ data: { rules: WithdrawalRules; withdrawals: Withdrawal[] } }>('/wallet/withdrawals', token);
    return res?.data ? { rules: res.data.rules, withdrawals: res.data.withdrawals ?? [] } : null;
  } catch {
    return null;
  }
}

/** Throws nothing: `reason` is the backend's (disabled, bad_amount, bad_number, bad_national_id, not_enough, daily_limit, open_request). */
export async function requestWithdrawal(token: string, amount: number, msisdn: string, nationalId: string): Promise<{ ok: true; withdrawal: Withdrawal } | { ok: false; reason: string }> {
  try {
    const res = await apiPost<{ data: Withdrawal }>('/wallet/withdrawals', { amount, msisdn, national_id: nationalId }, undefined, token);
    return { ok: true, withdrawal: res.data };
  } catch (e) {
    if (e instanceof ApiError && e.status === 422) return { ok: false, reason: e.reason ?? 'failed' };
    return { ok: false, reason: 'failed' };
  }
}

export async function cancelWithdrawal(token: string, id: number): Promise<boolean> {
  try {
    await apiPost(`/wallet/withdrawals/${id}/cancel`, {}, undefined, token);
    return true;
  } catch {
    return false;
  }
}
