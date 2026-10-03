import React, { useState } from 'react';
import { RotateCw, QrCode, Globe, Phone, Facebook, Sparkles } from 'lucide-react';
import { DeilarLogo } from './DeilarLogo';
import { Beneficiary } from '../types';

interface OfficialDeilarCardProps {
  beneficiary: Beneficiary;
  isFlipped?: boolean;
  onToggleFlip?: () => void;
  className?: string;
}

export const OfficialDeilarCard: React.FC<OfficialDeilarCardProps> = ({
  beneficiary,
  isFlipped: controlledFlipped,
  onToggleFlip,
  className = '',
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleFlip = () => {
    if (onToggleFlip) {
      onToggleFlip();
    } else {
      setInternalFlipped(!internalFlipped);
    }
  };

  // Extract MEM ID number from beneficiary card number or fallback
  const memNumber = beneficiary.cardNumber.startsWith('MEM') 
    ? beneficiary.cardNumber 
    : `MEM-${1000 + parseInt(beneficiary.id.replace(/\D/g, '') || '0')}`;

  return (
    <div className={`perspective-1000 select-none ${className}`}>
      <div
        onClick={handleFlip}
        className={`relative w-full aspect-[1.62/1] rounded-2xl transition-transform duration-700 transform-style-3d cursor-pointer shadow-2xl ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ==================== FRONT SIDE (Official Design) ==================== */}
        <div className="absolute inset-0 w-full h-full rounded-2xl p-5 bg-white border border-amber-300/60 backface-hidden overflow-hidden flex flex-col justify-between shadow-xl shadow-slate-900/10">
          {/* Background image overlay using the generated official render */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <img
              src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
              alt="Card Pattern"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Molecular & Hexagon Geometric Vector Accents (Matching user uploaded card) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 400 246" fill="none">
            {/* Top Left Molecular Hexagons */}
            <path d="M 30 20 L 50 32 L 50 56 L 30 68 L 10 56 L 10 32 Z" stroke="#cfa44c" strokeWidth="1.5" />
            <path d="M 50 32 L 70 20 L 90 32 L 90 56 L 70 68 L 50 56" stroke="#162947" strokeWidth="1.5" />
            <path d="M 30 68 L 30 92 L 50 104" stroke="#cfa44c" strokeWidth="1.5" />
            <circle cx="50" cy="32" r="3" fill="#162947" />
            <circle cx="70" cy="20" r="3" fill="#cfa44c" />
            <circle cx="30" cy="68" r="3" fill="#162947" />

            {/* Top Right Pharmacy Cup / Caduceus Icon */}
            <g transform="translate(355, 30) scale(0.6)">
              <path d="M 10 15 Q 25 15 40 15 Q 40 28 25 35 Q 10 28 10 15 Z" fill="#1c3052" />
              <path d="M 23 35 L 23 50 M 15 50 L 35 50" stroke="#cfa44c" strokeWidth="3" />
              <path d="M 25 10 Q 35 25 25 40 Q 15 30 25 15" stroke="#cfa44c" strokeWidth="2.5" fill="none" />
            </g>

            {/* Bottom Left Microscope Silhouette */}
            <g transform="translate(18, 140) scale(0.55)" opacity="0.3">
              <path d="M 30 10 L 40 25 L 25 35 L 15 20 Z" fill="#1c3052" />
              <path d="M 20 40 C 5 45 5 70 20 75 L 35 75" stroke="#1c3052" strokeWidth="4" fill="none" />
              <rect x="5" y="80" width="45" height="8" rx="2" fill="#cfa44c" />
            </g>

            {/* Bottom Right Hexagons */}
            <path d="M 350 160 L 370 172 L 370 196 L 350 208 L 330 196 L 330 172 Z" stroke="#1c3052" strokeWidth="1.5" />
            <path d="M 350 208 L 350 230" stroke="#cfa44c" strokeWidth="1.5" />
            <circle cx="350" cy="160" r="3" fill="#cfa44c" />
            <circle cx="370" cy="196" r="3" fill="#1c3052" />

            {/* Bottom Golden Flowing Waves */}
            <path d="M 0 240 Q 100 200 200 225 T 400 215" stroke="#dfb65f" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M 0 246 Q 120 210 220 235 T 400 225" stroke="#c5983d" strokeWidth="1.2" fill="none" opacity="0.4" />
          </svg>

          {/* Top Row: Hint & Member Name badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 bg-slate-100/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
              {beneficiary.name}
            </span>

            <div className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
              <RotateCw className="w-3 h-3 animate-spin-slow" />
              <span>اقلب الكرت</span>
            </div>
          </div>

          {/* Center Identity Section (Exact Logo & Typography from uploaded frontside) */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto">
            {/* The Official Deilar Perforated Ticket Logo */}
            <div className="w-24 sm:w-28 mb-1.5 drop-shadow-md">
              <DeilarLogo className="w-full h-auto" />
            </div>

            {/* "Deilar" 3D Wordmark */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#112443] font-sans leading-none flex items-center justify-center">
              <span>De</span>
              <span className="text-[#c89e43]">ilar</span>
            </h1>

            {/* Arabic Wordmark with flanking horizontal lines: "— ديلـر —" */}
            <div className="flex items-center justify-center gap-2 mt-1 w-full max-w-[170px]">
              <div className="h-[1.5px] bg-[#c89e43] flex-1"></div>
              <span className="text-sm font-extrabold text-[#112443] tracking-widest px-1">
                ديلــــر
              </span>
              <div className="h-[1.5px] bg-[#c89e43] flex-1"></div>
            </div>

            {/* Slogan: "صحتك واكتر" */}
            <div className="flex items-center justify-center gap-2 mt-0.5 w-full max-w-[140px]">
              <div className="h-[1px] bg-[#c89e43] flex-1"></div>
              <span className="text-[10px] font-bold text-[#112443] tracking-wider px-1">
                صحتك واكتر
              </span>
              <div className="h-[1px] bg-[#c89e43] flex-1"></div>
            </div>

            {/* Subtitles: "Family Card" & "deilar.com" */}
            <div className="mt-2 text-center">
              <p className="text-sm sm:text-base font-extrabold text-[#112443] tracking-wide">
                Family Card
              </p>
              <p className="text-xs font-bold text-[#c89e43] tracking-wider">
                deilar.com
              </p>
            </div>
          </div>

          {/* Bottom Card Footer Info */}
          <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span className="font-mono font-bold text-slate-700">{memNumber}</span>
            <span className="text-[#c89e43] font-bold">بطاقة الخصم الطبي المعتمدة</span>
          </div>
        </div>

        {/* ==================== BACK SIDE (Official Design) ==================== */}
        <div className="absolute inset-0 w-full h-full rounded-2xl p-4 sm:p-5 bg-white border border-amber-300/60 backface-hidden rotate-y-180 overflow-hidden flex flex-col justify-between shadow-2xl">
          {/* Background image overlay using the generated official render */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <img
              src="/src/assets/images/deilar_card_back_official_1791012725831.jpg"
              alt="Card Back Pattern"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10 flex h-full items-stretch">
            {/* LEFT HALF: Deilar Logo & Branding */}
            <div className="w-[36%] flex flex-col items-center justify-center pr-1 pl-2 text-center border-l-2 border-[#c89e43]">
              <div className="w-16 sm:w-20 mb-2 drop-shadow-xs">
                <DeilarLogo className="w-full h-auto" />
              </div>

              <h2 className="text-base sm:text-lg font-black tracking-tight text-[#112443] leading-none flex items-center">
                <span>De</span>
                <span className="text-[#c89e43]">ilar</span>
              </h2>

              <div className="flex items-center justify-center gap-1 mt-1 w-full max-w-[90px]">
                <div className="h-[1px] bg-[#c89e43] flex-1"></div>
                <span className="text-[11px] font-extrabold text-[#112443]">ديلــر</span>
                <div className="h-[1px] bg-[#c89e43] flex-1"></div>
              </div>

              <div className="flex items-center justify-center gap-1 mt-0.5 w-full max-w-[80px]">
                <div className="h-[0.5px] bg-[#c89e43] flex-1"></div>
                <span className="text-[8px] font-bold text-[#112443]">صحتك واكثر</span>
                <div className="h-[0.5px] bg-[#c89e43] flex-1"></div>
              </div>
            </div>

            {/* RIGHT HALF: QR Code, Barcode, Member ID, and Contact Details */}
            <div className="flex-1 flex flex-col justify-between pl-3 pr-2 text-right">
              {/* Top: QR Code & Barcode Row */}
              <div className="flex items-center justify-between gap-2">
                {/* Simulated Scannable Barcode */}
                <div className="flex-1">
                  <div className="h-8 sm:h-9 bg-slate-50 p-1 rounded border border-slate-200 flex items-center justify-between overflow-hidden">
                    <div className="w-1 h-full bg-slate-950"></div>
                    <div className="w-0.5 h-full bg-slate-950"></div>
                    <div className="w-2 h-full bg-slate-950"></div>
                    <div className="w-1 h-full bg-slate-950"></div>
                    <div className="w-0.5 h-full bg-slate-950"></div>
                    <div className="w-2.5 h-full bg-slate-950"></div>
                    <div className="w-0.5 h-full bg-slate-950"></div>
                    <div className="w-1.5 h-full bg-slate-950"></div>
                    <div className="w-0.5 h-full bg-slate-950"></div>
                    <div className="w-2 h-full bg-slate-950"></div>
                    <div className="w-1 h-full bg-slate-950"></div>
                    <div className="w-0.5 h-full bg-slate-950"></div>
                    <div className="w-2 h-full bg-slate-950"></div>
                  </div>
                  <p className="text-[10px] font-mono font-black text-center text-slate-900 mt-0.5">
                    {memNumber}
                  </p>
                </div>

                {/* QR Code in Rounded Border */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border-2 border-slate-900 p-1 flex items-center justify-center shrink-0 shadow-sm">
                  <QrCode className="w-full h-full text-slate-950" />
                </div>
              </div>

              {/* Title: "— كارت العيله —" */}
              <div className="my-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-[1.5px] bg-[#c89e43] flex-1"></div>
                  <h3 className="text-xs sm:text-sm font-black text-[#c89e43] px-1 font-sans">
                    كارت العيلـه
                  </h3>
                  <div className="h-[1.5px] bg-[#c89e43] flex-1"></div>
                </div>
              </div>

              {/* Official Social & Contact Details from the uploaded card */}
              <div className="space-y-1 text-[9px] sm:text-[10px] font-semibold text-slate-800">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com/deilarcard"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 hover:text-blue-700 transition-colors"
                >
                  <div className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center shrink-0">
                    <Facebook className="w-2.5 h-2.5 fill-white" />
                  </div>
                  <span className="font-mono text-[9px] truncate">www.facebook.com/deilarcard</span>
                </a>

                {/* Website */}
                <a
                  href="https://www.deilar.com"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 hover:text-amber-700 transition-colors"
                >
                  <div className="w-4 h-4 rounded-full bg-[#112443] text-white flex items-center justify-center shrink-0">
                    <Globe className="w-2.5 h-2.5" />
                  </div>
                  <span className="font-mono text-[9px] truncate">www.deilar.com</span>
                </a>

                {/* Phone / WhatsApp */}
                <a
                  href="tel:01020709993"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 hover:text-emerald-700 transition-colors"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Phone className="w-2.5 h-2.5" />
                  </div>
                  <span className="font-mono text-[10px] font-black tracking-wider text-slate-900">
                    01020709993
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
