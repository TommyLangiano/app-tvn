/**
 * Tenant Helper Functions
 *
 * Utilities for working with tenant context in a multi-tenant environment
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get current user's tenant ID (client-side)
 * Takes the most recent tenant if user belongs to multiple
 */
export async function getCurrentTenantId(supabase?: SupabaseClient): Promise<string | null> {
  const client = supabase || createClient();

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: tenant, error } = await client
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }

  return tenant?.tenant_id || null;
}

/**
 * Get current user's tenant info (client-side)
 * Returns tenant_id and role
 */
export async function getCurrentUserTenant(supabase?: SupabaseClient): Promise<{
  tenant_id: string;
  role: string;
} | null> {
  const client = supabase || createClient();

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: tenant, error } = await client
    .from('user_tenants')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user tenant:', error);
    return null;
  }

  return tenant || null;
}
