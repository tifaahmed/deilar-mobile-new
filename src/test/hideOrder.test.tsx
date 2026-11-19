import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ apiPost: vi.fn(), apiGetAuth: vi.fn(), apiGet: vi.fn() }));
vi.mock('../api/http', () => ({
  apiPost: http.apiPost, apiGetAuth: http.apiGetAuth, apiGet: http.apiGet, setApiLanguage: vi.fn(),
  buildUrl: (p: string) => p,
  ApiError: class ApiError extends Error { constructor(m: string, readonly status: number, readonly reason?: string) { super(m); } },
}));
vi.mock('../utils/reportError', () => ({ reportClientError: vi.fn() }));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { hideOrder } from '../api/orders';
import { forgetOrder, rememberOrder, storedOrders } from '../utils/orders';
import { OrdersPage } from '../components/OrdersPage';
import { clearSession } from '../utils/session';
import { LanguageProvider } from '../context/LanguageContext';

const order = (over: Record<string, unknown> = {}) => ({
  order_code: 'DL-HIDE0001', placed_at: '2026-11-19T10:00:00Z', total_amount: 100, total_paid: 0, delivery_price: 0,
  payment_type: { value: 'cod', label: 'COD' }, payment_status: { value: 'pending', label: 'Pending' }, delivery_status: { value: 'pending', label: 'Pending' },
  items: [{ id: 1, slug: 'a', name: 'A', image: null, quantity: 1, new_price: 100, line_total: 100 }], receipts: [], awaiting_receipt: false, accepts_receipts: false,
  can_hide: true, hidden_by_buyer: false, ...over,
});

describe('hiding an untouched order', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); clearSession(); });

  it('posts the confirmation to the hide endpoint', async () => {
    http.apiPost.mockResolvedValue({ order: order({ hidden_by_buyer: true, can_hide: false }) });
    const res = await hideOrder('DL-HIDE0001');
    expect(http.apiPost).toHaveBeenCalledWith('/mobile/orders/DL-HIDE0001/hide', { confirm: true });
    expect(res.hidden_by_buyer).toBe(true);
  });

  it('forgetOrder drops only the local snapshot', () => {
    rememberOrder({ code: 'DL-HIDE0001', placedAt: null, total: 1, itemCount: 1, summary: 'A', image: null });
    forgetOrder('DL-HIDE0001');
    expect(storedOrders()).toHaveLength(0);
  });

  const open = () => render(<LanguageProvider><OrdersPage code="DL-HIDE0001" /></LanguageProvider>);

  it('shows the button only when the server says can_hide, and asks to confirm', async () => {
    http.apiGet.mockResolvedValue({ order: order() });
    open();
    fireEvent.click(await screen.findByTestId('order-hide'));
    expect(screen.getByTestId('order-hide-dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('order-hide-cancel'));
    expect(screen.queryByTestId('order-hide-dialog')).toBeNull();
    expect(http.apiPost).not.toHaveBeenCalled();
  });

  it('draws no button when the order cannot be hidden', async () => {
    http.apiGet.mockResolvedValue({ order: order({ can_hide: false }) });
    open();
    await waitFor(() => expect(screen.getByText('A')).toBeTruthy());
    expect(screen.queryByTestId('order-hide')).toBeNull();
  });

  it('shows the backend message when the order has moved on', async () => {
    http.apiGet.mockResolvedValue({ order: order() });
    http.apiPost.mockRejectedValue(new Error('This order can no longer be hidden.'));
    open();
    fireEvent.click(await screen.findByTestId('order-hide'));
    fireEvent.click(screen.getByTestId('order-hide-confirm'));
    await waitFor(() => expect(screen.getByText('This order can no longer be hidden.')).toBeTruthy());
  });
});
