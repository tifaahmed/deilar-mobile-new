import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn() }));
vi.mock('../api/http', () => ({
  apiPost: http.apiPost,
  apiGetAuth: http.apiGetAuth,
  apiGet: http.apiGet,
  ApiError: class ApiError extends Error { constructor(m: string, readonly status: number, readonly reason?: string) { super(m); } },
}));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WalletPanel } from '../components/WalletPanel';
import { pointsToEgp } from '../utils/quizStore';
import { clearSession, updateSession } from '../utils/session';

const money = (over = {}) => ({ points_per_egp: 10, wallet_balance: 5, wallet_enabled: true, wallet_min_egp: 10, ...over });
const seed = (points: number, m: object | undefined) => localStorage.setItem('deilar_loyalty_server', JSON.stringify({ points, token: 'tok', money: m }));

describe('points as pounds and the wallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearSession();
    updateSession({ token: 'tok' });
  });

  it('turns points into pounds at the backend rate, with pennies', () => {
    expect(pointsToEgp(1234, 10)).toBe(123.4);
    expect(pointsToEgp(5, 10)).toBe(0.5);
    expect(pointsToEgp(100, 0)).toBe(0);
    expect(pointsToEgp(-50, 10)).toBe(0);
  });

  it('draws nothing until the backend has told the rate', () => {
    seed(1234, undefined);
    const { container } = render(<WalletPanel signedIn />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the wallet balance only: no top-up with money and no points → wallet conversion (both closed on 2026-11-09)', () => {
    seed(1234, money({ wallet_enabled: true }));
    render(<WalletPanel signedIn />);
    expect(screen.getByText(/رصيد المحفظة/).textContent).toContain('5 جنيه');
    expect(screen.queryByTestId('wallet-topup')).toBeNull();
    expect(screen.queryByRole('button', { name: /حوّل/ })).toBeNull();
    expect(screen.queryByLabelText(/كام جنيه/)).toBeNull();
    expect(http.apiPost).not.toHaveBeenCalled();
  });
});
