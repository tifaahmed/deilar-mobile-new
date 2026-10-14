import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cardImageUrl } from '../api/auth';
import type { Beneficiary } from '../types';
import { OfficialDeilarCard } from './OfficialDeilarCard';

interface MembershipCardImageProps {
  number: string;
  /** Drawn locally if the real artwork cannot be loaded. */
  beneficiary: Beneficiary;
  isFlipped: boolean;
  onToggleFlip: () => void;
  className?: string;
}

/** The member's real card — front and back as rendered by the backend — with the same tap-to-flip as before. */
export const MembershipCardImage: React.FC<MembershipCardImageProps> = ({ number, beneficiary, isFlipped, onToggleFlip, className = '' }) => {
  const [frontReady, setFrontReady] = useState(false);
  const [frontFailed, setFrontFailed] = useState(false);
  const [backFailed, setBackFailed] = useState(false);
  // The back is rendered on demand by the server: only ask once someone actually flips.
  const [backWanted, setBackWanted] = useState(false);

  useEffect(() => {
    setFrontReady(false);
    setFrontFailed(false);
    setBackFailed(false);
    setBackWanted(false);
  }, [number]);

  useEffect(() => {
    if (isFlipped) setBackWanted(true);
  }, [isFlipped]);

  if (frontFailed) {
    return <OfficialDeilarCard beneficiary={beneficiary} isFlipped={isFlipped} onToggleFlip={onToggleFlip} className={className} />;
  }

  return (
    <div className={`perspective-1000 select-none ${className}`}>
      <div
        onClick={onToggleFlip}
        className={`relative w-full aspect-[1.62/1] rounded-2xl transition-transform duration-700 transform-style-3d cursor-pointer shadow-2xl ${isFlipped ? 'rotate-y-180' : ''}`}
      >
        <div className="absolute inset-0 rounded-2xl overflow-hidden backface-hidden bg-slate-100">
          {!frontReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#941946] animate-spin" />
            </div>
          )}
          <img
            src={cardImageUrl(number, 'front')}
            alt="Membership card front"
            decoding="async"
            onLoad={() => setFrontReady(true)}
            onError={() => setFrontFailed(true)}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="absolute inset-0 rounded-2xl overflow-hidden backface-hidden rotate-y-180 bg-slate-100">
          {backWanted && !backFailed ? (
            <img
              src={cardImageUrl(number, 'back')}
              alt="Membership card back"
              decoding="async"
              onError={() => setBackFailed(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            backFailed && <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">—</div>
          )}
        </div>
      </div>
    </div>
  );
};
