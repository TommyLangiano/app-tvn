/**
 * User Profile Helper Functions
 *
 * Utilities for working with user profiles and tenant associations
 */

import { createClient } from '@/lib/supabase/client';
import type {
  UserProfile,
  UserWithProfile,
  UserListItem,
  UpdateUserData,
  UserStatusUpdate,
} from '@/types/user-profile';
import type { TenantRole } from '@/lib/permissions';

// ============================================================================
// FETCH USER PROFILES
// ============================================================================

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    return null;
  }

  return data as UserProfile;
}

/**
 * Get complete user information (profile + role + tenant)
 */
export async function getUserWithProfile(userId: string): Promise<UserWithProfile | null> {
  const supabase = createClient();

  // Get current user's tenant
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

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Get user tenant info
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', currentUserTenant.tenant_id)
    .single();

  if (!profile || !userTenant) return null;

  // Get creator's name if created_by exists
  let createdByName = 'Sistema';
  if (userTenant.created_by) {
    const { data: creatorProfile } = await supabase
      .from('user_profiles')
      .select('full_name, first_name, last_name, email')
      .eq('user_id', userTenant.created_by)
      .maybeSingle();

    if (creatorProfile) {
      // Try full_name first, then first_name + last_name, then email
      if (creatorProfile.full_name) {
        createdByName = creatorProfile.full_name;
      } else if (creatorProfile.first_name && creatorProfile.last_name) {
        createdByName = `${creatorProfile.first_name} ${creatorProfile.last_name}`;
      } else if (creatorProfile.email) {
        createdByName = creatorProfile.email;
      }
    }
  }

  return {
    id: profile.user_id,
    email: profile.email,
    full_name: profile.full_name,
    phone: profile.phone,
    avatar_url: profile.avatar_url,
    position: profile.position,
    timezone: profile.timezone,
    locale: profile.locale,
    notes: profile.notes,
    is_active: profile.is_active,
    is_active_in_tenant: userTenant.is_active,
    role: userTenant.role as TenantRole,
    tenant_id: userTenant.tenant_id,
    created_by: createdByName,
    created_at: profile.created_at,
    last_sign_in_at: profile.last_sign_in_at,
    email_confirmed_at: profile.email_confirmed_at,
    birth_date: profile.birth_date,
    hire_date: profile.hire_date,
    medical_checkup_date: profile.medical_checkup_date,
    medical_checkup_expiry: profile.medical_checkup_expiry,
    document_path: profile.document_path,
    username: profile.username,
  };
}

/**
 * Get all users in current tenant with profiles
 */
export async function getTenantUsers(): Promise<UserListItem[]> {
  const supabase = createClient();

  // Get current user's tenant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;

  if (!currentUserTenant) {
    return [];
  }

  // Get all user_tenants for this tenant
  const { data: userTenants, error: userTenantsError } = await supabase
    .from('user_tenants')
    .select('user_id, role, is_active, created_at')
    .eq('tenant_id', currentUserTenant.tenant_id);

  if (userTenantsError || !userTenants) {
    return [];
  }

  // Get profiles for all users
  const userIds = userTenants.map(ut => ut.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id, email, first_name, last_name, full_name, username, avatar_url, position, is_active, last_sign_in_at')
    .in('user_id', userIds);

  if (profilesError || !profiles) {
    return [];
  }

  // Map profiles by user_id for quick lookup
  const profilesMap = new Map(profiles.map(p => [p.user_id, p]));

  const result = userTenants.map((ut) => {
    const profile = profilesMap.get(ut.user_id);
    if (!profile) {
      return null;
    }

    return {
      id: ut.user_id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      position: profile.position,
      role: ut.role as TenantRole,
      is_active: profile.is_active,
      is_active_in_tenant: ut.is_active,
      created_at: ut.created_at,
      last_sign_in_at: profile.last_sign_in_at,
    };
  }).filter(Boolean) as UserListItem[];

  return result;
}

/**
 * Get only active users in current tenant
 */
export async function getActiveUsers(): Promise<UserListItem[]> {
  const users = await getTenantUsers();
  return users.filter(u => u.is_active && u.is_active_in_tenant);
}

// ============================================================================
// UPDATE USER PROFILES
// ============================================================================

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: UpdateUserData
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({
      full_name: updates.full_name,
      phone: updates.phone,
      avatar_url: updates.avatar_url,
      position: updates.position,
      timezone: updates.timezone,
      locale: updates.locale,
      notes: updates.notes,
      is_active: updates.is_active,
    })
    .eq('user_id', userId);

  if (error) {
    return false;
  }

  // Update role if provided
  if (updates.role) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: tenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
    if (!currentUserTenant) return false;

    const { error: roleError } = await supabase
      .from('user_tenants')
      .update({ role: updates.role })
      .eq('user_id', userId)
      .eq('tenant_id', currentUserTenant.tenant_id);

    if (roleError) {
      return false;
    }
  }

  return true;
}

/**
 * Update user status (active/inactive)
 */
export async function updateUserStatus(statusUpdate: UserStatusUpdate): Promise<boolean> {
  const supabase = createClient();

  // Update global is_active in user_profiles
  if (statusUpdate.is_active !== undefined) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: statusUpdate.is_active })
      .eq('user_id', statusUpdate.user_id);

    if (error) {
      return false;
    }
  }

  // Update tenant-specific is_active in user_tenants
  if (statusUpdate.is_active_in_tenant !== undefined) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: tenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
    if (!currentUserTenant) return false;

    const { error } = await supabase
      .from('user_tenants')
      .update({ is_active: statusUpdate.is_active_in_tenant })
      .eq('user_id', statusUpdate.user_id)
      .eq('tenant_id', currentUserTenant.tenant_id);

    if (error) {
      return false;
    }
  }

  return true;
}

/**
 * Deactivate user (soft delete)
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  return updateUserStatus({
    user_id: userId,
    is_active: false,
  });
}

/**
 * Reactivate user
 */
export async function reactivateUser(userId: string): Promise<boolean> {
  return updateUserStatus({
    user_id: userId,
    is_active: true,
  });
}

/**
 * Detach user from current tenant (soft delete from tenant)
 */
export async function detachUserFromTenant(userId: string): Promise<boolean> {
  return updateUserStatus({
    user_id: userId,
    is_active_in_tenant: false,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if user is active in current tenant
 */
export async function isUserActiveInTenant(userId: string): Promise<boolean> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: tenants } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
  if (!currentUserTenant) return false;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_active')
    .eq('user_id', userId)
    .single();

  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('is_active')
    .eq('user_id', userId)
    .eq('tenant_id', currentUserTenant.tenant_id)
    .single();

  if (!profile || !userTenant) return false;

  return profile.is_active && userTenant.is_active;
}

/**
 * Get user display name (full_name or fallback to email)
 */
export function getUserDisplayName(user: UserProfile | UserWithProfile | UserListItem): string {
  return user.full_name || user.email.split('@')[0];
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user: UserProfile | UserWithProfile | UserListItem): string {
  const name = user.full_name || user.email;
  const parts = name.split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

/**
 * Format user position for display
 */
export function formatUserPosition(position?: string): string {
  if (!position) return 'Nessuna posizione';
  return position;
}

/**
 * Get user status badge color
 */
export function getUserStatusColor(user: UserListItem | UserWithProfile): {
  bg: string;
  text: string;
  label: string;
} {
  if (!user.is_active) {
    return {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      label: 'Disattivato',
    };
  }

  if ('is_active_in_tenant' in user && !user.is_active_in_tenant) {
    return {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Sospeso',
    };
  }

  return {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    label: 'Attivo',
  };
}
