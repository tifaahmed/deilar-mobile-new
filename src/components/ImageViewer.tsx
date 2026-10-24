import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ImageViewerProps {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Full-screen photo viewer inside the app, so a gallery photo never sends the member out to the browser. */
export const ImageViewer: React.FC<ImageViewerProps> = ({ images, index, onIndexChange, onClose }) => {
  const { isAr } = useLanguage();
  const last = images.length - 1;
  const go = (step: number) => onIndexChange(Math.min(last, Math.max(0, index + step)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(isAr ? -1 : 1);
      if (e.key === 'ArrowLeft') go(isAr ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 rounded-full bg-white/15 text-white cursor-pointer">
        <X className="w-5 h-5" />
      </button>
      <img src={images[index]} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
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
    </div>
  );
};
