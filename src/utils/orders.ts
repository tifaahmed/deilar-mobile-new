import { useSyncExternalStore } from 'react';
import type { OrderDetail } from '../api/orders';

/**
 * The orders placed from this device, kept on the device — the same idea as the website's tracking list.
 *
 * There is no login requirement to shop: the order CODE is the key to an order, so the app keeps a small
 * snapshot of each order it has placed or opened (what it was, what it cost, where it had got to) and the
 * Orders screen draws from that. Signing in adds the member's own list from the server on top, and hands
 * these guest orders to the member (`claimOrders`). Clearing the app's data loses the list, never the orders.
 */
export interface StoredOrder {
  code: string;
  savedAt: string;
  placedAt: string | null;
  total: number;
  itemCount: number;
  summary: string;
  image: string | null;
  paymentStatus?: string;
  paymentValue?: string;
  deliveryStatus?: string;
  deliveryValue?: string;
}

const KEY = 'deilar_orders_v1';
const MAX = 25;

const listeners = new Set<() => void>();
let cache: { raw: string | null; value: StoredOrder[] } | null = null;

const valid = (o: unknown): o is StoredOrder =>
  typeof o === 'object' && o !== null && typeof (o as StoredOrder).code === 'string' && /^[A-Z0-9-]{3,32}$/.test((o as StoredOrder).code) && typeof (o as StoredOrder).total === 'number';

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function storedOrders(): StoredOrder[] {
  const raw = readRaw();
  if (cache?.raw === raw) return cache.value;

  let value: StoredOrder[] = [];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter(valid) : [];
  } catch {
    /* corrupt entry: start clean */
  }
  cache = { raw, value };
  return value;
}

function write(orders: StoredOrder[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders.slice(0, MAX)));
  } catch {
    /* storage unavailable: the list lasts until reload */
  }
  listeners.forEach((l) => l());
}

/** Keeps (or refreshes) a snapshot, newest first. */
export function rememberOrder(snapshot: Omit<StoredOrder, 'savedAt'>) {
  write([{ ...snapshot, savedAt: new Date().toISOString() }, ...storedOrders().filter((o) => o.code !== snapshot.code)]);
}

export const snapshotOf = (order: OrderDetail): Omit<StoredOrder, 'savedAt'> => ({
  code: order.order_code,
  placedAt: order.placed_at,
  total: order.total_amount,
  itemCount: order.items.reduce((sum, line) => sum + line.quantity, 0),
  summary: order.items[0]?.name ?? '',
  image: order.items[0]?.image ?? null,
  paymentStatus: order.payment_status.label,
  paymentValue: order.payment_status.value,
  deliveryStatus: order.delivery_status.label,
  deliveryValue: order.delivery_status.value,
});

export const useStoredOrders = (): StoredOrder[] =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      window.addEventListener('storage', cb);
      return () => {
        listeners.delete(cb);
        window.removeEventListener('storage', cb);
      };
    },
    storedOrders,
  );
