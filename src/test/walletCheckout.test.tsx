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

const item = (id: string, price: number, pointsPayable = false) =>
  ({ quantity: 1, product: { id, name: id, price, image: '', pointsPayable } }) as never;

const seed = (balance: number, points = 0) => localStorage.setItem('deilar_loyalty_server', JSON.stringify({
  points, token: 'tok', money: { points_per_egp: 10, wallet_balance: balance, wallet_enabled: true, wallet_min_egp: 10 },
}));

const show = (cart: never[]) => render(
  <LanguageProvider>
    <CartCheckoutModal isOpen initialStep="cart" onClose={() => {}} cart={cart} onUpdateCartQty={() => {}} onRemoveFromCart={() => {}} onClearCart={() => {}} />
  </LanguageProvider>,
);

describe('wallet and loyalty points cut the bill automatically at checkout', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); updateSession({ token: 'tok' }); });

  it('the wallet pays for ANY product (ticked or not), capped by the balance', async () => {
    seed(80);
    show([item('a', 100), item('b', 50)] as never[]);
    // Nothing is taken until the buyer presses for it.
    await screen.findByTestId('wallet-toggle');
    expect(screen.queryByTestId('wallet-line-cart')).toBeNull();
    (await screen.findByTestId('wallet-toggle')).querySelector('input')!.click();
    expect((await screen.findByTestId('wallet-line-cart')).textContent).toContain('-80');
  });

  it('shows no wallet line when the balance is empty', async () => {
    seed(0);
    show([item('a', 100)] as never[]);
    await screen.findAllByText(/ج\.م/);
    expect(screen.queryByTestId('wallet-line-cart')).toBeNull();
  });

  it('points discount only products that accept them, in whole pounds, then the wallet pays the rest', async () => {
    seed(30, 1250); // 125 pounds of points at 10 per pound; only the 100 EGP product accepts them
    show([item('a', 100, true), item('b', 50)] as never[]);
    await screen.findByTestId('points-toggle');
    expect(screen.queryByTestId('points-line-cart')).toBeNull();
    (await screen.findByTestId('points-toggle')).querySelector('input')!.click();
    (await screen.findByTestId('wallet-toggle')).querySelector('input')!.click();
    expect((await screen.findByTestId('points-line-cart')).textContent).toContain('-100');
    expect((await screen.findByTestId('wallet-line-cart')).textContent).toContain('-30');
  });

  it('shows no points line when no product accepts them, and the buyer can switch points off', async () => {
    seed(0, 5000);
    const { unmount } = show([item('a', 100)] as never[]);
    await screen.findAllByText(/ج\.م/);
    expect(screen.queryByTestId('points-line-cart')).toBeNull();
    expect(screen.queryByTestId('points-toggle')).toBeNull();
    unmount();

    show([item('a', 100, true)] as never[]);
    await screen.findByTestId('points-toggle');
    expect(screen.queryByTestId('points-line-cart')).toBeNull(); // off until pressed
    (await screen.findByTestId('points-toggle')).querySelector('input')!.click();
    expect(await screen.findByTestId('points-line-cart')).toBeTruthy();
    (await screen.findByTestId('points-toggle')).querySelector('input')!.click();
    await screen.findAllByText(/ج\.م/);
    expect(screen.queryByTestId('points-line-cart')).toBeNull();
  });
});
