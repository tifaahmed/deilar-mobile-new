/** The kinds of place a member can recommend. */
export const REFERRAL_KINDS = ['medical', 'restaurant', 'entertainment'] as const;
export type ReferralKind = (typeof REFERRAL_KINDS)[number];

export const REFERRAL_SUBJECT = 'ترشيح عميل لمقدم خدمة';

const KIND_LABEL: Record<ReferralKind, { ar: string; en: string }> = {
  medical: { ar: 'طبي', en: 'Medical' },
  restaurant: { ar: 'مطاعم', en: 'Restaurants' },
  entertainment: { ar: 'ترفيهي', en: 'Entertainment' },
};
export const referralKindLabel = (kind: ReferralKind, isAr: boolean) => (isAr ? KIND_LABEL[kind].ar : KIND_LABEL[kind].en);

/**
 * The inbox message for one recommendation. The staff ring the PROVIDER (so its phone is the message's phone and its name the
 * message's name); who recommended it, and their card, ride in the text so they get the discount.
 */
export function referralMessage(input: { providerName: string; providerPhone: string; kind: ReferralKind; from: { name?: string; phone?: string; card?: string } }): string {
  const { providerName, providerPhone, kind, from } = input;
  return [
    REFERRAL_SUBJECT,
    `نوع المكان: ${referralKindLabel(kind, true)}`,
    `مقدم الخدمة: ${providerName}`,
    `تليفون مقدم الخدمة: ${providerPhone}`,
    `المرشِّح: ${from.name || '—'}${from.phone ? ` — ${from.phone}` : ''}${from.card ? ` — كارت ${from.card}` : ''}`,
  ].join('\n');
}

/** Egyptian mobile or landline, with or without +20 / spaces. */
export const isValidProviderPhone = (value: string) => /^\+?\d{8,15}$/.test(value.replace(/[\s-]/g, ''));
