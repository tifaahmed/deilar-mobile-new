import React, { useEffect, useRef } from 'react';
import { Link } from '../router';
import { useLanguage } from '../context/LanguageContext';
import { serviceTileStyle, type ServiceKind } from '../utils/serviceTileStyle';

export interface ServiceChip { kind: ServiceKind; id: number; name: string }

const SPEED = 3.5; // px per frame while it drifts by itself
const RESUME_MS = 2500; // how long after the last touch it starts drifting again

/**
 * Endless strip of big square tiles, one per kind of medical place or store. It drifts by itself; a finger
 * (or a mouse drag) takes it over and moves it either way, and it drifts on again a moment after letting go.
 * A tap opens the tile's place: medical → the map filtered by that type, store → the stores map filtered by
 * that category. The list is drawn twice, and the position wraps at the half, so it never ends.
 */
export const ServiceSlider: React.FC<{ chips: ServiceChip[] }> = ({ chips }) => {
  const { isAr } = useLanguage();
  const dir = isAr ? -1 : 1; // Arabic drifts the other way
  const box = useRef<HTMLDivElement>(null);
  const holding = useRef(false);
  const resumeAt = useRef(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  useEffect(() => {
    const el = box.current;
    if (!el || chips.length === 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let exact = 0;
    let started = false;
    const tick = () => {
      const half = el.scrollWidth / 2;
      if (half > 0 && !started) { started = true; if (dir < 0) el.scrollLeft = half; exact = el.scrollLeft; }
      if (!holding.current && Date.now() >= resumeAt.current) {
        // scrollLeft rounds to whole pixels on some screens, so the fraction is kept here.
        exact = (Math.abs(el.scrollLeft - exact) > 1 ? el.scrollLeft : exact) + SPEED * dir;
        el.scrollLeft = exact;
      } else {
        exact = el.scrollLeft;
      }
      if (half > 0) {
        if (el.scrollLeft >= half && started && exact > 0) { el.scrollLeft -= half; exact = el.scrollLeft; }
        else if (el.scrollLeft <= 0 && started && (dir < 0 || resumeAt.current > 0)) { el.scrollLeft += half; exact = el.scrollLeft; }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [chips.length, dir]);

  if (chips.length === 0) return null;

  const hold = () => { holding.current = true; };
  const release = () => { holding.current = false; resumeAt.current = Date.now() + RESUME_MS; };

  let medicalIndex = 0;
  let storeIndex = 0;
  const tiles = chips.map((c) => ({ ...c, ...serviceTileStyle(c.kind, c.name, c.kind === 'medical' ? medicalIndex++ : storeIndex++) }));

  return (
    <div
      ref={box}
      dir="ltr"
      className="overflow-x-auto rounded-2xl py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-x pan-y' }}
      onTouchStart={hold}
      onTouchEnd={release}
      onTouchCancel={release}
      onWheel={() => { resumeAt.current = Date.now() + RESUME_MS; }}
      // Mouse drag (touch scrolls natively).
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse' || !box.current) return;
        hold();
        drag.current = { x: e.clientX, left: box.current.scrollLeft, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || !box.current) return;
        const dx = e.clientX - d.x;
        if (Math.abs(dx) > 5) d.moved = true;
        box.current.scrollLeft = d.left - dx;
      }}
      onPointerUp={() => { if (drag.current) { justDragged.current = drag.current.moved; drag.current = null; release(); } }}
      onPointerLeave={() => { if (drag.current) { justDragged.current = drag.current.moved; drag.current = null; release(); } }}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="flex w-max items-stretch gap-2.5">
        {[...tiles, ...tiles].map((t, i) => {
          const Icon = t.icon;
          return (
            <Link
              key={`${t.kind}-${t.id}-${i}`}
              to={t.kind === 'medical' ? { tab: 'map', typeId: t.id } : { tab: 'store', storeMap: true, storeCategory: t.id }}
              onClick={(e) => { if (justDragged.current) { e.preventDefault(); justDragged.current = false; } }}
              draggable={false}
              className={`relative w-28 h-28 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br ${t.gradient} shadow-sm flex flex-col items-center justify-between px-1.5 pt-3 pb-2 active:scale-95 transition-transform`}
            >
              {/* floating icons behind */}
              {t.decor.map((D, k) => (
                <D key={k} aria-hidden="true" className="deilar-float absolute text-white/25" style={{ width: 16 + k * 4, height: 16 + k * 4, left: `${12 + k * 32}%`, top: `${58 - k * 22}%`, animationDelay: `${k * -1.3}s`, animationDuration: `${4 + k}s` }} />
              ))}
              <Icon aria-hidden="true" className="relative w-12 h-12 text-white drop-shadow" strokeWidth={1.75} />
              <span className="relative w-full text-center text-[11px] font-black leading-tight text-white line-clamp-2" dir="rtl">{t.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
