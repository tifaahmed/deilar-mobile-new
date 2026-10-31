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
export async function listTransfers(): Promise<{ enabled: boolean; transfers: Transfer[] }> {
  const t = token();
  if (!t) return { enabled: false, transfers: [] };
  try {
    const { data } = await apiGetAuth<{ data: { enabled: boolean; transfers: Transfer[] } }>('/transfers', t);
    return data;
  } catch {
    return { enabled: false, transfers: [] };
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
