import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSwipeDismiss } from '../hooks/useSwipeDismiss';

/** Every app notification stacks here, at the top, one under the other. */
export const NoticeStack: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed top-[calc(4rem+env(safe-area-inset-top))] inset-x-3 z-[999] max-w-md mx-auto flex flex-col gap-1.5 pointer-events-none">{children}</div>
);

interface NoticeProps {
  icon: React.ReactNode;
  /** Colours of the bar. */
  tone: string;
  /** Tap on the text: go to the page the notice is about. */
  onOpen: () => void;
  /** The X, or a sweep left/right. */
  onClose: () => void;
  closeLabel?: string;
  role?: 'status' | 'dialog' | 'alert';
  children: React.ReactNode;
}

/** A slim one-line notification: tap opens its page, the X or a sweep to either side dismisses it. */
export const Notice: React.FC<NoticeProps> = ({ icon, tone, onOpen, onClose, closeLabel, role = 'status', children }) => {
  const { isAr } = useLanguage();
  const swipe = useSwipeDismiss(onClose);

  return (
    <div
      role={role}
      {...swipe.handlers}
      style={swipe.style}
      className={`pointer-events-auto flex items-center gap-2 rounded-xl shadow-lg px-3 py-2 animate-in fade-in ${tone} ${isAr ? 'text-right' : 'text-left'}`}
    >
      <span className="shrink-0 flex">{icon}</span>
      <button onClick={onOpen} className="flex-1 min-w-0 truncate text-[11px] font-bold cursor-pointer text-start">
        {children}
      </button>
      <button onClick={onClose} aria-label={closeLabel ?? (isAr ? 'إغلاق' : 'Close')} className="opacity-70 hover:opacity-100 cursor-pointer shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
