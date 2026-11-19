import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn() }));
vi.mock('../api/http', () => ({
  apiPost: http.apiPost, apiGetAuth: http.apiGetAuth, apiGet: http.apiGet, setApiLanguage: vi.fn(),
  buildUrl: (p: string) => p,
  ApiError: class ApiError extends Error { constructor(m: string, readonly status: number, readonly reason?: string) { super(m); } },
}));
const report = vi.hoisted(() => vi.fn());
vi.mock('../utils/reportError', () => ({ reportClientError: report }));
vi.mock('../api/endpoints', () => ({
  fetchLocations: vi.fn().mockResolvedValue([]),
  fetchShopSettings: vi.fn().mockResolvedValue({
    wallet_number: null, delivery_price: 35, free_delivery_threshold: null, cod_fee: 0, contact: { whatsapp: '' },
    payment_methods: { cod: true, wallet: false, online_card: false, online_wallet: false },
  }),
}));
vi.mock('../api/auth', () => ({ fetchAddresses: vi.fn().mockResolvedValue([]) }));

import { render, screen, waitFor } from '@testing-library/react';
import { CartCheckoutModal } from '../components/CartCheckoutModal';
import { invoiceLink, quoteOrder } from '../api/orders';
import { clearSession } from '../utils/session';
import { LanguageProvider } from '../context/LanguageContext';

const item = (slug: string, price: number) => ({ quantity: 1, product: { id: slug, slug, name: slug, price, image: '' } }) as never;
const show = () => render(
  <LanguageProvider>
    <CartCheckoutModal isOpen initialStep="cart" onClose={() => {}} cart={[item('a', 100), item('b', 50)] as never[]} onUpdateCartQty={() => {}} onRemoveFromCart={() => {}} onClearCart={() => {}} />
  </LanguageProvider>,
);

describe('multi-store shipping in the cart', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); });

  it('draws one shipping line per parcel from the server quote', async () => {
    http.apiPost.mockResolvedValue({ data: { goods_total: 150, delivery_total: 80, shipments: [
      { store_ids: [1], name: 'Store A', subtotal: 100, delivery_price: 35, free_delivery_threshold: 200, free: false, remaining_for_free: 100 },
      { store_ids: [2], name: 'Store B', subtotal: 50, delivery_price: 45, free_delivery_threshold: null, free: false, remaining_for_free: null },
    ] } });
    show();
    const lines = await screen.findByTestId('parcel-lines');
    expect(lines.textContent).toContain('Store A');
    expect(lines.textContent).toContain('Store B');
    expect(lines.textContent).toContain('80');
    expect(http.apiPost.mock.calls[0][0]).toBe('/mobile/orders/quote');
  });

  it('falls back silently to the estimate when the quote fails, and reports it', async () => {
    http.apiPost.mockRejectedValue(new Error('down'));
    show();
    await waitFor(() => expect(report).toHaveBeenCalled());
    expect(screen.queryByTestId('parcel-lines')).toBeNull();
  });

  it('quoteOrder and invoiceLink', async () => {
    http.apiPost.mockResolvedValue({ data: { goods_total: 1, delivery_total: 0, shipments: [] } });
    await quoteOrder([{ slug: 'a', quantity: 1 }], { governorate: ' الجيزة ' });
    expect(http.apiPost.mock.calls[0][1]).toMatchObject({ customer_governorate: 'الجيزة', membership_number: null });
    expect(invoiceLink('https://x/invoice/CODE/3', true)).toBe('https://x/invoice/CODE/3?lang=ar');
    expect(invoiceLink('https://x/invoice/CODE?a=1', false)).toBe('https://x/invoice/CODE?a=1&lang=en');
  });
});
