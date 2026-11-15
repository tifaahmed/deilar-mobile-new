import { useSyncExternalStore } from 'react';

/**
 * True while a quiz play is running (from the countdown to the last answer). The app hides its fixed icons (bottom bar,
 * contact / refer buttons) and every notice meanwhile, so nothing distracts the player.
 */
let playing = false;
const listeners = new Set<() => void>();

export function setQuizPlaying(value: boolean): void {
  if (playing === value) return;
  playing = value;
  listeners.forEach((l) => l());
}

export const useQuizPlaying = (): boolean =>
  useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => playing, () => false);
