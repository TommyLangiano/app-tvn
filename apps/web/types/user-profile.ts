/**
 * User Profile Types
 *
 * Types for extended user profile information
 */

import type { TenantRole } from '@/lib/permissions';

// ============================================================================
// USER PROFILE
// ============================================================================

export interface UserProfile {
  user_id: string;

  // Personal Information
  first_name?: string;
  last_name?: string;
  full_name?: string; // Auto-generated from first_name + last_name
  username?: string; // Auto-generated: cognome_nome (unique)
  phone?: string;
  avatar_url?: string;

  // Professional Information
  position?: string; // Business role (e.g., "Tecnico", "Contabile")

  // HR Information
  birth_date?: string;
  hire_date?: string;
  medical_checkup_date?: string;
  medical_checkup_expiry?: string;
  document_path?: string;

  // Localization
  timezone: string;
  locale: string;

  // Additional Info
  notes?: string; // Internal notes (admin only)

  // Status
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Denormalized from auth.users
  email: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

export interface UserProfileFormData {
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  position?: string;
  timezone?: string;
  locale?: string;
  notes?: string;
}

// ============================================================================
// USER TENANT ASSOCIATION
// ============================================================================

export interface UserTenant {
  user_id: string;
  tenant_id: string;
  role: TenantRole;
  is_active: boolean;
  created_by?: string;
  scopes?: Record<string, unknown>; // Future: custom permission overrides
  created_at: string;
  updated_at?: string;
}

// ============================================================================
// COMBINED USER DATA
// ============================================================================

/**
 * Complete user information including profile, role, and tenant association
 */
export interface UserWithProfile {
  // Auth user ID
  id: string;

  // Profile information
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  phone?: string;
  avatar_url?: string;
  position?: string;
  timezone?: string;
  locale?: string;
  notes?: string;

  // HR Information
  birth_date?: string;
  hire_date?: string;
  medical_checkup_date?: string;
  medical_checkup_expiry?: string;
  document_path?: string;

  // Status
  is_active: boolean;
  is_active_in_tenant: boolean;

  // Role and tenant
  role: TenantRole;
  tenant_id: string;
  created_by?: string;

  // Timestamps
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}

/**
 * User data for display in tables/lists
 */
export interface UserListItem {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
  position?: string;
  role: TenantRole;
  is_active: boolean;
  is_active_in_tenant: boolean;
  created_at: string;
  last_sign_in_at?: string;
}

/**
 * Form data for creating a new user
 */
export interface CreateUserData {
  // Auth credentials
  email: string;
  password: string;

  // Profile
  first_name: string;
  last_name: string;
  phone?: string;
  position?: string;

  // Tenant assignment
  role: Exclude<TenantRole, 'owner' | 'member' | 'viewer'>; // Only active roles
  tenant_id?: string; // Optional, defaults to current user's tenant
}

/**
 * Form data for updating a user
 */
export interface UpdateUserData {
  // Profile updates
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  position?: string;
  timezone?: string;
  locale?: string;
  notes?: string;

  // Status (admin only)
  is_active?: boolean;

  // Role update (admin only)
  role?: TenantRole;
}

/**
 * Data for deactivating/reactivating a user
 */
export interface UserStatusUpdate {
  user_id: string;
  is_active?: boolean; // Global deactivation (affects all tenants)
  is_active_in_tenant?: boolean; // Tenant-specific deactivation
}

// ============================================================================
// USER ACTIVITY & METADATA
// ============================================================================

export interface UserActivity {
  user_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  email: string;
  avatar_url?: string;
  last_sign_in_at?: string;
  created_at: string;

  // Activity metrics
  rapportini_count?: number;
  last_rapportino_date?: string;
  total_hours?: number;
}

/**
 * User metadata for tooltips/cards
 */
export interface UserCardData {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  email: string;
  avatar_url?: string;
  position?: string;
  role: TenantRole;
  is_active: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isUserActive(user: UserWithProfile | UserListItem | UserProfile): boolean {
  return user.is_active === true;
}

export function isUserActiveInTenant(user: UserWithProfile | UserListItem): boolean {
  return 'is_active_in_tenant' in user && user.is_active_in_tenant === true;
}

export function hasUserProfile(user: unknown): user is UserProfile {
  return (
    typeof user === 'object' &&
    user !== null &&
    'user_id' in user &&
    'email' in user &&
    'is_active' in user
  );
}
