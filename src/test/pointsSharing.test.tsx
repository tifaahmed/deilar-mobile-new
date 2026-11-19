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

import { render, screen, waitFor } from '@testing-library/react';
import { PointsSharing } from '../components/PointsSharing';
import { TransfersPanel } from '../components/TransfersPanel';
import { routeHref, ACCOUNT_SECTIONS } from '../router';
import { clearSession, updateSession } from '../utils/session';

describe('sharing loyalty points', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    clearSession();
    updateSession({ token: 'tok' });
  });

  it('has its own account page', () => {
    expect(ACCOUNT_SECTIONS).toContain('share');
    expect(routeHref({ tab: 'profile', section: 'share' })).toBe('/account/share');
  });

  it('says so when the admin has points sharing closed', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { enabled: true, kinds: { points: false, wallet: true }, transfers: [] } });
    render(<PointsSharing />);
    expect(await screen.findByTestId('transfers-off')).toBeTruthy();
    expect(screen.queryByTestId('transfers-panel')).toBeNull();
  });

  it('offers points only, with the log of finished requests', async () => {
    http.apiGetAuth.mockResolvedValue({
      data: {
        enabled: true,
        kinds: { points: true, wallet: true },
        transfers: [
          { id: 1, direction: 'out', kind: 'points', amount: 50, status: 'accepted', other: 'منى ••78', note: null, expires_at: null, at: '2026-11-10T10:00:00Z' },
          { id: 2, direction: 'in', kind: 'wallet', amount: 20, status: 'accepted', other: 'علي', note: null, expires_at: null, at: null },
          { id: 3, direction: 'in', kind: 'points', amount: 10, status: 'declined', other: 'سارة', note: null, expires_at: null, at: null },
        ],
      },
    });
    render(<PointsSharing />);
    const log = await screen.findByTestId('transfers-log');
    await waitFor(() => expect(log.textContent).toContain('منى ••78'));
    expect(log.textContent).toContain('سارة');
    expect(log.textContent).not.toContain('علي');
    expect(screen.queryByText('رصيد المحفظة')).toBeNull();
  });

  it('starts from a relative’s card number', async () => {
    http.apiGetAuth.mockResolvedValue({ data: { enabled: true, kinds: { points: true, wallet: true }, transfers: [] } });
    render(<TransfersPanel kindOnly="points" initialWho="654321" />);
    const input = (await screen.findByLabelText(/رقم التليفون/)) as HTMLInputElement;
    expect(input.value).toBe('654321');
  });
});
