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
import { ReferralCodeEntry } from '../components/ReferralCodeEntry';
import { ApiError } from '../api/http';
import { clearSession, updateSession } from '../utils/session';

const info = (brought_by: unknown = null) => ({ data: { enabled: true, code: '111111', link: null, amounts: { trial_bonus: 10, commission_percent: 10, discount: 100 }, totals: {}, referrals: [], brought_by } });
const latin = (t: string | null) => (t ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

describe('referral code entry in the profile', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); updateSession({ token: 'tok' }); });

  it('previews, asks for confirmation with the card number and name, then claims and draws the per-plan discount', async () => {
    http.apiGetAuth.mockResolvedValue(info());
    http.apiPost.mockResolvedValueOnce({ data: { number: '222222', name: 'Mona', discounts: { month: 25, half: 50, year: 100 }, discount: 100 } });
    render(<ReferralCodeEntry />);
    fireEvent.change(await screen.findByTestId('referral-entry-input'), { target: { value: '222222' } });
    fireEvent.click(screen.getByTestId('referral-entry-check'));

    const dialog = await screen.findByTestId('referral-entry-dialog');
    expect(dialog.textContent).toContain('222222');
    expect(dialog.textContent).toContain('Mona');
    expect(http.apiPost).toHaveBeenLastCalledWith('/referral/preview', { number: '222222' }, undefined, 'tok');
    expect(http.apiPost).toHaveBeenCalledTimes(1);

    http.apiPost.mockResolvedValueOnce({ data: { discount: 100 } });
    fireEvent.click(screen.getByTestId('referral-entry-confirm'));
    const done = await screen.findByTestId('referral-entry-done');
    expect(http.apiPost).toHaveBeenLastCalledWith('/referral/claim', { number: '222222', source: 'card' }, undefined, 'tok');
    expect(latin(done.textContent)).toContain('100');
    expect(screen.queryByTestId('referral-entry')).toBeNull();
  });

  it('cancel in the dialog claims nothing', async () => {
    http.apiGetAuth.mockResolvedValue(info());
    http.apiPost.mockResolvedValueOnce({ data: { number: '222222', name: 'Mona', discounts: {}, discount: 50 } });
    render(<ReferralCodeEntry />);
    fireEvent.change(await screen.findByTestId('referral-entry-input'), { target: { value: '222222' } });
    fireEvent.click(screen.getByTestId('referral-entry-check'));
    fireEvent.click(await screen.findByTestId('referral-entry-cancel'));
    expect(screen.queryByTestId('referral-entry-dialog')).toBeNull();
    expect(http.apiPost).toHaveBeenCalledTimes(1);
  });

  it('shows the backend refusal, and hides the entry for already_paid', async () => {
    http.apiGetAuth.mockResolvedValue(info());
    http.apiPost.mockRejectedValueOnce(new ApiError('no', 422, 'not_found'));
    render(<ReferralCodeEntry />);
    fireEvent.change(await screen.findByTestId('referral-entry-input'), { target: { value: '999999' } });
    fireEvent.click(screen.getByTestId('referral-entry-check'));
    expect((await screen.findByTestId('referral-entry-error')).textContent).toBeTruthy();

    http.apiPost.mockRejectedValueOnce(new ApiError('no', 422, 'already_paid'));
    fireEvent.click(screen.getByTestId('referral-entry-check'));
    await waitFor(() => expect(screen.getByTestId('referral-entry-blocked')).toBeTruthy());
    expect(screen.queryByTestId('referral-entry-input')).toBeNull();
  });

  it('shows who brought me instead of the field when brought_by is set', async () => {
    http.apiGetAuth.mockResolvedValue(info({ number: '333333', discount: 100, discounts: { year: 100 }, discount_used: false }));
    render(<ReferralCodeEntry />);
    const el = await screen.findByTestId('referral-brought-by');
    expect(el.textContent).toContain('333333');
    expect(screen.queryByTestId('referral-entry-input')).toBeNull();
  });
});
