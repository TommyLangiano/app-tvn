/**
 * Custom Roles Database Queries
 */

import { createClient } from '@/lib/supabase/client';
import type { CustomRole, CreateCustomRoleInput, UpdateCustomRoleInput } from './types';

/**
 * Get all roles for the current tenant
 */
export async function getTenantRoles(): Promise<CustomRole[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
  if (!currentUserTenant) return [];

  const { data, error } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('tenant_id', currentUserTenant.tenant_id)
    .order('is_system_role', { ascending: false })
    .order('name');

  if (error) {
    console.error('Error fetching roles:', error);
    return [];
  }

  return data as CustomRole[];
}

/**
 * Get system roles for the current tenant
 */
export async function getSystemRoles(): Promise<CustomRole[]> {
  const roles = await getTenantRoles();
  return roles.filter(role => role.is_system_role);
}

/**
 * Get custom (non-system) roles for the current tenant
 */
export async function getCustomRoles(): Promise<CustomRole[]> {
  const roles = await getTenantRoles();
  return roles.filter(role => !role.is_system_role);
}

/**
 * Get a specific role by ID
 */
export async function getRoleById(roleId: string): Promise<CustomRole | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (error) {
    console.error('Error fetching role:', error);
    return null;
  }

  return data as CustomRole;
}

/**
 * Get a system role by key
 */
export async function getSystemRoleByKey(key: 'owner' | 'admin' | 'admin_readonly' | 'dipendente'): Promise<CustomRole | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
  if (!currentUserTenant) return null;

  const { data, error } = await supabase
    .from('custom_roles')
    .select('*')
    .eq('tenant_id', currentUserTenant.tenant_id)
    .eq('system_role_key', key)
    .single();

  if (error) {
    console.error('Error fetching system role:', error);
    return null;
  }

  return data as CustomRole;
}

/**
 * Create a new custom role
 */
export async function createCustomRole(input: CreateCustomRoleInput): Promise<CustomRole | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
  if (!currentUserTenant) return null;

  // Check if tenant has reached the limit of 15 custom roles
  const { count } = await supabase
    .from('custom_roles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', currentUserTenant.tenant_id)
    .eq('is_system_role', false);

  if (count && count >= 15) {
    console.error('Maximum custom roles limit reached (15)');
    return null;
  }

  const { data, error } = await supabase
    .from('custom_roles')
    .insert({
      tenant_id: currentUserTenant.tenant_id,
      name: input.name,
      description: input.description || null,
      is_system_role: false,
      system_role_key: null,
      permissions: input.permissions,
      icon: input.icon || 'Lock',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom role:', error);
    return null;
  }

  return data as CustomRole;
}

/**
 * Update a custom role
 */
export async function updateCustomRole(roleId: string, input: UpdateCustomRoleInput): Promise<boolean> {
  const supabase = createClient();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.permissions !== undefined) updates.permissions = input.permissions;
  if (input.icon !== undefined) updates.icon = input.icon;

  const { error } = await supabase
    .from('custom_roles')
    .update(updates)
    .eq('id', roleId);

  if (error) {
    console.error('Error updating custom role:', error);
    return false;
  }

  return true;
}

/**
 * Delete a custom role
 */
export async function deleteCustomRole(roleId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('custom_roles')
    .delete()
    .eq('id', roleId);

  if (error) {
    console.error('Error deleting custom role:', error);
    return false;
  }

  return true;
}

/**
 * Check if a role can be deleted (no users assigned)
 */
export async function canDeleteRole(roleId: string): Promise<boolean> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_tenants')
    .select('user_id')
    .eq('custom_role_id', roleId)
    .limit(1);

  if (error) {
    console.error('Error checking role usage:', error);
    return false;
  }

  return data.length === 0;
}

/**
 * Get count of users assigned to a role
 */
export async function getRoleUserCount(roleId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('user_tenants')
    .select('user_id', { count: 'exact', head: true })
    .eq('custom_role_id', roleId);

  if (error) {
    console.error('Error counting role users:', error);
    return 0;
  }

  return count || 0;
}
