import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useFab, settle } from '../utils/floatingFabs';

const Fab: React.FC<{ id: string }> = ({ id }) => {
  const fab = useFab(id);
  return <button data-testid={id} {...fab.props()}>x</button>;
};

const rect = (left: number, bottom: number, size = 40): DOMRect => {
  const top = window.innerHeight - bottom - size;
  return { left, right: left + size, top, bottom: top + size, width: size, height: size, x: left, y: top, toJSON: () => ({}) } as DOMRect;
};

describe('draggable floating buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
    vi.useFakeTimers();
  });

  it('puts a button back where the member left it after a reload', () => {
    localStorage.setItem('deilar_fab_positions', JSON.stringify({ a: { left: 120, bottom: 300 } }));
    render(<Fab id="a" />);
    const el = screen.getByTestId('a');
    expect(el.style.left).toBe('120px');
    expect(el.style.bottom).toBe('300px');
  });

  it('keeps a saved place inside the screen', async () => {
    localStorage.setItem('deilar_fab_positions', JSON.stringify({ a: { left: 900, bottom: -50 } }));
    render(<Fab id="a" />);
    await act(async () => { vi.advanceTimersByTime(400); });
    const el = screen.getByTestId('a');
    expect(parseInt(el.style.left, 10)).toBeLessThanOrEqual(400);
    expect(parseInt(el.style.bottom, 10)).toBeGreaterThanOrEqual(0);
  });

  it('slides a button that lands on another one to the nearest free place', () => {
    render(<><Fab id="a" /><Fab id="b" /></>);
    vi.spyOn(screen.getByTestId('a'), 'getBoundingClientRect').mockReturnValue(rect(100, 300));
    const free = settle('b', { left: 110, bottom: 310 }, 40, 40);
    expect(free).not.toBeNull();
    // 40px boxes with an 8px gap: the new place must not touch the first one.
    const a = rect(100, 300);
    const topB = window.innerHeight - free!.bottom - 40;
    const apart = free!.left >= a.right + 8 || free!.left + 40 <= a.left - 8 || topB >= a.bottom + 8 || topB + 40 <= a.top - 8;
    expect(apart).toBe(true);
  });

  it('leaves a free place alone', () => {
    render(<Fab id="a" />);
    expect(settle('b', { left: 200, bottom: 500 }, 40, 40)).toEqual({ left: 200, bottom: 500 });
  });
});
