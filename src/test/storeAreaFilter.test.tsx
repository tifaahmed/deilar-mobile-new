import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const locations = vi.hoisted(() => vi.fn());
const areas = vi.hoisted(() => vi.fn());
vi.mock('../api/endpoints', () => ({ fetchLocations: locations, api: { storeAreas: areas } }));
vi.mock('../utils/area', () => ({ useArea: () => null }));

import { StoreAreaFilter } from '../components/StoreAreaFilter';
import { LanguageProvider } from '../context/LanguageContext';

const Harness = () => {
  const [g, setG] = React.useState<number | null>(null);
  const [c, setC] = React.useState<number | null>(null);
  return <LanguageProvider><StoreAreaFilter govId={g} cityId={c} onChange={(a, b) => { setG(a); setC(b); }} /></LanguageProvider>;
};

describe('the stores area filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    locations.mockResolvedValue([
      { id: 1, name: 'القاهرة', cities: [{ id: 11, name: 'مدينة نصر' }, { id: 12, name: 'المعادي' }] },
      { id: 2, name: 'الجيزة', cities: [{ id: 21, name: 'الدقي' }] },
      { id: 3, name: 'أسوان', cities: [{ id: 31, name: 'كوم أمبو' }] },
    ]);
  });

  it('offers only governorates with a store, then only the cities with a store', async () => {
    areas.mockResolvedValue([{ id: 1, cities: [11] }, { id: 2, cities: [21] }]);
    render(<Harness />);

    expect(await screen.findByText('القاهرة')).toBeTruthy();
    expect(screen.getByText('الجيزة')).toBeTruthy();
    expect(screen.queryByText('أسوان')).toBeNull();
    expect(screen.queryByText('مدينة نصر')).toBeNull(); // no city row before a governorate is picked

    fireEvent.click(screen.getByText('القاهرة'));
    expect(await screen.findByText('مدينة نصر')).toBeTruthy();
    expect(screen.queryByText('المعادي')).toBeNull(); // a city without a store is not offered
    expect(screen.getByText('كل المدن')).toBeTruthy();
  });

  it('draws nothing when no governorate holds a store', async () => {
    areas.mockResolvedValue([]);
    const { container } = render(<Harness />);
    await waitFor(() => expect(areas).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="store-area-filter"]')).toBeNull();
  });
});
