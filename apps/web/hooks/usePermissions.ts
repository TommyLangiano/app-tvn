/**
 * usePermissions Hook
 *
 * React hook for checking permissions in client-side components.
 * Provides reactive permission checking and role-based UI rendering.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  canAccessRoute,
  type Permission,
  type TenantRole,
} from '@/lib/permissions';

// ============================================================================
// TYPES
// ============================================================================

interface PermissionsContext {
  role: TenantRole | null;
  loading: boolean;
  error: Error | null;

  // Permission checks
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;

  // Role checks
  isAdmin: boolean;
  isOwner: boolean;
  isReadOnly: boolean;
  isOperaio: boolean;
  isBillingManager: boolean;

  // Navigation
  canAccess: (route: string) => boolean;

  // Utility
  permissions: Permission[];
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access user permissions in components
 */
export function usePermissions(): PermissionsContext {
  const [role, setRole] = useState<TenantRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadRole = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        setRole(null);
        return;
      }

      // Get user's role (take most recent if multiple tenants)
      const { data: userTenants, error: tenantError } = await supabase
        .from('user_tenants')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;

      if (tenantError) throw tenantError;
      if (!userTenant) {
        setRole(null);
        return;
      }

      setRole(userTenant.role as TenantRole);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load permissions'));
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRole();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadRole();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadRole]);

  // Permission check functions
  const can = useCallback(
    (permission: Permission): boolean => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    [role]
  );

  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      if (!role) return false;
      return hasAllPermissions(role, permissions);
    },
    [role]
  );

  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      if (!role) return false;
      return hasAnyPermission(role, permissions);
    },
    [role]
  );

  // Role checks
  const isAdmin = role === 'admin';
  const isOwner = role === 'owner';
  const isReadOnly = role === 'admin_readonly';
  const isOperaio = role === 'operaio';
  const isBillingManager = role === 'billing_manager';

  // Navigation
  const canAccess = useCallback(
    (route: string): boolean => {
      if (!role) return false;
      return canAccessRoute(role, route);
    },
    [role]
  );

  // Get all permissions for current role
  const permissions = role ? getPermissions(role) : [];

  return {
    role,
    loading,
    error,
    can,
    canAll,
    canAny,
    isAdmin,
    isOwner,
    isReadOnly,
    isOperaio,
    isBillingManager,
    canAccess,
    permissions,
    refresh: loadRole,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook that returns true if user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { can } = usePermissions();
  return can(permission);
}

/**
 * Hook that returns true if user has all specified permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { canAll } = usePermissions();
  return canAll(permissions);
}

/**
 * Hook that returns true if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { canAny } = usePermissions();
  return canAny(permissions);
}

/**
 * Hook that returns the current user's role
 */
export function useRole(): TenantRole | null {
  const { role } = usePermissions();
  return role;
}

/**
 * Hook that returns true if user is admin or owner
 */
export function useIsAdmin(): boolean {
  const { isAdmin, isOwner } = usePermissions();
  return isAdmin || isOwner;
}

/**
 * Hook that returns true if user has read-only access
 */
export function useIsReadOnly(): boolean {
  const { isReadOnly } = usePermissions();
  return isReadOnly;
}
