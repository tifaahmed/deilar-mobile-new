import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapListHandle } from '../components/MapListHandle';
import { LanguageProvider } from '../context/LanguageContext';

const setup = (onOpen = vi.fn()) => {
  render(<LanguageProvider><MapListHandle visible onOpen={onOpen} /></LanguageProvider>);
  const el = screen.getByTestId('map-list-handle');
  (el as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
  return { el, onOpen };
};

describe('the pull-down grip on the maps', () => {
  it('opens the list when pulled far enough, with a buzz', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const { el, onOpen } = setup();
    fireEvent.pointerDown(el, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientY: 260, pointerId: 1 });
    fireEvent.pointerUp(el, { clientY: 260, pointerId: 1 });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalled();
  });

  it('springs back and does nothing on a short pull', () => {
    const { el, onOpen } = setup();
    fireEvent.pointerDown(el, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(el, { clientY: 120, pointerId: 1 });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
