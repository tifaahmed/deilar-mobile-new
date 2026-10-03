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
 * 1. Medical Providers: Categorized into 6 core facility types (hospitals, labs, pharmacies, clinics, radiology, dental_optical).
 * 2. Specialty Stores: Categorized into gourmet/health stores (coffee, honey, oil, organic).
 * 3. Products: Belong to stores via `storeId` and `storeName`. If adding new products, ensure storeId links to a valid Store.
 * 4. Beneficiaries: Family members under the primary subscriber card.
 * 5. Cart: Transient in-memory cart with quantities for the checkout flow.
 * ==============================================================================
 */

/** 
 * 6 Primary Medical Facility Categories in the network
 */
export type ProviderCategory = 
  | 'all' 
  | 'hospitals'      // المستشفيات والمراكز الجراحية
  | 'labs'           // معامل التحاليل الطبية
  | 'pharmacies'     // الصيدليات ومستحضرات العلاج
  | 'clinics'        // عيادات الأطباء والاستشاريين
  | 'radiology'      // مراكز الأشعة والتصوير الطبي
  | 'dental_optical';// مراكز الأسنان والعيون والبصريات

/**
 * Individual medical service item with discount breakdown
 */
export interface MedicalService {
  name: string;
  originalPrice: number;
  discountedPrice: number;
  unit?: string;
}

/**
 * Medical Facility / Doctor / Lab Provider Model
 */
export interface MedicalProvider {
  id: string;
  name: string;
  nameEn: string;
  category: 'hospitals' | 'labs' | 'pharmacies' | 'clinics' | 'radiology' | 'dental_optical';
  categoryAr: string;
  specialty: string;
  discount: string;               // e.g. "خصم 45% على كافة التحاليل"
  discountPercentage: number;     // numeric percentage for sorting & filtering
  address: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  whatsapp?: string;
  rating: number;
  reviewsCount: number;
  is24h: boolean;
  popular: boolean;
  logo: string;
  imageUrl?: string;
  description: string;
  services: MedicalService[];
  features: string[];
}

/**
 * Beneficiary / Family member covered under the card
 */
export interface Beneficiary {
  id: string;
  name: string;
  relation: string;               // e.g. "حامل الكرت الرئيسي", "زوجة", "ابن"
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
 * Specialty Partner Stores (Coffee, Honey, Olive Oil, etc.)
 * Note: Stores can exist with or without catalog products online!
 * When `productsCount === 0`, in-branch discount applies.
 */
export interface Store {
  id: string;
  name: string;
  nameEn: string;
  category: 'coffee' | 'honey' | 'oil' | 'organic' | 'general';
  categoryAr: string;
  discount: string;               // e.g. "خصم 25% لحاملي كرت ديلار"
  discountPercentage: number;
  image: string;
  coverImage?: string;
  rating: number;
  reviewsCount: number;
  branches: string;
  phone: string;
  whatsapp?: string;
  description: string;
  featured?: boolean;
}

/**
 * Physical & Specialty Products (Coffee, Honey, Olive Oil, Medical Devices)
 */
export interface Product {
  id: string;
  name: string;
  nameEn: string;
  category: 'coffee' | 'honey' | 'oil' | 'cards' | 'devices' | 'packages' | 'vitamins' | 'supplies';
  categoryAr: string;
  storeId?: string;               // Links product to its parent Store (DEILAR_STORES)
  storeName?: string;
  originalPrice: number;
  price: number;                  // Discounted price for cardholders
  discountPercentage: number;
  rating: number;
  reviewsCount: number;
  image: string;
  description: string;
  features: string[];
  inStock: boolean;
  badge?: string;
  weight?: string;                // e.g. "250 جرام", "900 جرام", "1 لتر"
}

/**
 * Shopping Cart item representation
 */
export interface CartItem {
  product: Product;
  quantity: number;
}
