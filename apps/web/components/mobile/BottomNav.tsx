'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, Plus } from 'lucide-react';

export interface BottomNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  onFabClick?: () => void;
}

export function BottomNav({ items, onFabClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
        <nav className="relative bg-emerald-600 rounded-2xl shadow-2xl border-2 border-gray-300 pointer-events-auto">
          <div className="relative flex items-center justify-around h-16 px-2">
            {items.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              const isMiddle = index === Math.floor(items.length / 2);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-center flex-1 h-full transition-all ${
                    isMiddle ? 'invisible' : ''
                  } ${
                    isActive
                      ? 'text-white'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  <Icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Floating Action Button - NO TAILWIND CLASSES AT ALL */}
      <button
        onClick={onFabClick}
        style={{
          position: 'fixed',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          width: '64px',
          height: '64px',
          minWidth: '64px',
          minHeight: '64px',
          maxWidth: '64px',
          maxHeight: '64px',
          padding: 0,
          borderRadius: '16px',
          backgroundColor: 'white',
          border: '4px solid #059669',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          aspectRatio: '1/1',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
        onMouseDown={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)'}
      >
        <Plus style={{ width: '32px', height: '32px', color: '#059669', strokeWidth: 3 }} />
      </button>
    </>
  );
}
