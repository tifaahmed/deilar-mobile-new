import type { CartItem, Product } from '../types';

/**
 * Loyalty-points caps, as the backend sets them (`loyalty_points_max_per_order`, `loyalty_points_max_per_product`, a product's own
 * `points_max`). The backend decides at checkout; these only mirror its rule so the basket can show the same figure.
 */

/** Pounds a product's cap allows (all units of it in one order); Infinity when it has no cap or the rate is unknown. */
export function productCapEgp(product: Pick<Product, 'pointsMax'>, pointsPerEgp: number): number {
  return product.pointsMax != null && product.pointsMax > 0 && pointsPerEgp > 0 ? product.pointsMax / pointsPerEgp : Infinity;
}

/** The part of the basket (in pounds) that points may discount after the product caps and the order cap. */
export function pointsEligibleEgp(cart: CartItem[], pointsPerEgp: number, maxPerOrder?: number | null): number {
  const sum = cart.reduce((total, item) => {
    if (!item.product.pointsPayable) return total;
    return total + Math.min(item.product.price * item.quantity, productCapEgp(item.product, pointsPerEgp));
  }, 0);
  return maxPerOrder != null && maxPerOrder > 0 && pointsPerEgp > 0 ? Math.min(sum, maxPerOrder / pointsPerEgp) : sum;
}
