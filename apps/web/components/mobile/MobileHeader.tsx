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
  return null;
}
