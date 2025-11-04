/**
 * Server-side Tenant Helper Functions
 *
 * Utilities for working with tenant context in server components and API routes
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Get current user's tenant ID (server-side)
 * Takes the most recent tenant if user belongs to multiple
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  return tenants && tenants.length > 0 ? tenants[0].tenant_id : null;
}

/**
 * Get current user's tenant info (server-side)
 * Returns tenant_id and role
 */
export async function getCurrentUserTenant(): Promise<{
  tenant_id: string;
  role: string;
} | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  return tenants && tenants.length > 0 ? tenants[0] : null;
}
