import { fetchCard } from '../api/auth';
import type { ProductCard } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useSession } from './session';

/**
 * Member pricing, as the shop sells it: a card that is ACTIVE and not expired gets the discounted price,
 * everyone else — no card, an unknown number, a switched-off or expired card — pays full.
 * The server is the judge at checkout (it re-prices from the card number, same rule); this decides what is DRAWN.
 */
export function useIsMember(): boolean {
  const { cardNumber } = useSession();
  const card = useApi(cardNumber ? `member-card:${cardNumber}` : null, (signal) => fetchCard(cardNumber!, signal));

  if (!card.data?.active) return false;

  // Expired the moment its last day starts, like the server (`expiration_date->isPast()`).
  return !card.data.valid_to || new Date(`${card.data.valid_to}T00:00:00`) > new Date();
}

export interface ShownPrice {
  /** What this visitor pays. */
  price: number | null;
  /** The struck-through price, only for a member who is saving. */
  strike: number | null;
  /** For a guest: what a card would bring the price down to. */
  memberPrice: number | null;
}

export function shownPrice(card: Pick<ProductCard, 'price' | 'old_price'>, member: boolean): ShownPrice {
  const discounted = card.old_price != null;

  if (member) return { price: card.price, strike: card.old_price, memberPrice: null };

  return { price: card.old_price ?? card.price, strike: null, memberPrice: discounted ? card.price : null };
}
