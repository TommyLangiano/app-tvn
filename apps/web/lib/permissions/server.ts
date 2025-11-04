/**
 * Server-Side Permission Utilities
 *
 * These utilities are designed for use in API routes and server components.
 * They provide authentication and authorization checks with proper error handling.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { hasPermission, requireWriteAccess, type Permission, type TenantRole } from './index';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: TenantRole;
}

export interface PermissionError {
  error: string;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND';
  status: number;
}

// ============================================================================
// AUTHENTICATION & AUTHORIZATION
// ============================================================================

/**
 * Get authenticated user context with role information
 * Returns null if not authenticated or not in a tenant
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

    // Get user's tenant and role
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userTenant) {
      return null;
    }

    return {
      userId: user.id,
      tenantId: userTenant.tenant_id,
      role: userTenant.role as TenantRole,
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication - returns context or error response
 */
export async function requireAuth(): Promise<AuthContext | NextResponse> {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json(
      { error: 'Not authenticated', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  return context;
}

/**
 * Require specific permission - returns context or error response
 */
export async function requirePermissions(
  permissions: Permission | Permission[]
): Promise<AuthContext | NextResponse> {
  const context = await requireAuth();

  // If requireAuth returned an error response, pass it through
  if (context instanceof NextResponse) {
    return context;
  }

  // Check permissions
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  const hasAllPermissions = permissionArray.every(permission =>
    hasPermission(context.role, permission)
  );

  if (!hasAllPermissions) {
    return NextResponse.json(
      {
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permissionArray,
      },
      { status: 403 }
    );
  }

  return context;
}

/**
 * Require write access (block read-only users)
 */
export async function requireWrite(): Promise<AuthContext | NextResponse> {
  const context = await requireAuth();

  if (context instanceof NextResponse) {
    return context;
  }

  try {
    requireWriteAccess(context.role);
    return context;
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Write access denied: user has read-only permissions',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    );
  }
}

/**
 * Require admin role (admin or owner)
 */
export async function requireAdmin(): Promise<AuthContext | NextResponse> {
  const context = await requireAuth();

  if (context instanceof NextResponse) {
    return context;
  }

  if (context.role !== 'admin' && context.role !== 'owner') {
    return NextResponse.json(
      {
        error: 'Admin access required',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    );
  }

  return context;
}

/**
 * Require owner role (critical operations)
 */
export async function requireOwner(): Promise<AuthContext | NextResponse> {
  const context = await requireAuth();

  if (context instanceof NextResponse) {
    return context;
  }

  if (context.role !== 'owner') {
    return NextResponse.json(
      {
        error: 'Owner access required for this operation',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    );
  }

  return context;
}

// ============================================================================
// RESOURCE-SPECIFIC AUTHORIZATION
// ============================================================================

/**
 * Check if user can access a resource in their tenant
 */
export async function requireTenantResource(
  table: string,
  resourceId: string,
  idColumn: string = 'id'
): Promise<AuthContext | NextResponse> {
  const context = await requireAuth();

  if (context instanceof NextResponse) {
    return context;
  }

  try {
    const supabase = await createClient();

    // Check if resource exists and belongs to user's tenant
    const { data } = await supabase
      .from(table)
      .select('tenant_id')
      .eq(idColumn, resourceId)
      .single();

    if (!data) {
      return NextResponse.json(
        { error: 'Resource not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (data.tenant_id !== context.tenantId) {
      return NextResponse.json(
        { error: 'Access denied to this resource', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return context;
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Check if user can access a rapportino (considering ownership for operaio role)
 */
export async function requireRapportinoAccess(
  rapportinoId: string,
  operation: 'view' | 'edit' | 'delete'
): Promise<AuthContext | NextResponse> {
  const context = await requireAuth();

  if (context instanceof NextResponse) {
    return context;
  }

  try {
    const supabase = await createClient();

    // Get rapportino with tenant and user info
    const { data: rapportino } = await supabase
      .from('rapportini')
      .select('tenant_id, user_id')
      .eq('id', rapportinoId)
      .single();

    if (!rapportino) {
      return NextResponse.json(
        { error: 'Rapportino not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check tenant match
    if (rapportino.tenant_id !== context.tenantId) {
      return NextResponse.json(
        { error: 'Access denied to this resource', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Import permission checking functions
    const { canViewRapportino, canEditRapportino, canDeleteRapportino } = await import('./index');

    // Check operation-specific permissions
    let hasAccess = false;
    switch (operation) {
      case 'view':
        hasAccess = canViewRapportino(context.role, context.userId, rapportino.user_id);
        break;
      case 'edit':
        hasAccess = canEditRapportino(context.role, context.userId, rapportino.user_id);
        break;
      case 'delete':
        hasAccess = canDeleteRapportino(context.role, context.userId, rapportino.user_id);
        break;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: `Permission denied to ${operation} this rapportino`, code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return context;
  } catch {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Check if a value is an error response
 */
export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Wrap an API handler with authentication
 */
export function withAuth<T>(
  handler: (context: AuthContext, ...args: T[]) => Promise<NextResponse>
) {
  return async (...args: T[]): Promise<NextResponse> => {
    const context = await requireAuth();
    if (isErrorResponse(context)) {
      return context;
    }
    return handler(context, ...args);
  };
}

/**
 * Wrap an API handler with permission check
 */
export function withPermission<T>(
  permission: Permission | Permission[],
  handler: (context: AuthContext, ...args: T[]) => Promise<NextResponse>
) {
  return async (...args: T[]): Promise<NextResponse> => {
    const context = await requirePermissions(permission);
    if (isErrorResponse(context)) {
      return context;
    }
    return handler(context, ...args);
  };
}
