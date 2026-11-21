import { apiGetAuth, apiPost, ApiError } from './http';
import { getSession } from '../utils/session';
import { newId } from '../utils/quizStore';

export type TransferKind = 'points' | 'wallet';
export type TransferStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

/** One request to send points or wallet money, as the backend draws it (`TransferController`). `other` is a masked name. */
export interface Transfer {
  id: number;
  direction: 'in' | 'out';
  kind: TransferKind;
  amount: number;
  /** The transfer fee kept from `amount` and what the recipient gets (the backend decides both; 0 / amount for old rows). */
  fee?: number;
  net?: number;
  status: TransferStatus;
  other: string | null;
  note: string | null;
  expires_at: string | null;
  at: string | null;
}

export type TransferResult = { ok: true } | { ok: false; reason: string };

const token = () => getSession().token;

const fail = (e: unknown): TransferResult => ({
  ok: false,
  reason: (e instanceof ApiError ? e.reason : undefined) ?? (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'failed'),
});

/** The masked name of the member behind a phone or card number, so the sender can check before asking. null = nobody. */
export async function lookupRecipient(who: { phone?: string; card?: string }): Promise<string | null> {
  const t = token();
  if (!t) return null;
  try {
    const { data } = await apiPost<{ data: { name: string } }>('/transfers/lookup', who, undefined, t);
    return data.name;
  } catch {
    return null;
  }
}

/** The member's requests, both ways, newest first, and whether the admin has transfers open. */
export async function listTransfers(): Promise<{ enabled: boolean; kinds: Record<TransferKind, boolean>; transfers: Transfer[]; fee_percent?: number }> {
  const t = token();
  const off = { enabled: false, kinds: { points: false, wallet: false }, transfers: [] as Transfer[] };
  if (!t) return off;
  try {
    const { data } = await apiGetAuth<{ data: { enabled: boolean; kinds?: Record<TransferKind, boolean>; transfers: Transfer[]; fee_percent?: number } }>('/transfers', t);
    // An older backend sends no `kinds`: both are open whenever transfers are.
    return { ...data, kinds: data.kinds ?? { points: data.enabled, wallet: data.enabled } };
  } catch {
    return off;
  }
}

/** Asks to send. Nothing moves until the other member accepts; one `id` per tap so a repeat books once. */
export async function requestTransfer(input: { phone?: string; card?: string; kind: TransferKind; amount: number; note?: string }): Promise<TransferResult> {
  const t = token();
  if (!t) return { ok: false, reason: 'signed_out' };
  try {
    await apiPost('/transfers', { ...input, id: newId() }, undefined, t);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const act = (verb: 'accept' | 'decline' | 'cancel') => async (id: number): Promise<TransferResult> => {
  const t = token();
  if (!t) return { ok: false, reason: 'signed_out' };
  try {
    await apiPost(`/transfers/${id}/${verb}`, {}, undefined, t);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
};

export const acceptTransfer = act('accept');
export const declineTransfer = act('decline');
export const cancelTransfer = act('cancel');

/**
 * What a transfer of `amount` costs, mirroring the backend (`MemberTransfers::split`) so it can be shown while typing: the recipient gets the
 * amount minus the fee (points whole, rounded down; wallet pounds with pennies). The backend's own figures replace this once the request is made.
 */
export function transferSplit(kind: TransferKind, amount: number, percent: number): { fee: number; net: number } {
  const net = kind === 'points' ? Math.floor((amount * (100 - percent)) / 100) : Math.round(((amount * (100 - percent)) / 100) * 100) / 100;
  return { net, fee: Math.round((amount - net) * 100) / 100 };
}
