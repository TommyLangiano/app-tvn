'use client';

import { useTenantPlan } from '@/hooks/useTenantPlan';

interface FeatureGuardProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
}

/**
 * Guard component that checks if tenant plan has access to a feature
 * Usage: <FeatureGuard feature="analytics">...</FeatureGuard>
 */
export function FeatureGuard({ children, feature, fallback }: FeatureGuardProps) {
  const { hasFeature, loading } = useTenantPlan();

  if (loading) {
    return null;
  }

  if (!hasFeature(feature)) {
    return (
      fallback || (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This feature requires a higher plan
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}
