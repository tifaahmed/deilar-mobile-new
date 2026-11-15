import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pinsCall = vi.fn();
vi.mock('leaflet', () => {
  const chain: Record<string, unknown> = {};
  const fn = () => chain;
  Object.assign(chain, { addTo: fn, on: fn, off: fn, remove: fn, setView: fn, invalidateSize: fn, fitBounds: fn, panTo: fn, addLayer: fn, clearLayers: fn, getBounds: () => ({ contains: () => true }), getZoom: () => 12, latLngToLayerPoint: () => ({ x: 0, y: 0 }), toBounds: () => chain, bindTooltip: fn });
  const L = { map: fn, tileLayer: fn, control: { zoom: fn }, layerGroup: fn, circle: fn, marker: fn, divIcon: fn, latLng: () => chain, latLngBounds: () => chain };
  return { default: L, ...L };
});
vi.mock('leaflet/dist/leaflet.css', () => ({}));
vi.mock('../api/endpoints', () => ({
  PATHS: { stores: '/mobile/stores' },
  fetchLocations: () => Promise.resolve([]),
  fetchNearestAreas: () => Promise.resolve([]),
  api: {
    stores: () => Promise.resolve({ data: [], has_more: false }),
    storeMapPins: (p: unknown) => { pinsCall(p); return Promise.resolve({ data: [{ id: 1, lat: 30.05, lng: 31.24, name: 'بيت العسل' }], has_more: false }); },
    storePinCard: () => Promise.resolve({ id: 1, slug: 'honey', title: 'بيت العسل', logo: '', offer_from: 5, offer_to: 15, categories: [], products_count: 0, branch: { address: 'القاهرة', area: null, governorate: null, city: null, lat: 30.05, lng: 31.24, phone: '0100', whatsapp: null } }),
  },
}));
vi.mock('../hooks/useCatalog', () => ({ useStoreCategories: () => ({ data: [{ id: 7, name: 'عسل', count: 3 }] }) }));
vi.mock('../context/LanguageContext', () => ({ useLanguage: () => ({ isAr: true }), useIsAr: () => true }));

import { StoreMapView } from '../components/StoreMapView';

describe('the stores map', () => {
  it('asks for pins around the member, narrows by kind of store', async () => {
    render(<StoreMapView userLocation={{ lat: 30.05, lng: 31.24 }} onOpenStore={() => undefined} />);

    expect(await screen.findByText(/1\/1 فرع|0\/1 فرع|1\/1/)).toBeTruthy();
    expect(pinsCall.mock.calls[0][0]).toMatchObject({ radius_km: 1, category_id: null });

    // The search box and the map / list switch are gone from this page: only the kinds of store and the range remain.
    expect(screen.queryByPlaceholderText('بحث…')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'عسل' }));
    await vi.waitFor(() => expect(pinsCall.mock.calls.at(-1)?.[0]).toMatchObject({ category_id: 7 }));
  });
});
