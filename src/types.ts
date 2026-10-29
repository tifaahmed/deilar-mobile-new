/**
 * ==============================================================================
 * 📌 DEILAR APPLICATION CORE DATA TYPES & CONTRACTS
 * ==============================================================================
 * 
 * 🤖 AI / CLAUDE DEVELOPER GUIDE:
 * This file serves as the single source of truth for all data models in the Deilar
 * Health & Specialty Network application.
 * 
 * When modifying or extending features:
 * 1. Facilities, stores and products come from the API — their shapes live in `src/api/types.ts`.
 * 2. `Product` below is the slim shape the CART holds (built from an API product card).
 * 3. Beneficiaries: Family members under the primary subscriber card.
 * 4. Cart: Transient in-memory cart with quantities for the checkout flow.
 * ==============================================================================
 */

/**
 * Beneficiary / Family member covered under the card
 */
export interface Beneficiary {
  id: string;
  name: string;
  relation: string;               // e.g. "حامل الكارت الرئيسي", "زوجة", "ابن"
  nationalId: string;
  dob: string;
  cardNumber: string;             // Format: MEM-1000, MEM-1001, etc.
  status: 'active' | 'pending';
}

/**
 * Historical record of card usage at a healthcare provider
 */
export interface UsageRecord {
  id: string;
  providerName: string;
  category: string;
  serviceName: string;
  date: string;
  originalAmount: number;
  paidAmount: number;
  savedAmount: number;
  receiptNumber: string;
}

/**
 * Deilar Medical Subscription Membership Tier
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  nameEn: string;
  pricePerYear: number;
  discountUpTo: string;
  maxBeneficiaries: number;
  badge?: string;
  features: string[];
  popular?: boolean;
}

/**
 * A product as the cart and checkout hold it — built from an API product card
 * (`toCartProduct`). Only what the cart draws and prices.
 */
export interface Product {
  id: string;                     // API product id, as a string
  slug: string;
  name: string;
  image: string;
  price: number;                  // What the buyer pays
  originalPrice: number;          // Struck-through price; equals `price` when not discounted
  storeName?: string;
}

/**
 * Shopping Cart item representation
 */
export interface CartItem {
  product: Product;
  quantity: number;
}
