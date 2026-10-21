import React from 'react';
import logo from '../assets/deilar-logo.webp';

interface DeilarLogoProps {
  className?: string;
}

export const DeilarLogo: React.FC<DeilarLogoProps> = ({ className = 'h-9 w-auto' }) => {
  return (
    <img
      src={logo}
      alt="Deilar"
      draggable={false}
      className={`${className} object-contain select-none transition-transform hover:scale-105 duration-200`}
    />
  );
};
