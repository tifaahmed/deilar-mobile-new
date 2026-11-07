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

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WithdrawPanel } from '../components/WithdrawPanel';
import { ApiError } from '../api/http';
import { clearSession, updateSession } from '../utils/session';

const rules = (over = {}) => ({ enabled: true, min: 50, max: 2000, daily_max: 5000, auto: false, ...over });
const row = (over = {}) => ({ id: 7, amount: 100, msisdn: '0101••••678', status: 'pending', created_at: null, paid_at: null, refunded: false, ...over });
const type = (testId: string, value: string) => fireEvent.change(screen.getByTestId(testId), { target: { value } });

describe('cash out to Vodafone Cash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearSession();
    updateSession({ token: 'tok' });
  });

  it('shows nothing when the backend has not switched it on (or is unreachable)', async () => {
    http.apiGetAuth.mockResolvedValueOnce({ data: { rules: rules({ enabled: false }), withdrawals: [] } });
    const off = render(<WithdrawPanel />);
    await waitFor(() => expect(http.apiGetAuth).toHaveBeenCalled());
    expect(off.container.firstChild).toBeNull();
    off.unmount();

    http.apiGetAuth.mockRejectedValueOnce(new Error('offline'));
    const down = render(<WithdrawPanel />);
    await waitFor(() => expect(http.apiGetAuth).toHaveBeenCalledTimes(2));
    expect(down.container.firstChild).toBeNull();
  });

  it('only enables the button for an amount in range, a 010 number and a 14-digit ID, then relays them as typed', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { rules: rules(), withdrawals: [] } });
    http.apiPost.mockResolvedValue({ data: row() });
    render(<WithdrawPanel />);
    const button = (await screen.findByTestId('withdraw-submit')) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    type('withdraw-amount', '10');
    type('withdraw-msisdn', '01012345678');
    type('withdraw-nid', '29005270102927');
    expect(button.disabled).toBe(true); // below the backend's minimum

    type('withdraw-amount', '100');
    type('withdraw-msisdn', '0101234');
    expect(button.disabled).toBe(true); // number too short

    type('withdraw-msisdn', '01012345678');
    expect(button.disabled).toBe(false);
    fireEvent.click(button);

    await waitFor(() => expect(http.apiPost).toHaveBeenCalledWith('/wallet/withdrawals', { amount: 100, msisdn: '01012345678', national_id: '29005270102927' }, undefined, 'tok'));
    expect((await screen.findByRole('status')).textContent).toContain('خصم المبلغ');
  });

  it('says why the backend refused', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { rules: rules(), withdrawals: [] } });
    http.apiPost.mockRejectedValueOnce(new ApiError('no', 422, 'not_enough'));
    render(<WithdrawPanel />);
    await screen.findByTestId('withdraw-submit');
    type('withdraw-amount', '100');
    type('withdraw-msisdn', '01012345678');
    type('withdraw-nid', '29005270102927');
    fireEvent.click(screen.getByTestId('withdraw-submit'));
    expect((await screen.findByRole('status')).textContent).toContain('رصيد محفظتك لا يكفي');
  });

  it('lists the requests with their state, lets a waiting one be cancelled, and blocks a second while one is open', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { rules: rules(), withdrawals: [row(), row({ id: 6, status: 'failed', refunded: true })] } });
    http.apiPost.mockResolvedValue({ data: row({ status: 'canceled' }) });
    render(<WithdrawPanel />);

    const list = await screen.findByTestId('withdraw-list');
    expect(list.textContent).toContain('في انتظار الموافقة');
    expect(list.textContent).toContain('رجعت الفلوس');
    expect(screen.getByText(/عندك طلب شغال/)).toBeTruthy();
    type('withdraw-amount', '100');
    type('withdraw-msisdn', '01012345678');
    type('withdraw-nid', '29005270102927');
    expect((screen.getByTestId('withdraw-submit') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByTestId('withdraw-cancel-7'));
    await waitFor(() => expect(http.apiPost).toHaveBeenCalledWith('/wallet/withdrawals/7/cancel', {}, undefined, 'tok'));
  });
});
