'use client';

import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
  onMenuClick?: () => void;
}

export function MobileHeader({
  title = 'AppTVN',
  showNotifications = true,
  onMenuClick
}: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Menu button */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </Button>
        )}

        {/* Center: Title/Logo */}
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        </div>

        {/* Right: Notifications */}
        {showNotifications && (
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-700 relative"
          >
            <Bell className="w-6 h-6" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </Button>
        )}
      </div>
    </header>
  );
}
