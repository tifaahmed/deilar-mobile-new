import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PointsBalance } from '../components/QuizGame';

describe('the points balance on /quiz', () => {
  it('shows a signed-in player what the account holds and what is still to be added', () => {
    const { container } = render(<PointsBalance total={150} pending={30} signedIn />);

    expect(screen.getByText('+150')).toBeInTheDocument();
    expect(container.textContent).toContain('في حسابك 120');
    expect(container.textContent).toContain('+30');
    expect(container.firstElementChild?.className).toContain('from-emerald-500');
  });

  it('shows a loss in red, as a negative number', () => {
    const { container } = render(<PointsBalance total={-40} pending={0} signedIn />);

    expect(screen.getAllByText('-40').length).toBeGreaterThan(0);
    expect(container.querySelector('p[dir="ltr"]')?.textContent).toBe('-40');
    expect(container.firstElementChild?.className).toContain('from-rose-500');
    expect(container.textContent).not.toContain('لسه هتتضاف');
  });

  it('tells a player with no account that the points are only on this phone', () => {
    const { container } = render(<PointsBalance total={20} pending={20} signedIn={false} />);

    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(container.textContent).toContain('على موبايلك بس');
  });

  it('shows zero plainly', () => {
    render(<PointsBalance total={0} pending={0} signedIn={false} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
