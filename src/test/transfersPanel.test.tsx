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
import { TransfersPanel } from '../components/TransfersPanel';
import { clearSession, updateSession } from '../utils/session';

describe('transfers between members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearSession();
    updateSession({ token: 'tok' });
  });

  it('shows nothing while the admin has transfers closed', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { enabled: false, transfers: [] } });
    const { container } = render(<TransfersPanel />);
    await waitFor(() => expect(http.apiGetAuth).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });

  it('checks who the recipient is, then asks; nothing is promised until they accept', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { enabled: true, transfers: [] } });
    http.apiPost.mockResolvedValueOnce({ data: { name: 'منى ••78' } }).mockResolvedValueOnce({ data: {} });
    render(<TransfersPanel />);

    fireEvent.change(await screen.findByLabelText(/رقم التليفون/), { target: { value: '01012345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'تحقق من العضو' }));
    expect(await screen.findByText(/منى ••78/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('المبلغ'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'ابعت طلب التحويل' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('هيتم لما يوافق'));

    const [path, body] = http.apiPost.mock.calls[1];
    expect(path).toBe('/transfers');
    expect(body).toMatchObject({ phone: '01012345678', kind: 'points', amount: 250 });
    expect(typeof body.id).toBe('string');
  });

  it('lets the recipient accept an incoming request', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { enabled: true, transfers: [{ id: 7, direction: 'in', kind: 'wallet', amount: 40, status: 'pending', other: 'أحمد ••11', note: null, expires_at: null, at: null }] } });
    http.apiPost.mockResolvedValue({ data: {} });
    render(<TransfersPanel />);

    expect(await screen.findByText(/أحمد ••11 عايز يحوّلك/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'موافق' }));
    await waitFor(() => expect(http.apiPost).toHaveBeenCalledWith('/transfers/7/accept', {}, undefined, 'tok'));
  });
});
