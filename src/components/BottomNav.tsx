import React, { useState, useEffect } from 'react';
import { Home, Store, MapPin, User } from 'lucide-react';

export type NavTab = 'home' | 'store' | 'products' | 'map' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const [isSlim, setIsSlim] = useState(false);

  const tabs = [
    {
      id: 'home' as NavTab,
      labelEn: 'Home',
      labelAr: 'الرئيسية',
      icon: Home,
    },
    {
      id: 'store' as NavTab,
      labelEn: 'Store',
      labelAr: 'المتجر',
      icon: Store,
    },
    {
      id: 'map' as NavTab,
      labelEn: 'Map & Doctors',
      labelAr: 'الخريطة',
      icon: MapPin,
    },
    {
      id: 'profile' as NavTab,
      labelEn: 'Profile',
      labelAr: 'حسابي',
      icon: User,
    },
  ];

  // Dynamic Scroll Direction Detection:
  // - Scroll DOWN -> Slim style to save screen space
  // - Scroll UP or at Top -> Normal size full display
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always return to normal size near page top
      if (currentScrollY < 40) {
        setIsSlim(false);
        lastScrollY = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY;
      // Scroll threshold to avoid micro-jitter
      if (Math.abs(diff) > 10) {
        if (diff > 0) {
          // Scrolling DOWN -> Slim style
          setIsSlim(true);
        } else {
          // Scrolling UP -> Normal size
          setIsSlim(false);
        }
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // Reset to normal size on tab switch
  useEffect(() => {
    setIsSlim(false);
  }, [activeTab]);

  const activeIndex = tabs.findIndex(
    (t) => t.id === activeTab || (activeTab === 'products' && t.id === 'store')
  );
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <nav
        className={`w-full max-w-md bg-white border-t border-slate-200/90 shadow-[0_-4px_22px_rgba(0,0,0,0.06)] pointer-events-auto px-1 flex items-stretch justify-around relative overflow-visible transition-all duration-300 ease-out ${
          isSlim ? 'h-[50px] sm:h-[52px]' : 'h-[66px] sm:h-[70px]'
        }`}
      >
        {/* 
          SMOOTH SLIDING RED ARCH INDICATOR:
          - Automatically adjusts between Normal Size and Slim Size
          - Smooth gliding animation across tabs
          - Suspended above bottom (never touches the bottom border)
        */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)]"
          style={{
            width: '25%',
            right: `${safeIndex * 25}%`,
          }}
        >
          <div className="w-full h-full flex flex-col items-center justify-start relative">
            {/* Morphing Red Arch Silhouette */}
            <div
              className={`absolute flex items-center justify-center transition-all duration-300 ease-out ${
                isSlim ? '-top-[13px]' : '-top-[20px]'
              }`}
            >
              <svg
                viewBox="0 0 110 70"
                className={`text-[#941946] drop-shadow-xs transition-all duration-300 ease-out ${
                  isSlim ? 'w-[74px] h-[48px]' : 'w-[96px] h-[64px]'
                }`}
                fill="currentColor"
              >
                {/* 
                  Silhouette matching unnamed.jpg:
                  - Top dome protruding above navbar line
                  - Horizontal wings tapering along top border
                  - Floating rounded cup suspended with clear white space below
                */}
                <path d="M 4 22 
                         C 18 22, 28 21, 35 21 
                         C 36 7, 43 2, 55 2 
                         C 67 2, 74 7, 75 21 
                         C 82 21, 92 22, 106 22 
                         C 90 25, 76 46, 64 53 
                         C 59 55.5, 51 55.5, 46 53 
                         C 34 46, 20 25, 4 22 
                         Z" />
              </svg>
            </div>
          </div>
        </div>

        {/* 4 Tab Buttons */}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (activeTab === 'products' && tab.id === 'store');
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative z-10 flex flex-col items-center justify-center flex-1 h-full focus:outline-none select-none group min-h-[44px]"
            >
              {/* 
                Icon:
                - Active: Elevated into the dome, turns white
                - Responsive to Normal vs Slim size
              */}
              <div
                className={`transition-all duration-300 ease-out flex items-center justify-center ${
                  isActive
                    ? isSlim
                      ? '-translate-y-3.5 text-white scale-100'
                      : '-translate-y-5 text-white scale-110 drop-shadow-xs'
                    : isSlim
                      ? 'translate-y-0 text-slate-500 hover:text-slate-800'
                      : 'translate-y-0.5 text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon
                  className={`transition-all duration-300 ${
                    isSlim ? 'w-4 h-4' : 'w-5 h-5'
                  } ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`}
                />
              </div>

              {/* 
                Name / Label:
                - Active: Inside the red bowl, white bold font
                - Responsive to Normal vs Slim size
              */}
              <span
                className={`tracking-tight transition-all duration-300 ${
                  isActive
                    ? isSlim
                      ? 'font-black text-white -translate-y-0.5 text-[9px] drop-shadow-xs'
                      : 'font-extrabold text-white -translate-y-1.5 text-[11px] drop-shadow-xs'
                    : isSlim
                      ? 'font-medium text-slate-500 translate-y-0 text-[8.5px] group-hover:text-slate-700'
                      : 'font-medium text-slate-500 translate-y-0.5 text-[10px] group-hover:text-slate-700'
                }`}
              >
                {tab.labelAr}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
