'use client';

import { useRole } from '@/hooks/useRole';
import { TenantRole } from '@/lib/supabaseClient';

interface RoleGuardProps {
  children: React.ReactNode;
  minRole: TenantRole;
  fallback?: React.ReactNode;
}

/**
 * Guard component that checks if user has minimum required role
 * Usage: <RoleGuard minRole="admin">...</RoleGuard>
 */
export function RoleGuard({ children, minRole, fallback }: RoleGuardProps) {
  const { can, loading } = useRole();

  if (loading) {
    return null;
  }

  if (!can(minRole)) {
    return fallback || null;
  }

  return <>{children}</>;
}
