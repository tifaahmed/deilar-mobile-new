import { useSyncExternalStore } from 'react';

/** What the discount popup draws: a title, a few label/value rows (the numbers) and a short explanation. */
export interface DiscountInfo {
  title: string;
  /** Why the discount exists. */
  why: string;
  /** The numbers: "was", "now", "saved"… */
  rows?: { label: string; value: string }[];
}

let current: DiscountInfo | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export const openDiscountInfo = (info: DiscountInfo) => {
  current = info;
  emit();
};
export const closeDiscountInfo = () => {
  current = null;
  emit();
};
export const useDiscountInfo = () =>
  useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );

const money = (n: number) => `${Math.round(n * 100) / 100}`;

/** A product's member price: what it costs, what the card brings it to, what is saved. */
export function productDiscountInfo(
  p: { name?: string; was: number | null; now: number | null; percent: number | null },
  member: boolean,
  isAr: boolean,
): DiscountInfo {
  const cur = isAr ? 'ج.م' : 'EGP';
  const rows: DiscountInfo['rows'] = [];
  if (p.was != null) rows.push({ label: isAr ? 'السعر الأصلي' : 'Original price', value: `${money(p.was)} ${cur}` });
  if (p.now != null) rows.push({ label: member ? (isAr ? 'سعرك بالكارت' : 'Your card price') : (isAr ? 'سعر العضو بالكارت' : 'Price with a card'), value: `${money(p.now)} ${cur}` });
  if (p.was != null && p.now != null && p.was > p.now) rows.push({ label: isAr ? 'التوفير' : 'You save', value: `${money(p.was - p.now)} ${cur}${p.percent != null ? ` (${p.percent}%)` : ''}` });
  return {
    title: isAr ? 'الخصم ده جاي منين؟' : 'Where does this discount come from?',
    why: member
      ? (isAr ? 'ده سعر العضو: بتاخده لأن كارت ديلر بتاعك شغال. لو الكارت خلص بتدفع السعر الأصلي.' : 'This is the member price: you get it because your Deilar card is active. If the card expires you pay the original price.')
      : (isAr ? 'ده سعر أعضاء كارت ديلر. من غير كارت بتدفع السعر الأصلي، ولما يبقى معاك كارت شغال السعر بينزل لوحده.' : 'This is the price for Deilar card members. Without a card you pay the original price; with an active card it drops by itself.'),
    rows,
  };
}

/** A store's or provider's offer: how much, and what you must do to get it. */
export function offerDiscountInfo(p: { name?: string; label: string }, isAr: boolean): DiscountInfo {
  return {
    title: isAr ? 'الخصم ده جاي منين؟' : 'Where does this discount come from?',
    why: isAr
      ? `${p.name ? `${p.name} ` : 'المكان ده '}بيدي حاملي كارت ديلر خصم. وري الكارت ورقم العضوية وانت بتدفع وهتاخد الخصم. الكارت المنتهي مالوش خصم لحد ما يتجدد.`
      : `${p.name ? `${p.name} ` : 'This place '}gives Deilar card holders a discount. Show your card and membership number when you pay. An expired card gets no discount until it is renewed.`,
    rows: [{ label: isAr ? 'الخصم' : 'Discount', value: p.label }],
  };
}

/** Loyalty points or wallet money taken off an order. */
export function paymentDiscountInfo(kind: 'points' | 'wallet' | 'card', rows: { label: string; value: string }[], isAr: boolean): DiscountInfo {
  const why = {
    points: isAr ? 'إنت دوست «استخدم نقاط الولاء»، فالنقاط اتحولت لخصم من سعر المنتجات اللي بتقبلها. النقاط ما بتتخصمش لوحدها.' : 'You pressed “Use my loyalty points”, so points were turned into a discount on products that accept them. Points are never spent on their own.',
    wallet: isAr ? 'إنت دوست «ادفع من محفظتي»، فجزء من الفاتورة اتدفع من رصيد محفظتك. مفيش رسوم توصيل بتتدفع من المحفظة.' : 'You pressed “Pay from my wallet”, so part of the bill is paid from your wallet balance. Delivery is never paid from the wallet.',
    card: isAr ? 'ده الفرق بين السعر الأصلي وسعر العضو، وبتاخده لأن كارت ديلر بتاعك شغال.' : 'This is the difference between the original price and the member price; you get it because your Deilar card is active.',
  }[kind];
  return { title: isAr ? 'الخصم ده اتحسب إزاي؟' : 'How was this discount worked out?', why, rows };
}
