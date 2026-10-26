import React from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PaymobPixel } from './PaymobPixel';
import { PaymobFrame } from './PaymobFrame';
import { usePopupHash } from '../utils/popupHash';

export interface PixelSession {
  clientSecret: string;
  publicKey: string;
  checkoutUrl: string | null;
  /** `frame`: the wallet page drawn in a frame (Pixel cannot draw wallets). Default: the Pixel card form. */
  mode?: 'pixel' | 'frame';
}

/** The embedded Paymob card form in a sheet over the current screen (subscribing / renewing a card). */
export const PayModal: React.FC<{ session: PixelSession; onClose: () => void; onComplete: () => void; check?: () => Promise<boolean> }> = ({ session, onClose, onComplete, check }) => {
  usePopupHash('pay-popup');
  const { isAr } = useLanguage();

  return (
    <div className="fixed inset-0 z-[999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-white w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-4 space-y-3 ${isAr ? 'text-right' : 'text-left'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">{session.mode === 'frame' ? (isAr ? 'الدفع بالمحفظة' : 'Pay by wallet') : isAr ? 'الدفع بالبطاقة' : 'Pay by card'}</h3>
          <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'} className="text-slate-500 hover:text-slate-900 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {session.mode === 'frame' && session.checkoutUrl ? (
          <PaymobFrame url={session.checkoutUrl} check={check} onComplete={onComplete} />
        ) : (
          <PaymobPixel publicKey={session.publicKey} clientSecret={session.clientSecret} fallbackUrl={session.checkoutUrl} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
};
