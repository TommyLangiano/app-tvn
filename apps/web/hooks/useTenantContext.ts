'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface TenantContext {
  tenantId: string | null;
  tenantName: string | null;
  loading: boolean;
  error: Error | null;
}

export function useTenantContext(): TenantContext {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          setTenantId(null);
          setTenantName(null);
          setLoading(false);
          return;
        }

        // Get user's tenants (user might belong to multiple tenants)
        const { data: tenants, error: tenantError } = await supabase
          .from('user_tenants')
          .select(`
            tenant_id,
            tenants (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        // Take the first (most recent) tenant
        const data = tenants && tenants.length > 0 ? tenants[0] : null;

        if (tenantError) {
          throw tenantError;
        }

        if (data) {
          setTenantId(data.tenant_id);
          setTenantName((data.tenants as any)?.name || null);
        } else {
          setTenantId(null);
          setTenantName(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return { tenantId, tenantName, loading, error };
}
