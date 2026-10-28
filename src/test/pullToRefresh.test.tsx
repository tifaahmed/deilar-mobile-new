import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { PullToRefresh, blockPullToRefresh, reloadPage } from '../components/PullToRefresh';

/** A finger event on `target`: `touches` is what the page reads. */
function touch(type: 'touchstart' | 'touchmove' | 'touchend', y: number, x = 100, target: Element = document.body) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
  act(() => {
    target.dispatchEvent(event);
  });
}

/** Puts a finger down at (100, 100), drags it to y, lets go. */
function pull(to: { y: number; x?: number }, target?: Element) {
  touch('touchstart', 100, 100, target);
  touch('touchmove', to.y, to.x ?? 100, target);
  touch('touchend', to.y, to.x ?? 100, target);
}

describe('pull down to reload', () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    reload.mockClear();
    render(<PullToRefresh onRefresh={reload} />);
  });
  afterEach(() => {
    vi.useRealTimers();
    delete document.body.dataset.noPull;
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  const settle = () => act(() => void vi.advanceTimersByTime(400));

  it('reloads the page after a long pull from the top', () => {
    pull({ y: 300 }); // 200px of finger = 100 of page, past the 64 needed
    settle();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while it reloads, and only once', () => {
    pull({ y: 300 });
    expect(document.querySelector('.animate-spin')).not.toBeNull();
    pull({ y: 300 });
    settle();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a short pull', () => {
    pull({ y: 160 }); // 60px of finger = 30 of page
    settle();
    expect(reload).not.toHaveBeenCalled();
    expect(document.querySelector('svg')).toBeNull();
  });

  it('does nothing for a sideways swipe or a swipe up', () => {
    pull({ y: 180, x: 400 });
    pull({ y: 20 });
    settle();
    expect(reload).not.toHaveBeenCalled();
  });

  it('does nothing when the page is scrolled down', () => {
    Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });
    pull({ y: 300 });
    settle();
    expect(reload).not.toHaveBeenCalled();
  });

  it('leaves alone a pull that starts on a fixed bar, a dialog, a map or a field', () => {
    for (const html of ['<div class="fixed"><p id="t">x</p></div>', '<div role="dialog"><p id="t">x</p></div>', '<div class="leaflet-container"><p id="t">x</p></div>', '<textarea id="t"></textarea>']) {
      const holder = document.createElement('div');
      holder.innerHTML = html;
      document.body.appendChild(holder);
      pull({ y: 300 }, holder.querySelector('#t') as Element);
      holder.remove();
    }
    settle();
    expect(reload).not.toHaveBeenCalled();
  });

  it('can be blocked while a quiz play is on, and works again after', () => {
    const unblock = blockPullToRefresh();
    pull({ y: 300 });
    settle();
    expect(reload).not.toHaveBeenCalled();

    unblock();
    pull({ y: 300 });
    settle();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('marks the reload as a pull, so the next start skips the "find the nearest provider" box', () => {
    const real = window.location;
    Object.defineProperty(window, 'location', { value: { ...real, reload: vi.fn() }, writable: true, configurable: true });

    reloadPage();

    expect(sessionStorage.getItem('deilar_pull_reload')).toBe('1');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, 'location', { value: real, writable: true, configurable: true });
    sessionStorage.removeItem('deilar_pull_reload');
  });
});
