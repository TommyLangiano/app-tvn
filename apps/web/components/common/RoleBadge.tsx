/**
 * RoleBadge Component
 *
 * Displays a role badge with consistent styling based on role metadata.
 */

'use client';

import { Crown, Shield, Eye, User, Receipt } from 'lucide-react';
import { ROLE_METADATA, type TenantRole } from '@/lib/permissions';

interface RoleBadgeProps {
  role: TenantRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const ICON_COMPONENTS = {
  Crown,
  Shield,
  Eye,
  User,
  Receipt,
};

const SIZE_CLASSES = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'h-3 w-3',
  },
  md: {
    container: 'px-2 py-1 text-sm',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-base',
    icon: 'h-4 w-4',
  },
};

const COLOR_CLASSES = {
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
};

export function RoleBadge({ role, size = 'md', showIcon = true }: RoleBadgeProps) {
  const metadata = ROLE_METADATA[role];

  if (!metadata) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 text-sm font-medium">
        {role}
      </span>
    );
  }

  const Icon = ICON_COMPONENTS[metadata.icon as keyof typeof ICON_COMPONENTS] || User;
  const sizeClasses = SIZE_CLASSES[size];
  const colorClasses = COLOR_CLASSES[metadata.color as keyof typeof COLOR_CLASSES] || COLOR_CLASSES.gray;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeClasses.container} ${colorClasses}`}
      title={metadata.description}
    >
      {showIcon && <Icon className={sizeClasses.icon} />}
      {metadata.label}
    </span>
  );
}

/**
 * RoleDescription Component
 *
 * Shows the role with its description below
 */
export function RoleDescription({ role }: { role: TenantRole }) {
  const metadata = ROLE_METADATA[role];

  if (!metadata) {
    return <div className="text-sm">{role}</div>;
  }

  return (
    <div className="space-y-1">
      <RoleBadge role={role} />
      <p className="text-xs text-muted-foreground">{metadata.description}</p>
    </div>
  );
}

/**
 * RoleSelect Helper
 *
 * Get display info for role selects
 */
export function getRoleDisplayInfo(role: TenantRole) {
  const metadata = ROLE_METADATA[role];
  return {
    value: role,
    label: metadata?.label || role,
    description: metadata?.description || '',
    isHidden: metadata?.isHiddenFromUI || false,
    isLegacy: metadata?.isLegacy || false,
  };
}
