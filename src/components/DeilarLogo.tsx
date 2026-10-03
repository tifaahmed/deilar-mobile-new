import React from 'react';

interface DeilarLogoProps {
  className?: string;
}

export const DeilarLogo: React.FC<DeilarLogoProps> = ({ className = 'h-9 w-auto' }) => {
  return (
    <svg
      viewBox="0 0 200 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} drop-shadow-sm transition-transform hover:scale-105 duration-200`}
    >
      <defs>
        {/* Ticket Left Navy Gradient */}
        <linearGradient id="deilarNavyGrad" x1="0" y1="0" x2="110" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#15294b" />
          <stop offset="100%" stopColor="#0d1b32" />
        </linearGradient>

        {/* Ticket Right Gold Gradient */}
        <linearGradient id="deilarGoldGrad" x1="110" y1="0" x2="200" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e5bf65" />
          <stop offset="50%" stopColor="#d4a748" />
          <stop offset="100%" stopColor="#b68931" />
        </linearGradient>

        {/* Shadow filter */}
        <filter id="ticketShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main Ticket Container with Notches */}
      <g filter="url(#ticketShadow)">
        {/* Left Navy Half */}
        <path
          d="M 16 4 
             L 110 4 
             L 110 104 
             L 16 104 
             A 12 12 0 0 1 4 92 
             L 4 66 
             A 12 12 0 0 0 4 42 
             L 4 16 
             A 12 12 0 0 1 16 4 Z"
          fill="url(#deilarNavyGrad)"
        />

        {/* Left border perforation dots */}
        <circle cx="6" cy="22" r="1.8" fill="#ffffff" opacity="0.6" />
        <circle cx="6" cy="30" r="1.8" fill="#ffffff" opacity="0.6" />
        <circle cx="6" cy="78" r="1.8" fill="#ffffff" opacity="0.6" />
        <circle cx="6" cy="86" r="1.8" fill="#ffffff" opacity="0.6" />

        {/* Right Gold Half */}
        <path
          d="M 110 4 
             L 184 4 
             A 12 12 0 0 1 196 16 
             L 196 42 
             A 12 12 0 0 0 196 66 
             L 196 92 
             A 12 12 0 0 1 184 104 
             L 110 104 Z"
          fill="url(#deilarGoldGrad)"
        />

        {/* Perforated Center Line (Dashed White) */}
        <line
          x1="110"
          y1="8"
          x2="110"
          y2="100"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />

        {/* Bold Italic Capital "D" on the Navy side */}
        <text
          x="58"
          y="76"
          fontFamily="Arial, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="72"
          fill="#ffffff"
          textAnchor="middle"
          letterSpacing="-2"
        >
          D
        </text>

        {/* Health / Wellness Figure with Leaf Lower Body on the Gold Side */}
        <g transform="translate(148, 54)">
          {/* Head */}
          <circle cx="2" cy="-28" r="7.5" fill="#11223e" />

          {/* Torso & Joyful Raised Arms (V-Shape) */}
          <path
            d="M -20 -15 
               C -16 -12, -8 -5, -4 -3 
               C -2 -2, 0 3, 0 9 
               C 0 3, 2 -2, 4 -3 
               C 8 -5, 16 -12, 20 -15 
               C 18 -18, 12 -12, 6 -6 
               C 3 -3, 2 2, 2 8 
               C 2 12, -2 12, -2 8 
               C -2 2, -3 -3, -6 -6 
               C -12 -12, -18 -18, -20 -15 Z"
            fill="#11223e"
          />

          {/* Leaf Lower Body */}
          <path
            d="M -1 10 
               C -1 10, -10 24, -9 34 
               C -8 38, -6 40, -4 41 
               C -4 35, 0 25, 4 19 
               C 6 16, 7 12, 4 10 
               C 2 8, 0 8, -1 10 Z"
            fill="#11223e"
          />
          <path
            d="M 1 12 
               C 6 18, 18 22, 16 35 
               C 15 39, 10 42, 4 41 
               C 12 37, 10 26, 4 20 
               C 1 17, 1 14, 1 12 Z"
            fill="#11223e"
          />
        </g>
      </g>
    </svg>
  );
};
