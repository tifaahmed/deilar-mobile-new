import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../hooks/useCatalog', () => ({ useContact: () => ({ phone: '0100', dial: '0100', whatsapp: '2010' }) }));

import { FloatingContactButton } from '../components/FloatingContactButton';
import { LanguageProvider } from '../context/LanguageContext';

describe('the floating contact button', () => {
  it('closes its panel when the screen is pressed anywhere else', () => {
    render(<LanguageProvider><div data-testid="page">page</div><FloatingContactButton /></LanguageProvider>);
    fireEvent.click(screen.getByLabelText(/Call or WhatsApp|مكالمة أو واتساب/));
    expect(screen.getByText(/Contact us|كلّمنا على طول/)).toBeTruthy();

    fireEvent.pointerDown(screen.getByTestId('page'));
    expect(screen.queryByText(/Contact us|كلّمنا على طول/)).toBeNull();
  });

  it('stays open while the panel itself is pressed', () => {
    render(<LanguageProvider><FloatingContactButton /></LanguageProvider>);
    fireEvent.click(screen.getByLabelText(/Call or WhatsApp|مكالمة أو واتساب/));
    fireEvent.pointerDown(screen.getByText(/Contact us|كلّمنا على طول/));
    expect(screen.getByText(/Contact us|كلّمنا على طول/)).toBeTruthy();
  });
});
