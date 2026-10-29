import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ImageViewerProps {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MAX_SCALE = 5;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const dist = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

/**
 * Full-screen photo viewer inside the app, so a photo never sends the member out to the browser.
 * Pinch, double-tap or mouse wheel to zoom; drag to move around a zoomed photo; tap outside to close.
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({ images, index, onIndexChange, onClose }) => {
  const { isAr } = useLanguage();
  const last = images.length - 1;
  const go = (step: number) => onIndexChange(Math.min(last, Math.max(0, index + step)));

  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const gesture = useRef<{ pinch?: { d: number; scale: number }; pan?: { x: number; y: number; vx: number; vy: number }; lastTap: number; moved: boolean }>({ lastTap: 0, moved: false });

  // Another photo starts un-zoomed.
  useEffect(() => setView({ scale: 1, x: 0, y: 0 }), [index]);

  const zoomTo = (scale: number) => setView((v) => (scale <= 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale: clamp(scale, 1, MAX_SCALE) }));

  const onTouchStart = (e: React.TouchEvent) => {
    const g = gesture.current;
    g.moved = false;
    if (e.touches.length === 2) {
      g.pinch = { d: dist(e.touches[0], e.touches[1]), scale: view.scale };
      g.pan = undefined;
    } else if (e.touches.length === 1) {
      g.pan = { x: e.touches[0].clientX, y: e.touches[0].clientY, vx: view.x, vy: view.y };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesture.current;
    g.moved = true;
    if (e.touches.length === 2 && g.pinch) {
      zoomTo(g.pinch.scale * (dist(e.touches[0], e.touches[1]) / g.pinch.d));
    } else if (e.touches.length === 1 && g.pan && view.scale > 1) {
      setView((v) => ({ ...v, x: g.pan!.vx + e.touches[0].clientX - g.pan!.x, y: g.pan!.vy + e.touches[0].clientY - g.pan!.y }));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesture.current;
    if (e.touches.length === 0) {
      // A quick second tap on the photo toggles zoom.
      if (!g.moved && !g.pinch) {
        const now = Date.now();
        if (now - g.lastTap < 300) { zoomTo(view.scale > 1 ? 1 : 2.5); g.lastTap = 0; } else g.lastTap = now;
      }
      g.pinch = undefined;
      g.pan = undefined;
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(isAr ? -1 : 1);
      if (e.key === 'ArrowLeft') go(isAr ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Portalled to <body> so a modal's transform or backdrop click can't trap or close it.
  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); onClose(); }} onWheel={(e) => zoomTo(view.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))} role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 rounded-full bg-white/15 text-white cursor-pointer">
        <X className="w-5 h-5" />
      </button>
      <img
        src={images[index]}
        alt=""
        draggable={false}
        className="max-w-full max-h-full object-contain select-none"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, touchAction: 'none', transition: gesture.current.pan || gesture.current.pinch ? 'none' : 'transform 0.2s' }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => { e.stopPropagation(); zoomTo(view.scale > 1 ? 1 : 2.5); }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />
      {index > 0 && (
        <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-3 p-2 rounded-full bg-white/15 text-white cursor-pointer" aria-label="Previous">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {index < last && (
        <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-3 p-2 rounded-full bg-white/15 text-white cursor-pointer" aria-label="Next">
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      <span className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] text-xs font-bold text-white/80">{index + 1} / {images.length}</span>
    </div>,
    document.body,
  );
};
