import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PhysicalCardOrder } from '../components/PhysicalCardOrder';
import { LanguageProvider } from '../context/LanguageContext';

const info = vi.hoisted(() => ({
  eligible: true, reason: null, price: 50, shipping_price: 50, cod_fee: 0, max_per_card: 10,
  payment_methods: { online: false, online_card: false, online_wallet: false, cod: true, wallet: false, instapay: false },
  cards: [
    { membership_number: '100001', name: 'Ahmed Ali', relationship: null, is_me: true },
    { membership_number: '100002', name: 'Mona Hassan', relationship: 'wife', is_me: false },
  ],
}));

vi.mock('../api/physicalCards', () => ({
  fetchPhysicalCards: vi.fn().mockResolvedValue(info),
  fetchMyCards: vi.fn().mockResolvedValue([
    { id: 1, kind: 'physical', status: 'active', number: '100001', holder_name: 'Ahmed Ali', is_me: true, copy_of: null },
    { id: 2, kind: 'soft', status: 'active', number: '100001', holder_name: 'Ahmed Ali', is_me: true, copy_of: 1 },
    { id: 3, kind: 'physical', status: 'requested', number: '777001', holder_name: 'Mona Hassan', is_me: false, copy_of: null },
  ]),
  placePhysicalCardOrder: vi.fn(),
}));
vi.mock('../api/auth', () => ({
  fetchProfile: vi.fn().mockResolvedValue({ name: 'Ahmed Ali', phone: '01062587475', email: null }),
  fetchSavedAddress: vi.fn().mockResolvedValue(null),
}));
vi.mock('../api/endpoints', () => ({ fetchShopSettings: vi.fn().mockResolvedValue({ wallet_number: null }) }));

const wrap = () => render(<LanguageProvider><PhysicalCardOrder token="t" /></LanguageProvider>);

describe('PhysicalCardOrder', () => {
  it('lists the cards already held: physical with its soft copy, and a waiting one', async () => {
    wrap();
    await waitFor(() => expect(screen.getByTestId('my-cards')).toBeTruthy());
    const box = screen.getByTestId('my-cards');
    expect(box.textContent).toContain('Soft');
    expect(box.textContent).toContain('777001');
    expect(box.textContent).toContain('Waiting for approval');
  });

  it('draws the backend prices and a running total per copy', async () => {
    wrap();
    await waitFor(() => expect(screen.getAllByText('Mona Hassan').length).toBeGreaterThan(0));

    // One card for the holder to start with: 1 × 50 + 50 shipping = 100.
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);

    // Two more for the wife: 3 × 50 + 50 = 200.
    const plus = screen.getAllByLabelText('+');
    fireEvent.click(plus[1]);
    fireEvent.click(plus[1]);
    expect(screen.getAllByText(/200/).length).toBeGreaterThan(0);
  });

  it('explains who may not order instead of showing the form', async () => {
    const api = await import('../api/physicalCards');
    vi.mocked(api.fetchPhysicalCards).mockResolvedValueOnce({ ...info, eligible: false, reason: 'not_current', cards: [] });
    wrap();
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(/تأكيد الطلب والدفع|Confirm the order and pay/)).toBeNull();
  });
});
