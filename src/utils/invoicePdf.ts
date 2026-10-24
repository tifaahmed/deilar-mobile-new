/**
 * An order as a one-page PDF (Arabic or English), made on the device.
 *
 * The page is laid out as ordinary HTML — so the browser shapes the Arabic and
 * handles right-to-left, which a PDF library's own text drawing does not — then
 * photographed with html2canvas and placed on A4 pages with jsPDF. Both are loaded
 * only when somebody actually asks for a PDF, so they cost nothing on first load.
 */
export interface InvoiceData {
  /** The order code; absent for a summary of a basket not yet ordered. */
  code?: string | null;
  date?: Date | string | null;
  customer: { name?: string | null; phone?: string | null; address?: string | null };
  items: { name: string; quantity: number; unit: number | null; total: number }[];
  /** What the member price saved, when it did. */
  saved?: number;
  /** null = not known yet (shown as nothing); 0 = free. */
  delivery: number | null;
  total: number;
  payment?: string | null;
  member?: string | null;
}

const INK = '#0f172a';
const BRAND = '#941946';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.setAttribute('style', style);
  if (text !== undefined) node.textContent = text; // never innerHTML: names and addresses are the buyer's own words
  return node;
}

function row(label: string, value: string, bold = false): HTMLElement {
  const line = el('div', `display:flex;justify-content:space-between;gap:16px;padding:4px 0;font-size:13px;${bold ? `font-weight:800;font-size:15px;color:${BRAND};` : `color:${INK};`}`);
  line.append(el('span', 'color:#475569;', label), el('span', 'font-family:monospace;direction:ltr;', value));
  return line;
}

function build(inv: InvoiceData, isAr: boolean): HTMLElement {
  const money = (n: number) => `${n} ${isAr ? 'ج.م' : 'EGP'}`;
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const page = el('div', `position:fixed;left:-10000px;top:0;width:794px;padding:40px;background:#fff;color:${INK};font-family:'Cairo',Arial,sans-serif;direction:${isAr ? 'rtl' : 'ltr'};text-align:${isAr ? 'right' : 'left'};`);

  const head = el('div', `display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${BRAND};padding-bottom:14px;margin-bottom:18px;`);
  const brand = el('div', '');
  brand.append(el('div', `font-size:28px;font-weight:900;color:${BRAND};`, 'Deilar'), el('div', 'font-size:12px;color:#64748b;', t('كرت ديلار', 'Deilar medical card')));
  const meta = el('div', `text-align:${isAr ? 'left' : 'right'};`);
  meta.append(
    el('div', 'font-size:18px;font-weight:800;', inv.code ? t('فاتورة الطلب', 'Order invoice') : t('ملخص الطلب', 'Order summary')),
    ...(inv.code ? [el('div', 'font-size:14px;font-family:monospace;direction:ltr;', inv.code)] : []),
    el('div', 'font-size:12px;color:#64748b;', new Date(inv.date ?? Date.now()).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB')),
  );
  head.append(brand, meta);
  page.append(head);

  const who = el('div', 'background:#f8fafc;border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;line-height:1.8;');
  who.append(el('div', 'font-weight:800;margin-bottom:2px;', t('بيانات التوصيل', 'Delivery details')));
  for (const [label, value] of [
    [t('الاسم', 'Name'), inv.customer.name],
    [t('الهاتف', 'Phone'), inv.customer.phone],
    [t('العنوان', 'Address'), inv.customer.address],
    [t('كرت العضوية', 'Membership card'), inv.member],
  ] as const) {
    if (value) who.append(el('div', '', `${label}: ${value}`));
  }
  page.append(who);

  const table = el('table', 'width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;');
  const header = el('tr', `background:${BRAND};color:#fff;`);
  for (const h of [t('المنتج', 'Product'), t('الكمية', 'Qty'), t('سعر القطعة', 'Unit'), t('الإجمالي', 'Total')]) header.append(el('th', 'padding:8px 10px;font-weight:700;text-align:inherit;', h));
  table.append(header);
  inv.items.forEach((item, i) => {
    const tr = el('tr', `background:${i % 2 ? '#f8fafc' : '#fff'};border-bottom:1px solid #e2e8f0;`);
    tr.append(
      el('td', 'padding:8px 10px;', item.name),
      el('td', 'padding:8px 10px;font-family:monospace;', String(item.quantity)),
      el('td', 'padding:8px 10px;font-family:monospace;', item.unit == null ? '—' : money(item.unit)),
      el('td', 'padding:8px 10px;font-family:monospace;font-weight:700;', money(item.total)),
    );
    table.append(tr);
  });
  page.append(table);

  const totals = el('div', 'width:55%;margin-inline-start:auto;');
  if (inv.saved && inv.saved > 0) totals.append(row(t('وفّرت بكرت ديلار', 'Saved with your card'), money(inv.saved)));
  if (inv.delivery != null) totals.append(row(t('التوصيل', 'Delivery'), inv.delivery > 0 ? money(inv.delivery) : t('مجاناً', 'Free')));
  totals.append(row(t('الإجمالي', 'Total'), money(inv.total), true));
  page.append(totals);

  if (inv.payment) page.append(el('div', 'margin-top:14px;font-size:12px;color:#475569;', `${t('طريقة الدفع', 'Payment')}: ${inv.payment}`));
  page.append(el('div', 'margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;', t('شكراً لتسوقك من ديلار', 'Thank you for shopping with Deilar')));

  return page;
}

export async function downloadInvoicePdf(inv: InvoiceData, isAr = true): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const node = build(inv, isAr);
  document.body.append(node);

  try {
    // Wait for the web font so the Arabic is shaped in Cairo, not a fallback, when it is photographed.
    await document.fonts?.ready;
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const width = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const height = (canvas.height * width) / canvas.width;
    const image = canvas.toDataURL('image/jpeg', 0.92);

    // One long image sliced across as many A4 pages as it needs.
    for (let offset = 0, page = 0; offset < height; offset += pageHeight, page++) {
      if (page > 0) pdf.addPage();
      pdf.addImage(image, 'JPEG', 0, -offset, width, height);
    }

    pdf.save(`deilar-${inv.code ? `order-${inv.code}` : 'order-summary'}.pdf`);
  } finally {
    node.remove();
  }
}
