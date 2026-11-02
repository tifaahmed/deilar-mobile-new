import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn() }));
vi.mock('../api/http', () => ({
  apiPost: http.apiPost, apiGetAuth: http.apiGetAuth, apiGet: http.apiGet, setApiLanguage: vi.fn(),
  ApiError: class ApiError extends Error { constructor(m: string, readonly status: number, readonly reason?: string) { super(m); } },
}));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { render, screen, waitFor, within } from '@testing-library/react';
import { WalletScreen } from '../components/WalletScreen';
import { walletSourceLabel } from '../api/wallet';
import { parseRoute, routeHref } from '../router';
import { clearSession, updateSession } from '../utils/session';

const seed = (balance: number) => localStorage.setItem('deilar_loyalty_server', JSON.stringify({
  points: 500, token: 'tok', money: { points_per_egp: 100, wallet_balance: balance, wallet_enabled: true, wallet_min_egp: 20, wallet_min_topup: 20 },
}));

const wallet = {
  balance: 47.5,
  entries: [
    { id: 4, source: 'admin', amount: 10, points: null, note: 'admin: Goodwill after a late order', at: '2026-10-31T10:00:00Z' },
    { id: 3, source: 'transfer', amount: -20, points: null, note: 'transfer to #9', at: '2026-10-30T10:00:00Z' },
    { id: 2, source: 'order', amount: -30, points: null, note: null, at: '2026-10-29T10:00:00Z' },
    { id: 1, source: 'topup', amount: 87.5, points: null, note: null, at: '2026-10-28T10:00:00Z' },
  ],
};
const transfers = { enabled: true, transfers: [
  { id: 1, direction: 'out', kind: 'wallet', amount: 20, status: 'accepted', other: 'Mona ••78', note: null, expires_at: null, at: '2026-10-30T10:00:00Z' },
  { id: 2, direction: 'in', kind: 'points', amount: 300, status: 'declined', other: 'Ali ••12', note: null, expires_at: null, at: '2026-10-27T10:00:00Z' },
] };

describe('«محفظتي»', () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear(); clearSession();
    http.apiGetAuth.mockImplementation(async (path: string) => {
      if (path === '/wallet') return { data: wallet };
      if (path === '/transfers') return { data: transfers };
      return { data: { points: 500, entries: [] } };
    });
  });

  it('shows the balance and every line that moved the wallet, in words the member understands', async () => {
    updateSession({ token: 'tok' });
    seed(47.5);
    render(<WalletScreen />);

    expect(screen.getByTestId('wallet-balance').textContent).toContain('47.5');
    const list = await screen.findByTestId('wallet-entries');
    await waitFor(() => expect(within(list).getByText('شحن المحفظة')).toBeTruthy());
    expect(within(list).getByText('دفع جزء من طلب')).toBeTruthy();
    expect(within(list).getByText('تحويل إلى عضو')).toBeTruthy();
    expect(within(list).getByText('إضافة من الإدارة')).toBeTruthy();
    // The admin's reason is shown, without the internal "admin:" prefix; a transfer's "#9" never reaches the member.
    expect(within(list).getByText('Goodwill after a late order')).toBeTruthy();
    expect(list.textContent).not.toContain('#9');
    expect(list.textContent).toContain('-20');
    expect(list.textContent).toContain('+87.5');
  });

  it('lists finished transfers too, with who and how it ended', async () => {
    updateSession({ token: 'tok' });
    seed(47.5);
    render(<WalletScreen />);
    const history = await screen.findByTestId('transfer-history');
    expect(history.textContent).toContain('Mona ••78');
    expect(history.textContent).toContain('تم');
    expect(history.textContent).toContain('Ali ••12');
    expect(history.textContent).toContain('مرفوض');
  });

  it('asks a signed-out visitor to sign in instead of showing a wallet', () => {
    render(<WalletScreen />);
    expect(screen.getByText(/سجّل الدخول/)).toBeTruthy();
    expect(screen.queryByTestId('wallet-balance')).toBeNull();
    expect(http.apiGetAuth).not.toHaveBeenCalled();
  });

  it('says so when the wallet has no lines yet', async () => {
    updateSession({ token: 'tok' });
    seed(0);
    http.apiGetAuth.mockImplementation(async (path: string) => ({ data: path === '/wallet' ? { balance: 0, entries: [] } : { enabled: false, transfers: [] } }));
    render(<WalletScreen />);
    expect(await screen.findByText('لا توجد حركات على محفظتك بعد.')).toBeTruthy();
  });
});

describe('the wallet page and its labels', () => {
  it('opens at /account/wallet from the account tab', () => {
    const route = parseRoute('/account/wallet', '');
    expect(route.section).toBe('wallet');
    expect(route.tab).toBe('profile');
    expect(routeHref({ tab: 'profile', section: 'wallet' })).toBe('/account/wallet');
  });

  it('labels each kind of line and tells in from out for transfers and admin changes', () => {
    expect(walletSourceLabel('points', 5)).toBe('تحويل من النقاط');
    expect(walletSourceLabel('refund', 12)).toBe('استرداد إلى المحفظة');
    expect(walletSourceLabel('membership', -600)).toBe('دفع اشتراك الكارت');
    expect(walletSourceLabel('transfer', 5)).toBe('تحويل من عضو');
    expect(walletSourceLabel('admin', -5)).toBe('خصم من الإدارة');
    expect(walletSourceLabel('something-new', 1)).toBe('حركة على المحفظة');
  });
});
