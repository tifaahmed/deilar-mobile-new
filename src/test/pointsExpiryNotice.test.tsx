import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const loyalty = vi.hoisted(() => ({ expiring: null as null | { points: number; expires_on: string; days: number } }));
vi.mock('../utils/quizStore', async (orig) => ({ ...(await orig<typeof import('../utils/quizStore')>()), useLoyalty: () => ({ pending: 0, total: 500, answers: 0, egp: 5, money: null, expiring: loyalty.expiring }) }));

import { PointsExpiryNotice } from '../components/PointsExpiryNotice';
import { LanguageProvider } from '../context/LanguageContext';

describe('points about to expire', () => {
  it('shows nothing when no points are close to expiring', () => {
    loyalty.expiring = null;
    render(<LanguageProvider><PointsExpiryNotice /></LanguageProvider>);
    expect(screen.queryByTestId('points-expiry-notice')).toBeNull();
  });

  it('tells how many points go and in how many days', () => {
    loyalty.expiring = { points: 250, expires_on: '2026-12-10', days: 12 };
    render(<LanguageProvider><PointsExpiryNotice /></LanguageProvider>);
    const text = screen.getByTestId('points-expiry-notice').textContent ?? '';
    expect(text).toMatch(/250|٢٥٠/);
    expect(text).toMatch(/12|١٢/);
  });
});
