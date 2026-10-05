import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FreeCardRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRegister?: (phone: string, name?: string) => void;
}

export const FreeCardRequestModal: React.FC<FreeCardRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccessRegister,
}) => {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [membershipId, setMembershipId] = useState('');
  const { isAr, t, brandName } = useLanguage();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsSubmitting(true);

    setTimeout(() => {
      const generatedMemId = `MEM-${Math.floor(1000 + Math.random() * 9000)}`;
      setMembershipId(generatedMemId);
      setIsSubmitting(false);
      setIsSuccess(true);

      try {
        localStorage.setItem('deilar_user_registered', 'true');
        localStorage.setItem('deilar_user_phone', phone.trim());
        localStorage.setItem('deilar_membership_id', generatedMemId);
      } catch (err) {
        console.error('Storage error:', err);
      }

      if (onSuccessRegister) {
        onSuccessRegister(phone.trim());
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className={`bg-slate-950 text-white rounded-3xl max-w-[310px] w-full border border-amber-400/40 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-150 ${isAr ? 'text-right' : 'text-left'}`}>
        
        {/* Top Header: Title & Close Button */}
        <div className="px-3.5 pt-3 pb-2 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <h3 className="text-xs font-black text-amber-300">
              {isAr ? `اطلب كرت ${brandName} مجاناً` : `Get your free ${brandName} card`}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors text-xs cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3.5 space-y-3">
          {!isSuccess ? (
            <>
              {/* 3D Spinning Rotating Card Animation */}
              <div className="flex justify-center py-1">
                <div className="perspective-1000 w-44 h-26 relative">
                  <div className="w-full h-full animate-spin-card transform-style-3d relative">
                    {/* Front Face */}
                    <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-xl border border-amber-300/80 backface-hidden">
                      <img
                        src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
                        alt="Deilar Card Front"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Back Face */}
                    <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-xl border border-amber-300/80 backface-hidden rotate-y-180">
                      <img
                        src="/src/assets/images/deilar_card_back_official_1791012725831.jpg"
                        alt="Deilar Card Back"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Phone Input Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <div className="relative">
                    <Phone className={`w-3.5 h-3.5 text-amber-400 absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
                    <input
                      type="tel"
                      required
                      autoFocus
                      dir="ltr"
                      placeholder={t('freeCardPhonePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full ${isAr ? 'pr-8 pl-3 text-right' : 'pl-8 pr-3 text-left'} py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-mono tracking-wider focus:outline-none focus:border-amber-400 transition-colors`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !phone.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? t('freeCardSubmitting') : t('freeCardSubmit')}</span>
                </button>
              </form>
            </>
          ) : (
            /* Compact Success View */
            <div className="py-2 text-center space-y-2.5 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-xs font-black text-white">{t('freeCardSuccessTitle')}</h4>
                <p className="text-[10px] text-amber-300 font-mono mt-0.5 font-bold">
                  {membershipId}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{t('enterAppAction')}</span>
                <ArrowLeft className={`w-3 h-3 ${isAr ? '' : 'rotate-180'}`} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
