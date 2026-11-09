import { apiGetAuth, apiPost } from './http';

/**
 * Member-gets-member, as `GET /referral` answers it (`ReferralController` in ibusiness_medical). Every number comes from the
 * backend (admin settings): the app only draws them and relays a card number.
 */
export type ReferralStage = 'registered' | 'trial' | 'subscribed' | 'renewed';

/** One payout to me: the trial reward, or the commission on one paid subscription (`reversed` = taken back after a refund). */
export interface ReferralReward {
  id: number;
  kind: 'trial' | 'commission';
  amount: number;
  status: 'paid' | 'reversed';
  /** What the member really paid (commission only) and the percent applied. */
  base_amount: number;
  rate: number;
  plan: 'month' | 'half' | 'year' | 'other' | null;
  at: string | null;
  reversed_at: string | null;
}

export interface ReferralRow {
  id: number;
  name: string | null;
  phone_last4: string | null;
  joined_at: string | null;
  /** Where this person is: account made → trial started → paid → paid again (a renewal). */
  stage: ReferralStage;
  trial_started_at: string | null;
  /** The first plan they paid for. */
  plan: 'month' | 'half' | 'year' | 'other' | null;
  payments: number;
  subscribed: boolean;
  /** Everything this person has earned me (reversed payouts not counted). */
  earned: number;
  rewards: ReferralReward[];
}

export interface ReferralTotals {
  /** Taps on my link / installs matched to it — anonymous, so only totals (never a person). */
  clicks: number;
  app_opens: number;
  registered: number;
  trials: number;
  subscribed: number;
  trial_earned: number;
  commission_earned: number;
  earned: number;
  /** Trial rewards waiting for a verified phone + the commission on payments still waiting to be confirmed. */
  pending: number;
  wallet_balance: number;
  count: number;
}

export interface ReferralPlanRule {
  discount: number;
  commission_type: 'percent' | 'fixed';
  commission_percent: number;
  commission_fixed: number;
}

export interface ReferralInfo {
  enabled: boolean;
  /** My card number — the code. null until I have a real card (nothing to share yet). */
  code: string | null;
  link: string | null;
  /** trial_bonus: pounds when someone I brought starts a trial; `plans`: for EACH plan, the discount off their first subscription and what I earn (a percent OR a fixed sum). */
  amounts: { trial_bonus: number; commission_percent: number; discount: number; plans?: Partial<Record<'month' | 'half' | 'year', ReferralPlanRule>> };
  totals: ReferralTotals;
  referrals: ReferralRow[];
  /** Who brought me, when somebody did. */
  brought_by: { number: string; discount: number; discount_used: boolean } | null;
}

export const fetchReferral = (token: string) => apiGetAuth<{ data: ReferralInfo }>('/referral', token).then((r) => r.data);

/** "This card number brought me." Throws `ApiError` (422) whose `reason` says why not (see ReferralController). */
export const claimReferral = (token: string, number: string, source: 'link' | 'card') =>
  apiPost<{ data: { discount: number } }>('/referral/claim', { number, source }, undefined, token).then((r) => r.data);
