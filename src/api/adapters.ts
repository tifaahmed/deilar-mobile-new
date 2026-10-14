import type { ProductCard } from './types';
import type { Product } from '../types';

/** The slim shape the cart holds, from a product card. */
export function toCartProduct(card: ProductCard): Product {
  const price = card.price ?? 0;

  return {
    id: String(card.id),
    slug: card.slug,
    name: card.name,
    image: card.image,
    price,
    originalPrice: card.old_price ?? price,
    storeName: card.store?.title,
  };
}

/** Egyptian mobile numbers to the international form wa.me expects. */
export function whatsappNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return `2${digits}`;
  return digits;
}

export function directionsUrl(lat: number | null | undefined, lng: number | null | undefined, fallback?: string | null): string | null {
  if (lat != null && lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  return fallback ?? null;
}

/** "1.2 km" / "350 m". */
export function formatKm(km: number | null | undefined, isAr: boolean): string | null {
  if (km == null) return null;
  if (km < 1) return `${Math.round(km * 1000)} ${isAr ? 'م' : 'm'}`;
  return `${km.toFixed(1)} ${isAr ? 'كم' : 'km'}`;
}

/** Rounds a coordinate so nearby positions share one cacheable URL (~110 m at 3 dp, ~1.1 km at 2 dp). */
export const roundCoord = (value: number, decimals = 3): number => Number(value.toFixed(decimals));
