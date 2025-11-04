/**
 * UserStatusBadge Component
 *
 * Displays user status (active/inactive/suspended) with color coding
 */

'use client';

import { getUserStatusColor } from '@/lib/users/profiles';
import type { UserListItem, UserWithProfile } from '@/types/user-profile';

interface UserStatusBadgeProps {
  user: UserListItem | UserWithProfile;
  size?: 'sm' | 'md';
}

export function UserStatusBadge({ user, size = 'sm' }: UserStatusBadgeProps) {
  const { bg, text, label } = getUserStatusColor(user);

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${bg} ${text} ${sizeClass}`}>
      <span className="mr-1">●</span>
      {label}
    </span>
  );
}
