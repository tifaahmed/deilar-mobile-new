import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { PLAY_STORE_URL } from './forceUpdate';
import { blobToBase64, resultImage } from './shareImage';
import type { Scene } from '../data/pointsScenes';

/** Where the shared message sends people: the app's store page, so whoever gets it can download the app. */
export const SHARE_URL = PLAY_STORE_URL;

export type ShareOutcome = 'shared' | 'copied' | 'whatsapp' | 'cancelled';

/**
 * The message that goes with a play's result: what was played, the points, that Deilar is a discount card, and the
 * link to download the app. `right` is left out when it is not known (a result opened from the gallery).
 */
export function resultShareText(score: number, right: number | null, total: number, emoji: string, topic = 'الأسئلة', isAr = true): string {
  const points = Math.max(0, Math.round(score));
  if (!isAr) {
    const detail = right === null ? '' : ` (${right} right answers out of ${total})`;
    return `I played the ${topic} challenge in the Deilar app ${emoji}\nI earned ${points} loyalty points${detail}.\nDeilar is a discount card — download the app, play and collect points too 💪\n${SHARE_URL}`;
  }
  const detail = right === null ? '' : ` (${right} إجابة صح من ${total})`;
  return `لعبت تحدي ${topic} في تطبيق ديلر ${emoji}\nجبت ${points} نقطة ولاء${detail}.\nديلر كارت خصومات — حمّل التطبيق والعب واجمع نقاطك إنت كمان 💪\n${SHARE_URL}`;
}

const whatsappLink = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/**
 * Shares the result the best way the device allows, with the result picture and the message (which already holds the
 * app link): the phone's own share sheet (WhatsApp, Messenger, …), else the browser's, else the clipboard, else a
 * WhatsApp link. Never throws; `cancelled` means the player closed the share sheet.
 */
export async function shareResult(text: string, scene?: Scene, score = 0): Promise<ShareOutcome> {
  const isAr = /[\u0600-\u06ff]/.test(text);
  const title = isAr ? 'ديلر' : 'Deilar';
  const image = scene ? await resultImage(scene, score, isAr) : null;

  // The phone's share sheet, with the picture as a file in the cache.
  if (Capacitor.isNativePlatform()) {
    try {
      let files: string[] | undefined;
      if (image) {
        const saved = await Filesystem.writeFile({ path: `deilar-result-${score}.png`, data: await blobToBase64(image), directory: Directory.Cache });
        files = [saved.uri];
      }
      await Share.share({ title, text, files, dialogTitle: isAr ? 'شارك نتيجتك' : 'Share your result' });
      return 'shared';
    } catch (error) {
      if (/cancel/i.test(String((error as Error)?.message ?? error))) return 'cancelled';
      // The picture could not be shared: try the message alone, below.
    }
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const file = image ? new File([image], 'deilar-result.png', { type: 'image/png' }) : null;
      const withFile = file && navigator.canShare?.({ files: [file] }) ? { title, text, files: [file] } : { title, text };
      await navigator.share(withFile);
      return 'shared';
    }
  } catch (error) {
    if ((error as DOMException)?.name === 'AbortError') return 'cancelled';
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    window.open(whatsappLink(text), '_blank', 'noopener');
    return 'whatsapp';
  }
}
