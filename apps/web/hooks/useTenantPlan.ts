'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenantContext } from './useTenantContext';
import { PlanId } from '@/lib/supabaseClient';

// Feature availability per plan
const PLAN_FEATURES: Record<PlanId, string[]> = {
  base: ['reports'],
  pro: ['reports', 'analytics'],
  premium: ['reports', 'analytics', 'advanced-exports', 'api-access', 'priority-support'],
};

interface UseTenantPlanReturn {
  plan: PlanId | null;
  loading: boolean;
  error: Error | null;
  hasFeature: (feature: string) => boolean;
}

export function useTenantPlan(): UseTenantPlanReturn {
  const { tenantId } = useTenantContext();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!tenantId) {
        setPlan(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Query tenant_plan view (shows active plan including trial)
        const { data, error: planError } = await supabase
          .from('tenant_plan')
          .select('plan_id')
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (planError) {
          throw planError;
        }

        setPlan(data?.plan_id as PlanId || null);
      } catch (err) {
        console.error('Error fetching plan:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [tenantId]);

  const hasFeature = (feature: string): boolean => {
    if (!plan) return false;
    return PLAN_FEATURES[plan]?.includes(feature) || false;
  };

  return { plan, loading, error, hasFeature };
}
