import { api, fetchShopSettings, PATHS } from '../api/endpoints';
import { peek } from '../api/http';
import { useApi } from './useApi';
import { useLanguage } from '../context/LanguageContext';

/** Lookup lists shared across screens; the API layer caches them, so reuse costs nothing. */
function useLookup<T>(name: string, path: string, fetcher: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const { language } = useLanguage();
  return useApi<T>(enabled ? `${name}:${language}` : null, fetcher, () => peek<{ data: T }>(path)?.data);
}

export const useFacilityTypes = (enabled = true) => useLookup('facility-types', PATHS.facilityTypes, (s) => api.facilityTypes(s), enabled);
export const useGovernorates = (enabled = true) => useLookup('governorates', PATHS.governorates, (s) => api.governorates(s), enabled);
export const useStoreCategories = () => useLookup('store-categories', PATHS.storeCategories, (s) => api.storeCategories(s));
export const useProductTypes = () => useLookup('product-types', PATHS.productTypes, (s) => api.productTypes(s));

/** The shop's settings from the backend (/admin/setting there): delivery, payment details and the company's contact points. */
export const useShopSettings = () => useApi('shop-settings', (signal) => fetchShopSettings(signal));

/**
 * The company's contact points, ready to link to: `tel:` and `wa.me` forms, or null when the backend has none
 * (a blank means the channel is switched off, so the screens show no button for it).
 */
export function useContact() {
  const contact = useShopSettings().data?.contact;
  const digits = (contact?.whatsapp ?? '').replace(/\D/g, '');

  return {
    phone: contact?.phone ?? null,
    dial: contact?.phone_international ?? contact?.phone ?? null,
    whatsapp: digits === '' ? null : digits,
    facebook: contact?.facebook_url ?? null,
    email: contact?.email ?? null,
  };
}
