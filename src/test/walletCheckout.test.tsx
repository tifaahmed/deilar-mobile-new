import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn() }));
vi.mock('../api/http', () => ({
  apiPost: http.apiPost, apiGetAuth: http.apiGetAuth, apiGet: http.apiGet, setApiLanguage: vi.fn(),
  ApiError: class ApiError extends Error { constructor(m: string, readonly status: number, readonly reason?: string) { super(m); } },
}));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));
vi.mock('../api/endpoints', () => ({
  fetchLocations: vi.fn().mockResolvedValue([]),
  fetchShopSettings: vi.fn().mockResolvedValue({
    wallet_number: null, delivery_price: 35, free_delivery_threshold: null, cod_fee: 0, contact: { whatsapp: '' },
    payment_methods: { cod: true, wallet: false, online_card: false, online_wallet: false },
  }),
}));
vi.mock('../api/auth', () => ({ fetchAddresses: vi.fn().mockResolvedValue([]) }));

import { render, screen } from '@testing-library/react';
import { CartCheckoutModal } from '../components/CartCheckoutModal';
import { clearSession, updateSession } from '../utils/session';
import { LanguageProvider } from '../context/LanguageContext';

const item = (id: string, price: number, walletPayable: boolean) =>
  ({ quantity: 1, product: { id, name: id, price, image: '', walletPayable } }) as never;

const seed = (balance: number) => localStorage.setItem('deilar_loyalty_server', JSON.stringify({
  points: 0, token: 'tok', money: { points_per_egp: 10, wallet_balance: balance, wallet_enabled: true, wallet_min_egp: 10 },
}));

const show = (cart: never[]) => render(
  <LanguageProvider>
    <CartCheckoutModal isOpen initialStep="cart" onClose={() => {}} cart={cart} onUpdateCartQty={() => {}} onRemoveFromCart={() => {}} onClearCart={() => {}} />
  </LanguageProvider>,
);

describe('wallet cuts the bill automatically at checkout', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); updateSession({ token: 'tok' }); });

  it('deducts only the allowed products, capped by the balance', async () => {
    seed(80);
    show([item('a', 100, true), item('b', 50, false)] as never[]);
    expect((await screen.findByTestId('wallet-line-cart')).textContent).toContain('-80');
  });

  it('shows no wallet line when no product is allowed or the balance is empty', async () => {
    seed(500);
    const { unmount } = show([item('a', 100, false)] as never[]);
    await screen.findAllByText(/ج\.م/);
    expect(screen.queryByTestId('wallet-line-cart')).toBeNull();
    unmount();
    seed(0);
    show([item('a', 100, true)] as never[]);
    await screen.findAllByText(/ج\.م/);
    expect(screen.queryByTestId('wallet-line-cart')).toBeNull();
  });
});
