import React, { useRef, useState } from 'react';
import { ChevronsDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/** A short buzz under the finger (Android; silently nothing where the phone has no vibration). */
const buzz = (ms: number | number[]) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no vibration here */
  }
};

/** How far (px) the grip must be pulled before letting go opens the list. */
const OPEN_AT = 56;
/** The grip never travels farther than this, however far the finger goes. */
const MAX_PULL = 110;

/**
 * A grip on the right edge of the map: pull it DOWN to jump to the list under the map (the same as the bar below it).
 * It follows the finger with a little resistance, buzzes when grabbed, ticks once when it has been pulled far enough,
 * and springs back; an idle nudge shows it can be pulled.
 */
export const MapListHandle: React.FC<{ onOpen: () => void; visible: boolean }> = ({ onOpen, visible }) => {
  const { isAr } = useLanguage();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const armed = useRef(false);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = e.clientY;
    armed.current = false;
    setDragging(true);
    buzz(12);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    const raw = Math.max(0, e.clientY - start.current);
    // Resistance: the farther it goes, the heavier it feels.
    const eased = Math.min(MAX_PULL, raw * (1 - Math.min(0.5, raw / 400)));
    setPull(eased);
    if (eased >= OPEN_AT && !armed.current) {
      armed.current = true;
      buzz([18, 30, 18]);
    } else if (eased < OPEN_AT && armed.current) {
      armed.current = false;
    }
  };

  const up = () => {
    if (start.current === null) return;
    const open = armed.current;
    start.current = null;
    armed.current = false;
    setDragging(false);
    setPull(0);
    if (open) onOpen();
  };

  if (!visible) return null;

  const progress = Math.min(1, pull / OPEN_AT);

  return (
    <div
      data-testid="map-list-handle"
      role="button"
      tabIndex={0}
      aria-label={isAr ? 'اسحب لتحت عشان تشوف القايمة' : 'Pull down to see the list'}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      style={{
        transform: `translateY(${pull}px)`,
        transition: dragging ? 'none' : 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        touchAction: 'none',
      }}
      className="absolute right-0 top-[38%] z-[460] select-none cursor-grab active:cursor-grabbing"
    >
      <div className={`flex flex-col items-center gap-1 rounded-l-2xl px-1.5 py-3 shadow-lg shadow-rose-900/30 border border-white/30 backdrop-blur-sm ${progress >= 1 ? 'bg-emerald-600' : 'bg-[#941946]/95'} text-white ${dragging ? '' : 'animate-[mapHandleNudge_3.2s_ease-in-out_infinite]'}`}>
        <span className="flex flex-col gap-[3px]" aria-hidden="true">
          <span className="block w-4 h-[3px] rounded-full bg-white/80" />
          <span className="block w-4 h-[3px] rounded-full bg-white/80" />
          <span className="block w-4 h-[3px] rounded-full bg-white/80" />
        </span>
        <ChevronsDown className="w-4 h-4" style={{ transform: `translateY(${progress * 4}px)` }} aria-hidden="true" />
      </div>
    </div>
  );
};
