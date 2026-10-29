import type { AccessStep } from '../components/AccessModal';

const EVENT = 'deilar-access-requested';

/** Asks the app to open the sign-in popup at `step` (a reminder somewhere else in the tree cannot open it itself). */
export const requestAccess = (step: AccessStep) => window.dispatchEvent(new CustomEvent<AccessStep>(EVENT, { detail: step }));

/** Returns the unsubscribe. */
export function onAccessRequested(open: (step: AccessStep) => void): () => void {
  const handler = (e: Event) => open((e as CustomEvent<AccessStep>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
