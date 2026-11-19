import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DiscountInfoPopup, DiscountTag } from '../components/DiscountInfoPopup';
import { productDiscountInfo, closeDiscountInfo } from '../utils/discountInfo';
import { LanguageProvider } from '../context/LanguageContext';

describe('tapping a discount explains it', () => {
  it('shows the original price, the member price and the saving, and closes', () => {
    const outer = { clicked: false };
    render(
      <LanguageProvider>
        <div onClick={() => { outer.clicked = true; }}>
          <DiscountTag info={() => productDiscountInfo({ was: 200, now: 150, percent: 25 }, true, true)}>وفر 25%</DiscountTag>
        </div>
        <DiscountInfoPopup />
      </LanguageProvider>,
    );

    expect(screen.queryByTestId('discount-popup')).toBeNull();
    fireEvent.click(screen.getByTestId('discount-tag'));

    const popup = screen.getByTestId('discount-popup');
    expect(popup.textContent).toContain('200');
    expect(popup.textContent).toContain('150');
    expect(popup.textContent).toContain('50');
    expect(outer.clicked).toBe(false);

    act(() => closeDiscountInfo());
    expect(screen.queryByTestId('discount-popup')).toBeNull();
  });
});
