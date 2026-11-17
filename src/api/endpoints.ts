import { apiGet, Params } from './http';
import type {
  BranchPage,
  FacilityCard,
  FacilityDetail,
  FacilityType,
  MapPin,
  Named,
  Paged,
  ProductCard,
  ProductDetail,
  StoreCard,
  StorePin,
  StoreDetail,
} from './types';

/** Lookups change rarely — hold them for ten minutes in memory. */
const LOOKUP_TTL = 10 * 60_000;
/** The home page's data is kept on the phone for a day, so opening the app does not call the server again and again. */
export const HOME_TTL = 24 * 60 * 60_000;

export const PATHS = {
  facilityTypes: '/mobile/facility-types',
  governorates: '/mobile/governorates',
  facilities: '/mobile/facilities',
  stores: '/mobile/stores',
  storeCategories: '/mobile/store-categories',
  storeAreas: '/mobile/store-areas',
  products: '/mobile/products',
  productTypes: '/mobile/product-types',
  mapPins: '/mobile/map-pins',
  storeMapPins: '/mobile/store-map-pins',
} as const;

export const api = {
  facilityTypes: (signal?: AbortSignal) =>
    apiGet<{ data: FacilityType[] }>(PATHS.facilityTypes, {}, { signal, ttl: HOME_TTL, persist: true }).then((r) => r.data),

  governorates: (signal?: AbortSignal) =>
    apiGet<{ data: Named[] }>(PATHS.governorates, {}, { signal, ttl: LOOKUP_TTL, persist: true }).then((r) => r.data),

  storeCategories: (signal?: AbortSignal) =>
    apiGet<{ data: (Named & { count: number })[] }>(PATHS.storeCategories, {}, { signal, ttl: HOME_TTL, persist: true }).then((r) => r.data),

  productTypes: (signal?: AbortSignal) =>
    apiGet<{ data: (Named & { slug: string; count: number })[] }>(PATHS.productTypes, {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.data),

  /** `persist`: keep the answer on the device, so the next visit paints from it at once (the home page's nearest list). */
  facilities: (params: Params, signal?: AbortSignal, persist = false) => apiGet<Paged<FacilityCard>>(PATHS.facilities, params, { signal, persist }),
  facility: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<FacilityDetail>(`${PATHS.facilities}/${encodeURIComponent(slug)}`, params, { signal }),
  facilityBranches: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<BranchPage>(`${PATHS.facilities}/${encodeURIComponent(slug)}/branches`, params, { signal }),

  /** One map pin's popup card. */
  branchCard: (id: number, signal?: AbortSignal) => apiGet<FacilityCard>(`/mobile/branches/${id}`, {}, { signal }),

  /** Governorates and cities that hold at least one store (ids only): the area buttons show nothing else. */
  storeAreas: (signal?: AbortSignal) => apiGet<{ data: { id: number; cities: number[] }[] }>(PATHS.storeAreas, {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.data),
  stores: (params: Params, signal?: AbortSignal) => apiGet<Paged<StoreCard>>(PATHS.stores, params, { signal }),
  store: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<StoreDetail>(`${PATHS.stores}/${encodeURIComponent(slug)}`, params, { signal }),

  storeBranches: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<BranchPage>(`${PATHS.stores}/${encodeURIComponent(slug)}/branches`, params, { signal }),

  products: (params: Params, signal?: AbortSignal) => apiGet<Paged<ProductCard>>(PATHS.products, params, { signal }),
  product: (slug: string, signal?: AbortSignal) =>
    apiGet<ProductDetail>(`${PATHS.products}/${encodeURIComponent(slug)}`, {}, { signal }),

  mapPins: (params: Params, signal?: AbortSignal) => apiGet<Paged<MapPin>>(PATHS.mapPins, params, { signal }),
  /** The stores map: light pins (one per store branch with a position), and the popup of one pin. */
  storeMapPins: (params: Params, signal?: AbortSignal) => apiGet<Paged<MapPin>>(PATHS.storeMapPins, params, { signal }),
  storePinCard: (id: number, signal?: AbortSignal) => apiGet<StorePin>(`${PATHS.storeMapPins}/${id}`, {}, { signal }),
};

/** One typed phrase answered across the whole directory, grouped by kind (the website's suggestion box). */
export interface SearchGroup {
  type: 'facility' | 'branch' | 'city' | 'governorate' | 'facility_type';
  total: number;
  items: {
    id: number;
    name: string;
    slug?: string;
    logo?: string | null;
    discount_percent?: number | null;
    type_name?: string | null;
    address?: string | null;
    city?: string | null;
    governorate?: string | null;
    facility_id?: number;
    facility_name?: string | null;
    facility_slug?: string | null;
    facility_count?: number;
  }[];
}
export const searchDirectory = (q: string, signal?: AbortSignal) =>
  apiGet<{ query: string; groups: SearchGroup[] }>('/facilities/search', { q, per_group: 4 }, { signal }).then((r) => r.groups);

export interface Locations {
  governorates: { id: number; name: string; cities: Named[] }[];
}

/** Every governorate with its cities — one small, rarely-changing response. */
export const fetchLocations = (signal?: AbortSignal) =>
  apiGet<Locations>('/locations', {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.governorates);

/** Ids of the governorates/cities whose borders lie closest to a point (0 km = the point is inside). */
export const fetchNearestAreas = (level: 'governorate' | 'city', lat: number, lng: number, limit: number, signal?: AbortSignal, governorateId?: number) =>
  apiGet<{ borders: { id: number; distance_km: number }[] }>('/locations/nearest-borders', { level, lat, lng, limit, governorate_id: governorateId, geometry: 0 }, { signal, ttl: LOOKUP_TTL }).then((r) =>
    r.borders.map(({ id, distance_km }) => ({ id, distance_km })),
  );

/** «Did you mean»: the stores whose names are closest to what was typed (no exact match needed). */
export interface StoreSuggestion { id: number; slug: string; title: string; logo: string | null; category: string | null }
export const suggestStores = (q: string, signal?: AbortSignal) => apiGet<{ data: StoreSuggestion[] }>('/mobile/store-suggest', { q }, { signal, ttl: 5 * 60_000 }).then((r) => r.data);

/** The home page's six strips (twelve cards each) from the server's daily saved copy — one cheap request. */
export interface HomeShelves {
  shelves: Record<'store_visits' | 'store_discount' | 'store_newest' | 'medical_visits' | 'medical_discount' | 'medical_newest', (StoreCard | FacilityCard)[]>;
}
export const fetchHomeShelves = (signal?: AbortSignal) => apiGet<HomeShelves>('/mobile/home-shelves', {}, { signal, ttl: HOME_TTL, persist: true }).then((r) => r.shelves);

export interface ShopSettings {
  /** What delivery costs the buyer — the website's own shop setting. */
  delivery_price: number;
  /** Extra fee added to a pay-on-delivery order (admin setting). 0 = none — show nothing. */
  cod_fee: number;
  /** Whether online card/wallet payment (Paymob) is set up on the backend. */
  paymob_enabled: boolean;
  /** Which ways of paying the admin shows (/admin/setting): draw exactly these. `online` = Paymob card + wallets. */
  payment_methods: { online: boolean; online_card: boolean; online_wallet: boolean; cod: boolean; wallet: boolean; instapay: boolean };
  /** A basket at or above this ships free; null = never free. */
  free_delivery_threshold: number | null;
  /** The phone a wallet transfer goes to (the shop's setting); null when none is set. */
  wallet_number: string | null;
  /** The company's contact points (edited in the backend's settings). */
  contact: { phone: string | null; phone_international: string | null; whatsapp: string | null; facebook_url: string | null; email: string | null };
}

export const fetchShopSettings = (signal?: AbortSignal) => apiGet<{ data: ShopSettings }>('/mobile/shop', {}, { signal, ttl: 60_000 }).then((r) => r.data);
