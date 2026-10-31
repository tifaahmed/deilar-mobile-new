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

  it('shows what the points are worth and the wallet balance, and nothing until the backend has told the rate', () => {
    seed(1234, undefined);
    const { container } = render(<WalletPanel signedIn />);
    expect(container.firstChild).toBeNull();
  });


  it('shows the worth in pounds and the wallet balance once the backend has told the rate', () => {
    seed(1234, money());
    render(<WalletPanel signedIn />);
    expect(screen.getByText(/123.4 جنيه/)).toBeTruthy();
    expect(screen.getByText(/رصيد المحفظة/).textContent).toContain('5 جنيه');
  });

  it('converts the pounds asked for, once per tap, and tells the result', async () => {
    seed(1000, money());
    http.apiPost.mockResolvedValueOnce({ data: { points: 500, money: undefined, points_per_egp: 10, wallet_balance: 55, wallet_enabled: true, wallet_min_egp: 10 } });
    render(<WalletPanel signedIn />);

    expect(screen.getAllByText(/100 جنيه/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText(/كام جنيه/), { target: { value: '50' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /حوّل 50 جنيه/ })); });

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('تم تحويل 50 جنيه'));
    const [path, body] = http.apiPost.mock.calls[0];
    expect(path).toBe('/loyalty/convert');
    expect(body.egp).toBe(50);
    expect(typeof body.id).toBe('string');
  });

  it('does not offer the button while the admin has converting closed, or under the minimum', () => {
    seed(1000, money({ wallet_enabled: false }));
    render(<WalletPanel signedIn />);
    expect(screen.queryByRole('button', { name: /حوّل/ })).toBeNull();
    expect(screen.getByText(/هيتفتح قريباً/)).toBeTruthy();
  });

  it('keeps the button off under the minimum', () => {
    seed(30, money());
    render(<WalletPanel signedIn />);
    expect((screen.getByRole('button', { name: /حوّل/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
