/**
 * Custom Roles Types
 */

export type SystemRoleKey = 'owner' | 'admin' | 'admin_readonly' | 'dipendente';

export interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  system_role_key: SystemRoleKey | null;
  permissions: RolePermissions;
  icon?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface RolePermissions {
  users?: string[];
  dipendenti?: string[];
  commesse?: string[];
  rapportini?: {
    own?: string[];
    all?: string[];
  };
  clienti?: string[];
  fornitori?: string[];
  fatture?: string[];
  costi?: string[];
  documenti?: string[];
  settings?: string[];
  billing?: string[];
  critical?: string[];
  profile?: string[];
}

export interface CreateCustomRoleInput {
  name: string;
  description?: string;
  permissions: RolePermissions;
  icon?: string;
}

export interface UpdateCustomRoleInput {
  name?: string;
  description?: string;
  permissions?: RolePermissions;
  icon?: string;
}
