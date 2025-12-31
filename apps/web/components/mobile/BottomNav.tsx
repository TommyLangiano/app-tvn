'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, Plus } from 'lucide-react';
import { memo } from 'react';

export interface BottomNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  onFabClick?: () => void;
}

const NavItem = memo(({ item, isActive }: { item: BottomNavItem; isActive: boolean }) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch={true}
      className="flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200 group"
    >
      <div className="relative">
        <Icon
          className={`transition-all duration-200 ${
            isActive
              ? 'w-6 h-6 text-emerald-600 stroke-[2.5]'
              : 'w-6 h-6 text-gray-400 stroke-2 group-hover:text-gray-600'
          }`}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </div>

      <span
        className={`text-[11px] font-medium transition-all duration-200 ${
          isActive
            ? 'text-emerald-600'
            : 'text-gray-400 group-hover:text-gray-600'
        }`}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", sans-serif',
          letterSpacing: '-0.01em'
        }}
      >
        {item.label}
      </span>
    </Link>
  );
});

NavItem.displayName = 'NavItem';

const FABButton = memo(({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="fixed z-[60] group"
    style={{
      bottom: 'calc(42px + env(safe-area-inset-bottom))',
      left: '50%',
      transform: 'translateX(-50%)',
    }}
    aria-label="Add new"
  >
    <div
      className="relative transition-all duration-300 ease-out group-hover:scale-110 group-active:scale-95"
      style={{
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        background: '#059669',
        boxShadow: '0 20px 60px -12px rgba(5, 150, 105, 0.6), 0 8px 20px -6px rgba(5, 150, 105, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Plus
          className="text-white"
          style={{
            width: '32px',
            height: '32px',
            strokeWidth: '2.5',
          }}
        />
      </div>
    </div>
  </button>
));

FABButton.displayName = 'FABButton';

export const BottomNav = memo(({ items, onFabClick }: BottomNavProps) => {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom" style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <svg
          className="absolute top-0 left-0 right-0 w-full"
          style={{ height: '90px' }}
          viewBox="0 0 375 90"
          preserveAspectRatio="none"
          fill="white"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="topShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="-4" stdDeviation="8" floodOpacity="0.08" />
            </filter>
          </defs>

          <path
            d="M 0,0
               L 0,90
               L 375,90
               L 375,0
               L 242.5,0
               Q 237.5,0 235,2
               Q 233,4 232.5,5
               A 45 45 0 1 1 142.5,5
               Q 142,4 140,2
               Q 137.5,0 132.5,0
               L 0,0 Z"
            fill="white"
            filter="url(#topShadow)"
          />

          <path
            d="M 0,0
               L 132.5,0
               Q 137.5,0 140,2
               Q 142,4 142.5,5
               A 45 45 0 1 1 232.5,5
               Q 233,4 235,2
               Q 237.5,0 242.5,0
               L 375,0"
            stroke="#e5e7eb"
            strokeWidth="1"
            fill="none"
          />
        </svg>

        <div className="relative" style={{ height: '75px' }}>
          <div className="absolute inset-0 flex items-center justify-around px-4">
            {items.map((item, index) => {
              const isActive = pathname.startsWith(item.href) && item.href !== '#';
              const isMiddle = index === Math.floor(items.length / 2);

              if (isMiddle) {
                return <div key={`middle-${index}`} className="flex-1" />;
              }

              return (
                <NavItem key={item.href} item={item} isActive={isActive} />
              );
            })}
          </div>
        </div>
      </nav>

      <FABButton onClick={onFabClick} />
    </>
  );
});

BottomNav.displayName = 'BottomNav';
