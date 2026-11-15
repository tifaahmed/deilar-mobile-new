export const REFERRAL_SUBJECT = 'ترشيح عميل لمقدم خدمة';

/**
 * The inbox message for one recommendation. The staff ring the PROVIDER (so its phone is the message's phone and its name the
 * message's name); who recommended it, and their card, ride in the text so they get the discount.
 */
export function referralMessage(input: { providerName?: string; providerPhone: string; from: { name?: string; phone?: string; card?: string }; isAr?: boolean }): string {
  const { providerName, providerPhone, from, isAr = true } = input;
  const named = providerName?.trim() || '';
  // The first line stays the fixed Arabic subject: the staff inbox files the message by it.
  if (!isAr) {
    return [
      REFERRAL_SUBJECT,
      `Provider: ${named || '—'}`,
      `Provider phone: ${providerPhone}`,
      `Recommended by: ${from.name || '—'}${from.phone ? ` — ${from.phone}` : ''}${from.card ? ` — card ${from.card}` : ''}`,
    ].join('\n');
  }
  return [
    `مقدم الخدمة: ${named || '—'}`,
    `تليفون مقدم الخدمة: ${providerPhone}`,
    `المرشِّح: ${from.name || '—'}${from.phone ? ` — ${from.phone}` : ''}${from.card ? ` — كارت ${from.card}` : ''}`,
  ].join('\n');
}

/** Egyptian mobile or landline, with or without +20 / spaces. */
export const isValidProviderPhone = (value: string) => /^\+?\d{8,15}$/.test(value.replace(/[\s-]/g, ''));
