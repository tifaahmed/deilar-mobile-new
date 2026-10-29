/**
 * THE RULE: a field being typed in is never hidden behind the on-screen keyboard.
 *
 * One listener for the whole app (installed in `main.tsx`), not code in each form: when any text field gets focus it is
 * scrolled to the middle of the visible area once the keyboard has opened, and again if the keyboard changes size
 * (`visualViewport` resize). `scrollIntoView` scrolls every scrollable ancestor, so it works in the page and inside
 * modals / bottom sheets alike. New forms get this for free; do not write per-form scroll code.
 */
const FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Inputs that open no keyboard. */
const NO_KEYBOARD = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range', 'color', 'image', 'hidden']);

/** The keyboard takes a moment to slide up; scrolling before it has the final height lands in the wrong place. */
export const KEYBOARD_DELAY_MS = 300;

const takesKeyboard = (el: Element | null): el is HTMLElement =>
  !!el && el.matches(FIELD) && !(el instanceof HTMLInputElement && NO_KEYBOARD.has(el.type)) && !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).readOnly;

export function installKeyboardGuard(doc: Document = document, win: Window = window): () => void {
  let current: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const reveal = (el: HTMLElement) => {
    if (!el.isConnected || doc.activeElement !== el) return;
    el.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  };

  const later = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => current && reveal(current), ms);
  };

  const onFocusIn = (e: FocusEvent) => {
    const target = e.target as Element | null;
    if (!takesKeyboard(target)) return;
    current = target;
    later(KEYBOARD_DELAY_MS);
  };
  const onFocusOut = () => {
    current = null;
    clearTimeout(timer);
  };
  const onViewport = () => current && later(100);

  doc.addEventListener('focusin', onFocusIn);
  doc.addEventListener('focusout', onFocusOut);
  win.visualViewport?.addEventListener('resize', onViewport);

  return () => {
    clearTimeout(timer);
    doc.removeEventListener('focusin', onFocusIn);
    doc.removeEventListener('focusout', onFocusOut);
    win.visualViewport?.removeEventListener('resize', onViewport);
  };
}
