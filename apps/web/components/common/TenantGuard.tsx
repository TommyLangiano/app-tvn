'use client';

import { useTenantContext } from '@/hooks/useTenantContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface TenantGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that ensures user has a tenant
 * Redirects to dashboard if no tenant (where CreateTenantForm will show)
 */
export function TenantGuard({ children, fallback }: TenantGuardProps) {
  const { tenantId, loading, error } = useTenantContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !tenantId && !error) {
      // No tenant, redirect to dashboard to show create form
      router.push('/dashboard');
    }
  }, [tenantId, loading, error, router]);

  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading workspace...</div>
        </div>
      )
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-destructive">Error loading workspace</div>
      </div>
    );
  }

  if (!tenantId) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
