import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const nav = vi.hoisted(() => vi.fn());
vi.mock('../router', async (orig) => ({ ...(await orig<typeof import('../router')>()), navigate: nav }));
vi.mock('../utils/quizStore', async (orig) => ({ ...(await orig<typeof import('../utils/quizStore')>()), useLoyalty: () => ({ pending: 0, total: 500, answers: 0, egp: 5, money: { points_per_egp: 100 } }) }));

import { PointsGuide } from '../components/PointsGuide';
import { LanguageProvider } from '../context/LanguageContext';
import { parseQuizPath } from '../components/QuizGame';

describe('the loyalty points page', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('is the /quiz/points route', () => {
    expect(parseQuizPath('points')).toMatchObject({ step: 'points' });
  });

  it('tells the rate, where to use points and that they reset on the 1st', () => {
    render(<LanguageProvider><PointsGuide /></LanguageProvider>);
    expect(screen.getByTestId('points-rate').textContent).toContain('100');
    expect(screen.getByTestId('points-expiry').textContent).toContain('1 أول كل شهر');
    expect(screen.getByText(/كل حاجة/)).toBeTruthy();
  });

  it('has buttons to the points products, a physical card and the membership', () => {
    render(<LanguageProvider><PointsGuide /></LanguageProvider>);
    fireEvent.click(screen.getByTestId('points-go-products'));
    expect(nav).toHaveBeenLastCalledWith('/products?points=1');
    fireEvent.click(screen.getByTestId('points-go-physical'));
    expect(nav).toHaveBeenLastCalledWith('/card/physical');
    fireEvent.click(screen.getByTestId('points-go-membership'));
    expect(nav).toHaveBeenLastCalledWith('/card');
  });
});
