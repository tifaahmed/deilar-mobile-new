import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installKeyboardGuard, KEYBOARD_DELAY_MS } from '../utils/keyboardGuard';

describe('keyboard guard', () => {
  let off: () => void;
  const scroll = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    scroll.mockClear();
    Element.prototype.scrollIntoView = scroll;
    off = installKeyboardGuard();
  });
  afterEach(() => {
    off();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  const add = (html: string) => {
    document.body.innerHTML = html;
    return document.body.firstElementChild as HTMLElement;
  };

  it('scrolls a focused text field to the middle once the keyboard is up', () => {
    const input = add('<input type="text" />');
    input.focus();
    expect(scroll).not.toHaveBeenCalled();

    vi.advanceTimersByTime(KEYBOARD_DELAY_MS);
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
  });

  it('covers textareas and selects, and ignores fields that open no keyboard', () => {
    add('<textarea></textarea>').focus();
    vi.advanceTimersByTime(KEYBOARD_DELAY_MS);
    expect(scroll).toHaveBeenCalledTimes(1);

    scroll.mockClear();
    add('<input type="checkbox" />').focus();
    vi.advanceTimersByTime(KEYBOARD_DELAY_MS);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('does nothing when the field lost focus before the keyboard finished opening', () => {
    const input = add('<input type="text" />');
    input.focus();
    input.blur();
    vi.advanceTimersByTime(KEYBOARD_DELAY_MS * 2);
    expect(scroll).not.toHaveBeenCalled();
  });
});
