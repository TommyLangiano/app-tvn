/**
 * Permission Helper Functions
 *
 * These functions provide a clean API for checking permissions throughout the application.
 * They work both client-side and server-side.
 */

import { PERMISSIONS, ROLE_PERMISSIONS, ROLES, type Permission, type TenantRole } from './config';

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TenantRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(role: TenantRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(role: TenantRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: TenantRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// ============================================================================
// ROLE CHECKING
// ============================================================================

/**
 * Check if a role is an admin or owner (full access roles)
 */
export function isFullAccessRole(role: TenantRole): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN;
}

/**
 * Check if a role is read-only
 */
export function isReadOnlyRole(role: TenantRole): boolean {
  return role === ROLES.ADMIN_READONLY;
}

/**
 * Check if a role can manage users
 */
export function canManageUsers(role: TenantRole): boolean {
  return hasPermission(role, PERMISSIONS.USERS_CREATE);
}

/**
 * Check if a role can view all rapportini (not just own)
 */
export function canViewAllRapportini(role: TenantRole): boolean {
  return hasPermission(role, PERMISSIONS.RAPPORTINI_ALL_VIEW);
}

/**
 * Check if a role can edit all rapportini (not just own)
 */
export function canEditAllRapportini(role: TenantRole): boolean {
  return hasPermission(role, PERMISSIONS.RAPPORTINI_ALL_UPDATE);
}

/**
 * Check if a role can access billing
 */
export function canAccessBilling(role: TenantRole): boolean {
  return hasPermission(role, PERMISSIONS.BILLING_VIEW);
}

/**
 * Check if a role can perform critical operations (owner only)
 */
export function canPerformCriticalOps(role: TenantRole): boolean {
  return hasPermission(role, PERMISSIONS.TENANT_DELETE);
}

// ============================================================================
// RESOURCE-SPECIFIC PERMISSION CHECKS
// ============================================================================

/**
 * Check if a user can view a specific rapportino
 * @param userRole - The user's role
 * @param userId - The user's ID
 * @param rapportinoUserId - The ID of the user who created the rapportino
 */
export function canViewRapportino(
  userRole: TenantRole,
  userId: string,
  rapportinoUserId: string
): boolean {
  // Can view all rapportini
  if (hasPermission(userRole, PERMISSIONS.RAPPORTINI_ALL_VIEW)) {
    return true;
  }

  // Can view own rapportini
  if (hasPermission(userRole, PERMISSIONS.RAPPORTINI_OWN_VIEW) && userId === rapportinoUserId) {
    return true;
  }

  return false;
}

/**
 * Check if a user can edit a specific rapportino
 * @param userRole - The user's role
 * @param userId - The user's ID
 * @param rapportinoUserId - The ID of the user who created the rapportino
 */
export function canEditRapportino(
  userRole: TenantRole,
  userId: string,
  rapportinoUserId: string
): boolean {
  // Can edit all rapportini
  if (hasPermission(userRole, PERMISSIONS.RAPPORTINI_ALL_UPDATE)) {
    return true;
  }

  // Can edit own rapportini
  if (hasPermission(userRole, PERMISSIONS.RAPPORTINI_OWN_UPDATE) && userId === rapportinoUserId) {
    return true;
  }

  return false;
}

/**
 * Check if a user can delete a specific rapportino
 * @param userRole - The user's role
 * @param userId - The user's ID
 * @param rapportinoUserId - The ID of the user who created the rapportino
 */
export function canDeleteRapportino(
  userRole: TenantRole,
  userId: string,
  rapportinoUserId: string
): boolean {
  // Can delete all rapportini
  if (hasPermission(userRole, PERMISSIONS.RAPPORTINI_ALL_DELETE)) {
    return true;
  }

  // Can delete own rapportini
  if (hasPermission(userRole, PERMISSIONS.RAPPORTINI_OWN_DELETE) && userId === rapportinoUserId) {
    return true;
  }

  return false;
}

// ============================================================================
// NAVIGATION & UI HELPERS
// ============================================================================

/**
 * Get list of routes accessible by a role
 */
export function getAccessibleRoutes(role: TenantRole): string[] {
  const routes: string[] = ['/dashboard']; // Everyone can access dashboard

  // Users management
  if (hasPermission(role, PERMISSIONS.USERS_VIEW)) {
    routes.push('/utenti-ruoli');
  }

  // Rapportini
  if (hasAnyPermission(role, [PERMISSIONS.RAPPORTINI_OWN_VIEW, PERMISSIONS.RAPPORTINI_ALL_VIEW])) {
    routes.push('/rapportini');
  }

  // Commesse
  if (hasPermission(role, PERMISSIONS.COMMESSE_VIEW)) {
    routes.push('/commesse');
  }

  // Clienti
  if (hasPermission(role, PERMISSIONS.CLIENTI_VIEW)) {
    routes.push('/clienti');
  }

  // Fornitori
  if (hasPermission(role, PERMISSIONS.FORNITORI_VIEW)) {
    routes.push('/fornitori');
  }

  // Fatture
  if (hasPermission(role, PERMISSIONS.FATTURE_VIEW)) {
    routes.push('/fatture');
  }

  // Costi
  if (hasPermission(role, PERMISSIONS.COSTI_VIEW)) {
    routes.push('/costi');
  }

  // Tenant profile
  if (hasPermission(role, PERMISSIONS.TENANT_VIEW)) {
    routes.push('/impostazioni');
  }

  // Billing
  if (hasPermission(role, PERMISSIONS.BILLING_VIEW)) {
    routes.push('/fatturazione');
  }

  return routes;
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: TenantRole, route: string): boolean {
  const accessibleRoutes = getAccessibleRoutes(role);
  return accessibleRoutes.some(r => route.startsWith(r));
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate that an operation is allowed, throw error if not
 */
export function requirePermission(role: TenantRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission} required for role ${role}`);
  }
}

/**
 * Validate that user is not read-only, throw error if they are
 */
export function requireWriteAccess(role: TenantRole): void {
  if (isReadOnlyRole(role)) {
    throw new Error('Write access denied: user has read-only permissions');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export * from './config';
export { PERMISSIONS, ROLES, ROLE_PERMISSIONS };
