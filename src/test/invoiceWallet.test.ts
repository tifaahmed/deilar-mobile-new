import { describe, expect, it } from 'vitest';
import { build, type InvoiceData } from '../utils/invoicePdf';

const base: InvoiceData = {
  code: 'DL-AB12CD34', customer: { name: 'Mona' }, items: [{ name: 'Gloves', quantity: 1, unit: 100, total: 100 }], delivery: 35, total: 135,
};
const text = (inv: InvoiceData, ar = true) => build(inv, ar).textContent ?? '';

describe('the invoice shows how an order was paid', () => {
  it('draws the wallet part and the real-money remainder', () => {
    const t = text({ ...base, wallet: 80, due: 55, paid: 80 });
    expect(t).toContain('مدفوع من المحفظة');
    expect(t).toContain('- 80 ج.م');
    expect(t).toContain('المتبقي (فلوس حقيقية)');
    expect(t).toContain('55 ج.م');
    expect(t).toContain('إجمالي المدفوع');
  });

  it('keeps the full bill as the total, in English too', () => {
    const t = text({ ...base, wallet: 80, due: 55 }, false);
    expect(t).toContain('Paid from wallet');
    expect(t).toContain('Remaining (real money)');
    expect(t).toContain('135 EGP');
  });

  it('draws none of it when the wallet paid nothing', () => {
    for (const inv of [base, { ...base, wallet: 0, due: 135 }]) {
      const t = text(inv);
      expect(t).not.toContain('مدفوع من المحفظة');
      expect(t).not.toContain('المتبقي (فلوس حقيقية)');
      expect(t).not.toContain('إجمالي المدفوع');
    }
  });
});
