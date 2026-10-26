import { forgetCached } from '../api/http';

const EVENT = 'deilar-membership-changed';

/**
 * A payment just finished (or the member came back from Paymob's own page): whatever draws the card's state — the trial
 * banner, the reminder — must read it again. The money is confirmed by Paymob's callback on the server, which can land
 * a moment after the form closes, so listeners re-read a few times.
 */
export const notifyMembershipChanged = () => {
  forgetCached('/mobile/card/');
  window.dispatchEvent(new Event(EVENT));
};

/** Re-reads right away and again after the callback has had time to land. Returns the unsubscribe. */
export function onMembershipChanged(reread: () => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const handler = () => {
    timers.splice(0).forEach(clearTimeout);
    reread();
    [3_000, 8_000, 15_000].forEach((ms) => timers.push(setTimeout(() => { forgetCached('/mobile/card/'); reread(); }, ms)));
  };

  window.addEventListener(EVENT, handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    timers.forEach(clearTimeout);
  };
}
