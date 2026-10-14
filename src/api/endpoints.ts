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
  StoreDetail,
} from './types';

/** Lookups change rarely — hold them for ten minutes in memory. */
const LOOKUP_TTL = 10 * 60_000;

export const PATHS = {
  facilityTypes: '/mobile/facility-types',
  governorates: '/mobile/governorates',
  facilities: '/mobile/facilities',
  stores: '/mobile/stores',
  storeCategories: '/mobile/store-categories',
  products: '/mobile/products',
  productTypes: '/mobile/product-types',
  mapPins: '/mobile/map-pins',
} as const;

export const api = {
  facilityTypes: (signal?: AbortSignal) =>
    apiGet<{ data: FacilityType[] }>(PATHS.facilityTypes, {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.data),

  governorates: (signal?: AbortSignal) =>
    apiGet<{ data: Named[] }>(PATHS.governorates, {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.data),

  storeCategories: (signal?: AbortSignal) =>
    apiGet<{ data: (Named & { count: number })[] }>(PATHS.storeCategories, {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.data),

  productTypes: (signal?: AbortSignal) =>
    apiGet<{ data: (Named & { slug: string; count: number })[] }>(PATHS.productTypes, {}, { signal, ttl: LOOKUP_TTL }).then((r) => r.data),

  facilities: (params: Params, signal?: AbortSignal) => apiGet<Paged<FacilityCard>>(PATHS.facilities, params, { signal }),
  facility: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<FacilityDetail>(`${PATHS.facilities}/${encodeURIComponent(slug)}`, params, { signal }),
  facilityBranches: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<BranchPage>(`${PATHS.facilities}/${encodeURIComponent(slug)}/branches`, params, { signal }),

  /** One map pin's popup card. */
  branchCard: (id: number, signal?: AbortSignal) => apiGet<FacilityCard>(`/mobile/branches/${id}`, {}, { signal }),

  stores: (params: Params, signal?: AbortSignal) => apiGet<Paged<StoreCard>>(PATHS.stores, params, { signal }),
  store: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<StoreDetail>(`${PATHS.stores}/${encodeURIComponent(slug)}`, params, { signal }),

  storeBranches: (slug: string, params: Params, signal?: AbortSignal) =>
    apiGet<BranchPage>(`${PATHS.stores}/${encodeURIComponent(slug)}/branches`, params, { signal }),

  products: (params: Params, signal?: AbortSignal) => apiGet<Paged<ProductCard>>(PATHS.products, params, { signal }),
  product: (slug: string, signal?: AbortSignal) =>
    apiGet<ProductDetail>(`${PATHS.products}/${encodeURIComponent(slug)}`, {}, { signal }),

  mapPins: (params: Params, signal?: AbortSignal) => apiGet<Paged<MapPin>>(PATHS.mapPins, params, { signal }),
};

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

export interface ShopSettings {
  /** What delivery costs the buyer — the website's own shop setting. */
  delivery_price: number;
  /** A basket at or above this ships free; null = never free. */
  free_delivery_threshold: number | null;
  /** The phone a wallet transfer goes to (the shop's setting); null when none is set. */
  wallet_number: string | null;
  /** The company's contact points (edited in the backend's settings). */
  contact: { phone: string | null; phone_international: string | null; whatsapp: string | null; facebook_url: string | null; email: string | null };
}

export const fetchShopSettings = (signal?: AbortSignal) => apiGet<{ data: ShopSettings }>('/mobile/shop', {}, { signal, ttl: 60_000 }).then((r) => r.data);
