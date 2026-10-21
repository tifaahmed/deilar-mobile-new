import { apiGetAuth, apiPost } from './http';

/**
 * The card's state, as the backend decides it (`MembershipStatus` in ibusiness_medical).
 * The app only DRAWS it: whether a card is expired, what it costs and who may add
 * relatives are never worked out here, so the website and the app cannot disagree.
 */
export interface CardStatus {
  /** `trial`, `trial_expired`, `active`, `expired`, `inactive`, `pending` or `none`. */
  state: string;
  is_trial: boolean;
  /** True for a trial that ran out AND a paid card that lapsed: both get the red sign. */
  expired: boolean;
  valid: boolean;
  expires_on: string | null;
  days_left: number;
  price: number;
  months: number;
  can_pay_online: boolean;
  contact: { phone: string | null; phone_international: string | null; whatsapp: string | null; facebook_url: string | null; email: string | null };
}

export interface MemberStatus extends CardStatus {
  has_card: boolean;
  membership_number: string | null;
  slug: string | null;
  progress: { overall: { filled: number; total: number; percent: number; missing: string[]; complete: boolean } };
  relatives: { count: number; pending: number; max: number; degree: string; must_contact_support: boolean; can_add: boolean };
  open_subscription: { id: number; method: string; amount: number; created_at: string } | null;
}

export type PayMethod = 'paymob' | 'cash_on_delivery' | 'vodafone_cash' | 'instapay';

/** The signed-in member's own card state. Never cached: it changes the moment a payment lands. */
export const fetchMembership = (token: string) => apiGetAuth<{ data: MemberStatus }>('/membership', token).then((r) => r.data);

/**
 * Asks for the free trial card (a name and a national ID; the phone is the one signed in with).
 * Throws `ApiError` (422) whose `reason` is `national_id_taken`, `phone_taken` or `already_has_card`.
 */
export const startTrial = (token: string, body: { name: string; national_id: string; gender?: 'male' | 'female' }) =>
  apiPost<{ data: MemberStatus }>('/membership/trial', body, undefined, token).then((r) => r.data);

/** Pays for the card. Paymob answers with a `checkout_url`; the other methods reach customer services (receipts are files). */
export function subscribe(token: string, body: { method: PayMethod; email?: string; reference?: string; receipt?: File | null }) {
  const form = new FormData();
  form.append('method', body.method);
  if (body.email) form.append('email', body.email);
  if (body.reference) form.append('reference', body.reference);
  if (body.receipt) form.append('receipts[]', body.receipt);

  return apiPost<{ data: { checkout_url: string | null; client_secret: string | null; public_key: string | null; status: MemberStatus } }>('/membership/subscribe', form, undefined, token).then((r) => r.data);
}

/** "Please call me to add my relatives" — the trial member's only way to add any. */
export const requestRelatives = (token: string) => apiPost<{ data: { requested: boolean; already_open: boolean } }>('/membership/relatives-request', {}, undefined, token).then((r) => r.data);

/** Pays for a card from its scan screen, with no sign-in. Resolves to what the embedded card form needs, or null when it could not be opened. */
export const subscribeByNumber = (number: string) =>
  apiPost<{ data: { checkout_url: string | null; client_secret: string | null; public_key: string | null } }>(`/card/${encodeURIComponent(number)}/subscribe`, {})
    .then((r) => r.data)
    .catch(() => null);
