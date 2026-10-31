import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn() }));
vi.mock('../api/http', () => ({
  apiPost: http.apiPost, apiGetAuth: http.apiGetAuth, apiGet: http.apiGet, setApiLanguage: vi.fn(),
  ApiError: class ApiError extends Error { constructor(m: string, readonly status: number, readonly reason?: string) { super(m); } },
}));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubscribePanel } from '../components/SubscribePanel';
import { clearSession, updateSession } from '../utils/session';
import { LanguageProvider } from '../context/LanguageContext';
import { toCartProduct } from '../api/adapters';

const status = { can_pay_online: false, payment_methods: [], plans: [{ key: 'year', price: 600, months: 12 }] } as never;
const seed = (balance: number, membership = true) => localStorage.setItem('deilar_loyalty_server', JSON.stringify({
  points: 0, token: 'tok', money: { points_per_egp: 10, wallet_balance: balance, wallet_enabled: true, wallet_min_egp: 10, wallet_membership_enabled: membership },
}));

describe('wallet in the membership and the cart', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); updateSession({ token: 'tok' }); });

  it('offers the yearly membership from the wallet only when it holds the whole price', async () => {
    seed(500);
    const { unmount } = render(<LanguageProvider><SubscribePanel token="tok" status={status} onDone={() => {}} /></LanguageProvider>);
    expect(screen.queryByRole('button', { name: /من المحفظة/ })).toBeNull();
    unmount();

    seed(700);
    http.apiPost.mockResolvedValue({ data: {} });
    render(<LanguageProvider><SubscribePanel token="tok" status={status} onDone={() => {}} /></LanguageProvider>);
    fireEvent.click(screen.getByRole('button', { name: /من المحفظة/ }));
    await waitFor(() => expect(http.apiPost).toHaveBeenCalled());
    const form = http.apiPost.mock.calls[0][1] as FormData;
    expect(form.get('method')).toBe('wallet');
    expect(form.get('plan')).toBe('year');
  });

  it('carries the product flag the admin set for paying from the wallet', () => {
    const card = { id: 1, slug: 'a', name: 'A', image: '', price: 10, old_price: null, store: null, wallet_payable: true } as never;
    expect(toCartProduct(card).walletPayable).toBe(true);
  });
});
