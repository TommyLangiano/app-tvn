/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions.
 * Useful for hiding UI elements that users don't have access to.
 */

'use client';

import { type ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission, TenantRole } from '@/lib/permissions';

// ============================================================================
// TYPES
// ============================================================================

interface PermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RequirePermissionProps extends PermissionGateProps {
  permission: Permission;
}

interface RequireAllPermissionsProps extends PermissionGateProps {
  permissions: Permission[];
}

interface RequireAnyPermissionProps extends PermissionGateProps {
  permissions: Permission[];
}

interface RequireRoleProps extends PermissionGateProps {
  role: TenantRole | TenantRole[];
}

// ============================================================================
// PERMISSION GATES
// ============================================================================

/**
 * Render children only if user has a specific permission
 */
export function RequirePermission({ children, permission, fallback = null }: RequirePermissionProps) {
  const { can, loading } = usePermissions();

  if (loading) return null;
  if (!can(permission)) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Render children only if user has ALL specified permissions
 */
export function RequireAllPermissions({ children, permissions, fallback = null }: RequireAllPermissionsProps) {
  const { canAll, loading } = usePermissions();

  if (loading) return null;
  if (!canAll(permissions)) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Render children only if user has ANY of the specified permissions
 */
export function RequireAnyPermission({ children, permissions, fallback = null }: RequireAnyPermissionProps) {
  const { canAny, loading } = usePermissions();

  if (loading) return null;
  if (!canAny(permissions)) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Render children only if user has a specific role
 */
export function RequireRole({ children, role, fallback = null }: RequireRoleProps) {
  const { role: userRole, loading } = usePermissions();

  if (loading) return null;

  const roles = Array.isArray(role) ? role : [role];
  if (!userRole || !roles.includes(userRole)) return <>{fallback}</>;

  return <>{children}</>;
}

// ============================================================================
// ROLE-SPECIFIC GATES
// ============================================================================

/**
 * Render children only for admin or owner
 */
export function RequireAdmin({ children, fallback = null }: PermissionGateProps) {
  const { isAdmin, isOwner, loading } = usePermissions();

  if (loading) return null;
  if (!isAdmin && !isOwner) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Render children only for owner
 */
export function RequireOwner({ children, fallback = null }: PermissionGateProps) {
  const { isOwner, loading } = usePermissions();

  if (loading) return null;
  if (!isOwner) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Hide children from read-only users (show only to users with write access)
 */
export function RequireWriteAccess({ children, fallback = null }: PermissionGateProps) {
  const { isReadOnly, loading } = usePermissions();

  if (loading) return null;
  if (isReadOnly) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Render children only for read-only users
 */
export function ShowForReadOnly({ children, fallback = null }: PermissionGateProps) {
  const { isReadOnly, loading } = usePermissions();

  if (loading) return null;
  if (!isReadOnly) return <>{fallback}</>;

  return <>{children}</>;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

/**
 * Show different content based on write access
 */
export function WriteAccessSwitch({
  writeContent,
  readOnlyContent
}: {
  writeContent: ReactNode;
  readOnlyContent: ReactNode;
}) {
  const { isReadOnly, loading } = usePermissions();

  if (loading) return null;
  return <>{isReadOnly ? readOnlyContent : writeContent}</>;
}

/**
 * Show loading state while permissions are being fetched
 */
export function PermissionLoader({
  children,
  loadingFallback = <div>Caricamento permessi...</div>
}: {
  children: ReactNode;
  loadingFallback?: ReactNode;
}) {
  const { loading } = usePermissions();

  if (loading) return <>{loadingFallback}</>;
  return <>{children}</>;
}
