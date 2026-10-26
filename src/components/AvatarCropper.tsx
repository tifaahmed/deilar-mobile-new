import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/** On-screen size of the circle the member frames their face in, and the size of the picture that is uploaded. */
const VIEW = 260;
const OUTPUT = 512;

interface AvatarCropperProps {
  file: File;
  /** The picture, already cut to a circle (PNG with transparent corners). */
  onConfirm: (cropped: File) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Shows the chosen photo inside a circle before anything is uploaded: drag to move it, slide to zoom.
 * "Use photo" cuts exactly what is inside the circle, so what the member sees here is what the app shows.
 */
export const AvatarCropper: React.FC<AvatarCropperProps> = ({ file, onConfirm, onCancel }) => {
  const { isAr } = useLanguage();
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The picture always covers the circle: at zoom 1 its short side is exactly the circle's width.
  const base = natural ? VIEW / Math.min(natural.w, natural.h) : 1;
  const scale = base * zoom;
  const width = natural ? natural.w * scale : VIEW;
  const height = natural ? natural.h * scale : VIEW;

  const clamp = (x: number, y: number) => ({
    x: Math.min((width - VIEW) / 2, Math.max(-(width - VIEW) / 2, x)),
    y: Math.min((height - VIEW) / 2, Math.max(-(height - VIEW) / 2, y)),
  });

  // Zooming out must not leave a gap inside the circle.
  useEffect(() => { setOffset((o) => clamp(o.x, o.y)); }, [zoom, natural]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp(drag.current.ox + e.clientX - drag.current.x, drag.current.oy + e.clientY - drag.current.y));
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = async () => {
    const img = imgRef.current;
    if (!img || !natural || busy) return;
    setBusy(true);
    setFailed(false);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas');

      const ratio = OUTPUT / VIEW;
      ctx.beginPath();
      ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, (VIEW / 2 + offset.x - width / 2) * ratio, (VIEW / 2 + offset.y - height / 2) * ratio, width * ratio, height * ratio);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not cut the photo');
      await onConfirm(new File([blob], 'avatar.png', { type: 'image/png' }));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4" dir={isAr ? 'rtl' : 'ltr'} role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-white rounded-3xl p-5 space-y-4 text-center">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">{isAr ? 'اضبط صورتك الشخصية' : 'Adjust your photo'}</h3>
          <button type="button" onClick={onCancel} aria-label={isAr ? 'إغلاق' : 'Close'} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className="relative mx-auto rounded-full overflow-hidden bg-slate-200 touch-none cursor-grab active:cursor-grabbing ring-4 ring-[#941946]/30"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="absolute max-w-none select-none pointer-events-none"
              style={{ width, height, left: VIEW / 2 + offset.x - width / 2, top: VIEW / 2 + offset.y - height / 2 }}
            />
          )}
        </div>

        <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label={isAr ? 'تكبير' : 'Zoom'} className="w-full accent-[#941946]" />
        <p className="text-[11px] text-slate-500">{isAr ? 'حرّك الصورة وكبّرها لتظهر داخل الدائرة كما تريد' : 'Drag and zoom so your face sits inside the circle'}</p>

        {failed && <p role="alert" className="text-[11px] font-bold text-rose-600">{isAr ? 'تعذر رفع الصورة، حاول مرة أخرى.' : 'The photo could not be uploaded, please try again.'}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="py-3 rounded-2xl bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer">
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button type="button" onClick={confirm} disabled={busy || !natural} className="py-3 rounded-2xl bg-[#941946] hover:bg-[#7b1439] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isAr ? 'استخدم الصورة' : 'Use photo'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
