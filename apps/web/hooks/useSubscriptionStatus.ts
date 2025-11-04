'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenantContext } from './useTenantContext';
import { PlanId, SubscriptionStatus } from '@/lib/supabaseClient';

interface SubscriptionStatusData {
  plan: PlanId | null;
  status: SubscriptionStatus | null;
  trialEnd: string | null;
  isTrialing: boolean;
  loading: boolean;
  error: Error | null;
}

export function useSubscriptionStatus(): SubscriptionStatusData {
  const { tenantId } = useTenantContext();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Get active subscription for tenant
        const { data, error: subError } = await supabase
          .from('subscriptions')
          .select('plan_id, status, trial_end')
          .eq('tenant_id', tenantId)
          .in('status', ['trialing', 'active', 'past_due', 'incomplete'])
          .maybeSingle();

        if (subError) {
          throw subError;
        }

        if (data) {
          setPlan(data.plan_id as PlanId);
          setStatus(data.status as SubscriptionStatus);
          setTrialEnd(data.trial_end);
        } else {
          setPlan(null);
          setStatus(null);
          setTrialEnd(null);
        }
      } catch (err) {

        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [tenantId]);

  const isTrialing = status === 'trialing' && !!trialEnd && new Date(trialEnd) > new Date();

  return { plan, status, trialEnd, isTrialing, loading, error };
}
