'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenantContext } from './useTenantContext';
import { TenantRole } from '@/lib/supabaseClient';

// Role hierarchy: viewer < member < admin < owner
const ROLE_HIERARCHY: Record<TenantRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

interface UseRoleReturn {
  role: TenantRole | null;
  loading: boolean;
  error: Error | null;
  can: (minRole: TenantRole) => boolean;
}

export function useRole(): UseRoleReturn {
  const { tenantId } = useTenantContext();
  const [role, setRole] = useState<TenantRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!tenantId) {
        setRole(null);
        setLoading(false);
        return;
      }

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
          setRole(null);
          setLoading(false);
          return;
        }

        // Get user's role for this tenant
        const { data, error: roleError } = await supabase
          .from('user_tenants')
          .select('role')
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (roleError) {
          throw roleError;
        }

        setRole(data?.role as TenantRole || null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [tenantId]);

  const can = (minRole: TenantRole): boolean => {
    if (!role) return false;
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
  };

  return { role, loading, error, can };
}
