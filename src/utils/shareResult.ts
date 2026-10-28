/** Where the shared message sends people. */
export const SHARE_URL = 'https://www.deilar.com';

export type ShareOutcome = 'shared' | 'copied' | 'whatsapp' | 'cancelled';

/** The message that goes with a play's result. */
export function resultShareText(score: number, right: number, total: number, emoji: string, topic = 'الأسئلة'): string {
  const points = score > 0 ? `+${score}` : `${score}`;
  return `لعبت تحدي ${topic} في تطبيق ديلار ${emoji}\nجبت ${points} نقطة ولاء (${right} إجابة صح من ${total}).\nتقدر تجيب أكتر مني؟ 💪`;
}

const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${SHARE_URL}`)}`;

/**
 * Shares the result the best way the device allows: the phone's own share sheet, else the clipboard, else a WhatsApp
 * link. Never throws; `cancelled` means the player closed the share sheet.
 */
export async function shareResult(text: string): Promise<ShareOutcome> {
  const payload = { title: 'ديلار', text, url: SHARE_URL };

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(payload))) {
      await navigator.share(payload);
      return 'shared';
    }
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') return 'cancelled';
    // Any other failure of the share sheet: try the next way.
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`);
    return 'copied';
  } catch {
    window.open(whatsappLink(text), '_blank', 'noopener');
    return 'whatsapp';
  }
}
