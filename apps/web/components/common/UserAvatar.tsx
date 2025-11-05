/**
 * UserAvatar Component
 *
 * Displays user avatar with fallback to initials
 */

'use client';

import type { UserListItem, UserWithProfile } from '@/types/user-profile';

interface UserAvatarProps {
  user: UserListItem | UserWithProfile | { full_name?: string; email: string; avatar_url?: string };
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-20 w-20 text-xl',
};

function getInitials(user: { full_name?: string; email: string }): string {
  const name = user.full_name || user.email;
  const parts = name.split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClass = SIZES[size];

  // Fallback to initials (avatar_url not implemented yet)
  const initials = getInitials(user);

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary border-2 border-primary/20 ${className}`}
      title={user.full_name || user.email}
      style={{ letterSpacing: '0.05em' }}
    >
      {initials}
    </div>
  );
}
