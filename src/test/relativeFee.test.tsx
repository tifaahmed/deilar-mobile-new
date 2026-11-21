import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const fetchFees = vi.hoisted(() => vi.fn());
const place = vi.hoisted(() => vi.fn());
vi.mock('../api/relativeFees', () => ({ fetchRelativeFees: fetchFees, placeRelativeFeeOrder: place }));
vi.mock('../api/orders', async (orig) => ({ ...(await orig<typeof import('../api/orders')>()), payOrder: vi.fn(), fetchOrder: vi.fn() }));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { RELATIVE_ADDED_EVENT } from '../api/family';
import { RelativeFeePanel } from '../components/RelativeFeePanel';
import { LanguageProvider } from '../context/LanguageContext';

const fee = { monthly: 5, months: 12, per_relative: 60, kind: 'individual', pay_online: true, request_only: false };
const methods = { online: false, online_card: false, online_wallet: false, cod: true, wallet: false, instapay: false };
const show = () => render(<LanguageProvider><RelativeFeePanel token="t" /></LanguageProvider>);

describe('the relatives fee', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('draws the price the backend gave and pays the waiting relatives', async () => {
    fetchFees.mockResolvedValue({ fee, payment_methods: methods, waiting: [{ id: 7, name: 'منى', relationship: 'wife' }] });
    place.mockResolvedValue({ order_code: 'DL-1', total_amount: 60, payment_status: { value: 'pending' } });
    show();

    expect((await screen.findByTestId('relative-fee-price')).textContent).toContain('٦٠');
    expect(screen.queryByTestId('relative-fee-company')).toBeNull();
    fireEvent.click(screen.getByText('الدفع عند الاستلام'));
    fireEvent.click(screen.getByTestId('relative-fee-pay'));
    await waitFor(() => expect(place).toHaveBeenCalledWith('t', [7], 'cod', { plan: 'year', usePoints: false, useWallet: false }));
  });

  it('tells a company card the team will call, and still offers to pay the year', async () => {
    fetchFees.mockResolvedValue({ fee: { ...fee, kind: 'company', request_only: true }, payment_methods: methods, waiting: [{ id: 8, name: 'علي', relationship: 'son' }] });
    show();

    expect((await screen.findByTestId('relative-fee-company')).textContent).toContain('تواصل معنا');
    expect(screen.getByTestId('relative-fee-pay')).toBeTruthy();
  });

  it('pays a month for a renewal and spends points only when asked', async () => {
    const plans = [{ key: 'month', price: 5, months: 1 }, { key: 'year', price: 60, months: 12 }];
    fetchFees.mockResolvedValue({ fee: { ...fee, plans }, payment_methods: methods, can_pay: true, reason: null, waiting: [{ id: 9, name: 'منى', relationship: 'wife', state: 'expired', expiration_date: '2026-11-01' }] });
    place.mockResolvedValue({ order_code: 'DL-2', total_amount: 5, payment_status: { value: 'pending' } });
    localStorage.setItem('deilar_loyalty_server', JSON.stringify({ points: 2000, token: 't', money: { points_per_egp: 100, wallet_balance: 0, wallet_enabled: true, wallet_min_egp: 20 } }));
    (await import('../utils/session')).updateSession({ token: 't' });
    show();

    await screen.findByTestId('relative-fee-pay');
    fireEvent.click(screen.getByText(/شهر —/));
    fireEvent.click((await screen.findByTestId('relative-points-toggle')).querySelector('input')!);
    // The points cover the whole 5 EGP, so no payment method is asked for.
    expect(screen.queryByText('الدفع عند الاستلام')).toBeNull();
    fireEvent.click(screen.getByTestId('relative-fee-pay'));
    await waitFor(() => expect(place).toHaveBeenCalledWith('t', [9], 'cod', { plan: 'month', usePoints: true, useWallet: false }));
  });

  it('says a trial card lets the family try, and sends a relative on an unpaid card to a normal plan', async () => {
    fetchFees.mockResolvedValue({ fee, payment_methods: methods, can_pay: false, reason: 'trial', waiting: [] });
    const first = show();
    expect(await screen.findByTestId('relative-fee-trial')).toBeTruthy();
    expect(screen.queryByTestId('relative-fee-pay')).toBeNull();
    first.unmount();

    fetchFees.mockResolvedValue({ fee, payment_methods: methods, can_pay: false, reason: 'parent_not_paid', waiting: [] });
    show();
    expect(await screen.findByTestId('relative-fee-own-plan')).toBeTruthy();
  });

  it('drops the payment form when the waiting relative is removed', async () => {
    fetchFees.mockResolvedValueOnce({ fee, payment_methods: methods, waiting: [{ id: 7, name: 'منى', relationship: 'wife' }] });
    show();
    expect(await screen.findByTestId('relative-fee-pay')).toBeTruthy();

    fetchFees.mockResolvedValueOnce({ fee, payment_methods: methods, waiting: [] });
    window.dispatchEvent(new Event(RELATIVE_ADDED_EVENT));
    await waitFor(() => expect(screen.queryByTestId('relative-fee-pay')).toBeNull());
  });

  it('shows clear points and wallet switches and the pay button drops to the smaller number', async () => {
    localStorage.setItem('deilar_loyalty_server', JSON.stringify({ points: 2000, token: 't', money: { points_per_egp: 100, wallet_balance: 100, wallet_enabled: true, wallet_min_egp: 20 } }));
    const { updateSession } = await import('../utils/session');
    updateSession({ token: 't' });
    fetchFees.mockResolvedValue({ fee, payment_methods: methods, waiting: [{ id: 7, name: 'منى', relationship: 'wife' }] });
    show();

    const due = async () => (await screen.findByTestId('relative-fee-due')).textContent ?? '';
    expect(await due()).toMatch(/٦٠|60/);
    expect(screen.queryByTestId('relative-fee-old-price')).toBeNull();

    fireEvent.click((await screen.findByTestId('relative-points-toggle')).querySelector('input')!);
    expect(await due()).toMatch(/٤٠|40/);
    expect(screen.getByTestId('relative-fee-old-price').textContent).toMatch(/٦٠|60/);

    fireEvent.click(screen.getByTestId('relative-wallet-toggle').querySelector('input')!);
    expect(await due()).toMatch(/٠|0/);
    expect(screen.queryByText('الدفع عند الاستلام')).toBeNull();
  });

  it('shows nothing while the fee is free', async () => {
    fetchFees.mockResolvedValue({ fee: { ...fee, monthly: 0, per_relative: 0 }, payment_methods: methods, waiting: [] });
    const { container } = show();
    await waitFor(() => expect(fetchFees).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="relative-fee"]')).toBeNull();
  });
});
