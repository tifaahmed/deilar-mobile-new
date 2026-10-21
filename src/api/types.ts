/**
 * Response shapes of the lean `/api/v1/mobile/*` endpoints
 * (ibusiness_medical: app/Http/Controllers/Api/V1/Mobile).
 * Each shape is exactly what one screen draws — nothing is fetched "just in case".
 */

export interface Paged<T> {
  data: T[];
  has_more: boolean;
}

export interface Place {
  governorate: string | null;
  city: string | null;
  address: string | null;
  /** The free-text neighbourhood the admin typed on the branch. Absent on an older backend. */
  area?: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  whatsapp: string | null;
}

export interface FacilityType {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface Named {
  id: number;
  name: string;
}

/** A facility as a list card shows it, led by its nearest/relevant branch. */
export interface FacilityCard {
  id: number;
  slug: string;
  name: string;
  logo: string;
  discount: number | null;
  type: Named | null;
  distance_km: number | null;
  branch: Place | null;
}

export interface BranchRow extends Place {
  id: number;
  name: string | null;
  distance_km: number | null;
  /** Only present for a branch with no coordinates. */
  maps_url: string | null;
}

export interface BranchPage {
  branches: BranchRow[];
  has_more: boolean;
}

export interface FacilityDetail extends BranchPage {
  id: number;
  slug: string;
  name: string;
  description: string;
  logo: string;
  image: string;
  discount: number | null;
  type: Named | null;
  tags: { name: string; color: string | null }[];
}

export interface StoreCard {
  id: number;
  slug: string;
  title: string;
  logo: string;
  offer_from: number | null;
  offer_to: number | null;
  categories: Named[];
  products_count: number;
  branches_count: number;
  /** Sold online only; the API may leave it out, then no branch at all means the same. */
  online_only?: boolean;
  distance_km: number | null;
  branch: Place | null;
}

export interface StoreDetail extends BranchPage {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  description: string;
  logo: string;
  cover: string | null;
  gallery: string[];
  /** Videos from the gallery (mp4 and the like). Absent on a backend older than this field. */
  videos?: string[];
  offer_from: number | null;
  offer_to: number | null;
  online_only: boolean;
  categories: Named[];
  websites: string[];
  social_links: { platform: string; url: string }[];
  coupons: { code: string; title: string | null }[];
  ships: boolean;
  ships_everywhere: boolean;
  youtube_link: string | null;
  app_store_url: string | null;
  google_play_url: string | null;
}

export interface ProductCard {
  id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  price: number | null;
  old_price: number | null;
  discount: number | null;
  image: string;
  type: Named | null;
  store: { id: number; slug: string; title: string } | null;
  purchasable: boolean;
}

export interface ProductDetail extends ProductCard {
  description: string;
  gallery: string[];
}

/** A pin on the map: position and a label, nothing else (the popup is fetched on tap). */
export interface MapPin {
  id: number;
  lat: number;
  lng: number;
  name: string;
}
