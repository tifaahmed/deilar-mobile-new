import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

/**
 * Floating round buttons the member can drag anywhere on the screen (owner request 2026-11-17).
 *  - A press without moving still clicks; moving more than a few pixels drags (and swallows the click).
 *  - The place is kept on the phone (`deilar_fab_positions`, per button id), so it survives every reload.
 *  - Two floating buttons never sit on top of each other: a drop onto another one slides to the nearest free spot, and a saved
 *    place that now collides (another button, another page) is settled the same way.
 * Positions are `left` + `bottom` in pixels, so a button whose panel opens upwards keeps its bottom edge still.
 */

const KEY = 'deilar_fab_positions';
const GAP = 8;
const EDGE = 4;
/** Room kept under every button for the bottom bar, and above for the header. */
const BOTTOM_KEEP = 76;
const TOP_KEEP = 56;
const THRESHOLD = 6;

export interface FabPos { left: number; bottom: number }

const roots = new Map<string, () => DOMRect | null>();

const readAll = (): Record<string, FabPos> => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, FabPos>;
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
};
const writeOne = (id: string, pos: FabPos) => {
  try { localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [id]: pos })); } catch { /* private mode: the place just is not kept */ }
};

const clamp = (pos: FabPos, w: number, h: number): FabPos => ({
  left: Math.min(Math.max(pos.left, EDGE), Math.max(EDGE, window.innerWidth - w - EDGE)),
  bottom: Math.min(Math.max(pos.bottom, BOTTOM_KEEP), Math.max(BOTTOM_KEEP, window.innerHeight - h - TOP_KEEP)),
});

const rectAt = (pos: FabPos, w: number, h: number) => ({ l: pos.left, r: pos.left + w, t: window.innerHeight - pos.bottom - h, b: window.innerHeight - pos.bottom });
const hits = (a: ReturnType<typeof rectAt>, o: DOMRect) => a.l < o.right + GAP && a.r > o.left - GAP && a.t < o.bottom + GAP && a.b > o.top - GAP;

/** The free place nearest to `want`, or null when the screen has none. */
export const settle = (id: string, want: FabPos, w: number, h: number): FabPos | null => {
  const others = [...roots.entries()].filter(([k]) => k !== id).map(([, get]) => get()).filter((r): r is DOMRect => !!r && r.width > 0);
  const start = clamp(want, w, h);
  const free = (p: FabPos) => !others.some((o) => hits(rectAt(p, w, h), o));
  if (free(start)) return start;

  const candidates: FabPos[] = [];
  for (const o of others) {
    const bottomOf = (top: number) => window.innerHeight - top; // `bottom` for a box whose top edge is `top`
    candidates.push(
      { left: start.left, bottom: bottomOf(o.top - GAP) },            // just above
      { left: start.left, bottom: window.innerHeight - o.bottom - GAP - h }, // just below
      { left: o.right + GAP, bottom: start.bottom },                  // to its right
      { left: o.left - GAP - w, bottom: start.bottom },               // to its left
    );
  }
  const ok = candidates.map((c) => clamp(c, w, h)).filter(free);
  if (ok.length === 0) return null;
  return ok.sort((a, b) => Math.hypot(a.left - start.left, a.bottom - start.bottom) - Math.hypot(b.left - start.left, b.bottom - start.bottom))[0];
};

/**
 * Round button: `<button {...fab.props({ left: '...' })} />`. A button inside a bigger fixed box: `ref={fab.setRoot} style={fab.style}` on the box and
 * `{...fab.handle} style={{ touchAction: 'none' }}` on the button.
 * `style` is empty until the member has placed the button, so its default CSS place keeps working for everyone else.
 */
export function useFab(id: string) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<FabPos | null>(() => readAll()[id] ?? null);
  const drag = useRef<{ x: number; y: number; left: number; bottom: number; moved: boolean; pointer: number } | null>(null);
  const swallow = useRef(false);

  const size = () => { const r = rootRef.current?.getBoundingClientRect(); return { w: r?.width ?? 40, h: r?.height ?? 40 }; };

  const setRoot = useCallback((el: HTMLElement | null) => {
    rootRef.current = el;
    if (el) roots.set(id, () => rootRef.current?.getBoundingClientRect() ?? null);
    else roots.delete(id);
  }, [id]);

  // Settle a saved place on mount / resize: inside the screen and clear of the other buttons.
  useEffect(() => {
    const fix = () => {
      if (!rootRef.current || drag.current) return;
      setPos((cur) => {
        if (!cur) return cur;
        const { w, h } = size();
        const next = settle(id, cur, w, h) ?? clamp(cur, w, h);
        return next.left === cur.left && next.bottom === cur.bottom ? cur : next;
      });
    };
    const t = window.setTimeout(fix, 300); // after the other buttons have mounted
    window.addEventListener('resize', fix);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', fix); };
  }, [id]);

  const handle = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const r = rootRef.current?.getBoundingClientRect();
      if (!r) return;
      drag.current = { x: e.clientX, y: e.clientY, left: r.left, bottom: window.innerHeight - r.bottom, moved: false, pointer: e.pointerId };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d || d.pointer !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < THRESHOLD) return;
      if (!d.moved) { d.moved = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* not capturable */ } }
      const { w, h } = size();
      setPos(clamp({ left: d.left + dx, bottom: d.bottom - dy }, w, h));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      drag.current = null;
      if (!d || !d.moved) return;
      swallow.current = true;
      window.setTimeout(() => { swallow.current = false; }, 0);
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const { w, h } = size();
      const dropped = clamp({ left: d.left + (e.clientX - d.x), bottom: d.bottom - (e.clientY - d.y) }, w, h);
      // On another button: slide to the nearest free place, or go back to where it was.
      const final = settle(id, dropped, w, h) ?? clamp({ left: d.left, bottom: d.bottom }, w, h);
      setPos(final);
      writeOne(id, final);
    },
    onPointerCancel: () => { drag.current = null; },
    // The click that ends a drag is not a press of the button.
    onClickCapture: (e: React.MouseEvent) => { if (swallow.current) { e.preventDefault(); e.stopPropagation(); } },
  };

  const style: React.CSSProperties = pos ? { left: pos.left, bottom: pos.bottom, top: 'auto', right: 'auto', insetInlineEnd: 'auto', insetInlineStart: 'auto' } : {};

  /** For a button that is both the moved element and the pressed one: spread it, giving the button's own default inline style as `extra`. */
  const props = (extra: React.CSSProperties = {}) => ({ ref: setRoot as React.RefCallback<HTMLButtonElement>, ...handle, style: { ...extra, ...style, touchAction: 'none' } as React.CSSProperties });

  return { setRoot, handle, style, pos, props };
}
