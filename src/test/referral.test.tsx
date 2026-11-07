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
vi.mock('qrcode', () => ({ toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR') }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReferralScreen } from '../components/ReferralScreen';
import { ApiError } from '../api/http';
import { claimPendingReferral, matchInstallReferral, parseReferralCode, pendingReferralCode, rememberReferralCode } from '../utils/referral';
import { clearSession, updateSession } from '../utils/session';

const info = {
  enabled: true, code: '111111', link: 'https://deilar.com/r/111111',
  amounts: { trial_bonus: 10, commission_percent: 10, discount: 50 },
  totals: { clicks: 9, app_opens: 4, registered: 3, trials: 2, subscribed: 1, trial_earned: 20, commission_earned: 60, earned: 80, pending: 15, wallet_balance: 80, count: 3 },
  referrals: [
    { id: 1, name: 'Mona', phone_last4: '1234', joined_at: '2026-11-01T10:00:00Z', stage: 'renewed', trial_started_at: '2026-11-01T11:00:00Z', plan: 'year', payments: 2, subscribed: true, earned: 70,
      rewards: [
        { id: 11, kind: 'trial', amount: 10, status: 'paid', base_amount: 0, rate: 0, plan: null, at: '2026-11-01T11:00:00Z', reversed_at: null },
        { id: 12, kind: 'commission', amount: 60, status: 'paid', base_amount: 600, rate: 10, plan: 'year', at: '2026-11-03T10:00:00Z', reversed_at: null },
        { id: 13, kind: 'commission', amount: 40, status: 'reversed', base_amount: 400, rate: 10, plan: 'half', at: '2026-11-04T10:00:00Z', reversed_at: '2026-11-05T10:00:00Z' },
      ] },
    { id: 2, name: 'Omar', phone_last4: '9876', joined_at: '2026-11-02T10:00:00Z', stage: 'trial', trial_started_at: '2026-11-02T11:00:00Z', plan: null, payments: 0, subscribed: false, earned: 10, rewards: [] },
    { id: 3, name: 'Sara', phone_last4: '5555', joined_at: '2026-11-03T10:00:00Z', stage: 'registered', trial_started_at: null, plan: null, payments: 0, subscribed: false, earned: 0, rewards: [] },
  ],
  brought_by: null,
};

/** The screen draws Arabic-Indic digits for Arabic; compare as plain digits. */
const latin = (t: string | null) => (t ?? '').replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

describe('referral codes', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); });

  it('reads the card number out of a shared link or a ?ref= query, and never takes a REG- placeholder', () => {
    expect(parseReferralCode('https://deilar.com/r/123456')).toBe('123456');
    expect(parseReferralCode('https://deilar.com/r/123456?utm=x')).toBe('123456');
    expect(parseReferralCode('https://deilar.com/?ref=654321')).toBe('654321');
    expect(parseReferralCode('https://deilar.com/products')).toBeNull();
    expect(parseReferralCode('https://deilar.com/r/REG-55')).toBeNull();
  });

  it('keeps the code until the backend answers, then lets it go', async () => {
    rememberReferralCode('111111');
    http.apiPost.mockRejectedValueOnce(new Error('offline'));
    expect(await claimPendingReferral('tok')).toBeNull();
    expect(pendingReferralCode()).toBe('111111'); // network failure: kept for the next try

    http.apiPost.mockResolvedValueOnce({ data: { discount: 50 } });
    expect(await claimPendingReferral('tok')).toBe(50);
    expect(http.apiPost).toHaveBeenLastCalledWith('/referral/claim', { number: '111111', source: 'link' }, undefined, 'tok');
    expect(pendingReferralCode()).toBeNull();
  });

  it('finds the link tapped before the install once, and never overrides a code already held', async () => {
    http.apiPost.mockResolvedValueOnce({ data: { code: '555555' } });
    await matchInstallReferral();
    expect(http.apiPost).toHaveBeenCalledWith('/mobile/referral/match', {});
    expect(pendingReferralCode()).toBe('555555');

    await matchInstallReferral(); // already asked: no second call
    expect(http.apiPost).toHaveBeenCalledTimes(1);

    localStorage.clear();
    rememberReferralCode('111111');
    http.apiPost.mockResolvedValueOnce({ data: { code: '555555' } });
    await matchInstallReferral();
    expect(pendingReferralCode()).toBe('111111');
  });

  it('asks again next launch after a network failure, but stops after a definite answer', async () => {
    http.apiPost.mockRejectedValueOnce(new Error('offline'));
    await matchInstallReferral();
    http.apiPost.mockResolvedValueOnce({ data: { code: null } });
    await matchInstallReferral();
    await matchInstallReferral();
    expect(http.apiPost).toHaveBeenCalledTimes(2);
    expect(pendingReferralCode()).toBeNull();
  });

  it('drops a code the backend refused (a definite no), so it is not retried forever', async () => {
    rememberReferralCode('111111');
    http.apiPost.mockRejectedValueOnce(new ApiError('no', 422, 'already_paid'));
    expect(await claimPendingReferral('tok')).toBeNull();
    expect(pendingReferralCode()).toBeNull();
  });
});

describe('the invite screen', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); updateSession({ token: 'tok' }); });

  it('shows the code, the QR, share buttons with the link, and the whole dashboard — drawn from the backend\'s numbers', async () => {
    http.apiGetAuth.mockResolvedValue({ data: info });
    render(<ReferralScreen />);

    expect((await screen.findByTestId('referral-code')).textContent).toBe('111111');
    await waitFor(() => expect(screen.getByTestId('referral-qr').getAttribute('src')).toBe('data:image/png;base64,QR'));
    expect(screen.getByTestId('referral-whatsapp').getAttribute('href')).toContain(encodeURIComponent('https://deilar.com/r/111111'));

    const stat = (k: string) => latin(screen.getByTestId(`referral-stat-${k}`).textContent);
    expect(stat('registered')).toContain('3');
    expect(stat('trials')).toContain('2');
    expect(stat('subscribed')).toContain('1');
    expect(stat('trial-earned')).toContain('20');
    expect(stat('commission')).toContain('60');
    expect(stat('earned')).toContain('80');
    expect(stat('wallet')).toContain('80');
    expect(stat('pending')).toContain('15');
    expect(latin(screen.getByTestId('referral-dashboard').textContent)).toContain('9'); // clicks/opens totals line is drawn
  });

  it('shows each invited member with their stage and earnings, and opens the details of every payout (a refunded one struck out)', async () => {
    http.apiGetAuth.mockResolvedValue({ data: info });
    render(<ReferralScreen />);
    await screen.findByTestId('referral-list');

    expect(screen.getByTestId('referral-stage-1').textContent).toBe('جدّد اشتراكه');
    expect(screen.getByTestId('referral-stage-2').textContent).toBe('بدأ التجربة');
    expect(screen.getByTestId('referral-stage-3').textContent).toBe('أنشأ حساباً');
    expect(latin(screen.getByTestId('referral-row-1').textContent)).toContain('+70');

    fireEvent.click(screen.getByTestId('referral-row-1').querySelector('button')!);
    const details = latin(screen.getByTestId('referral-rewards-1').textContent);
    expect(details).toContain('مكافأة بدء التجربة');
    expect(details).toContain('عمولة 10% على سنوي (600)');
    expect(details).toContain('تم الاسترداد');
  });

  it('asks for a card first when there is no code yet, and says so when the programme is off', async () => {
    http.apiGetAuth.mockResolvedValueOnce({ data: { ...info, code: null, link: null } });
    const first = render(<ReferralScreen />);
    expect(await screen.findByText(/اعمل كارتك الأول/)).toBeTruthy();
    first.unmount();

    http.apiGetAuth.mockResolvedValueOnce({ data: { ...info, enabled: false } });
    render(<ReferralScreen />);
    expect(await screen.findByText(/الدعوات متوقفة/)).toBeTruthy();
  });
});
