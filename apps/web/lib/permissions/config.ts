/**
 * Centralized Permission Configuration
 *
 * This file defines all roles and their permissions across the application.
 * It serves as the single source of truth for authorization logic.
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  ADMIN_READONLY: 'admin_readonly',
  OPERAIO: 'operaio',
  BILLING_MANAGER: 'billing_manager',
  // Legacy roles (deprecated, for backward compatibility)
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type TenantRole = typeof ROLES[keyof typeof ROLES];

// Active roles (for UI dropdowns, etc.)
export const ACTIVE_ROLES: TenantRole[] = [
  ROLES.ADMIN,
  ROLES.ADMIN_READONLY,
  ROLES.OPERAIO,
  ROLES.BILLING_MANAGER,
] as const;

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export const PERMISSIONS = {
  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Rapportini - Own
  RAPPORTINI_OWN_VIEW: 'rapportini:own:view',
  RAPPORTINI_OWN_CREATE: 'rapportini:own:create',
  RAPPORTINI_OWN_UPDATE: 'rapportini:own:update',
  RAPPORTINI_OWN_DELETE: 'rapportini:own:delete',

  // Rapportini - All
  RAPPORTINI_ALL_VIEW: 'rapportini:all:view',
  RAPPORTINI_ALL_CREATE: 'rapportini:all:create',
  RAPPORTINI_ALL_UPDATE: 'rapportini:all:update',
  RAPPORTINI_ALL_DELETE: 'rapportini:all:delete',

  // Commesse (Projects)
  COMMESSE_VIEW: 'commesse:view',
  COMMESSE_CREATE: 'commesse:create',
  COMMESSE_UPDATE: 'commesse:update',
  COMMESSE_DELETE: 'commesse:delete',

  // Clienti (Clients)
  CLIENTI_VIEW: 'clienti:view',
  CLIENTI_CREATE: 'clienti:create',
  CLIENTI_UPDATE: 'clienti:update',
  CLIENTI_DELETE: 'clienti:delete',

  // Fornitori (Suppliers)
  FORNITORI_VIEW: 'fornitori:view',
  FORNITORI_CREATE: 'fornitori:create',
  FORNITORI_UPDATE: 'fornitori:update',
  FORNITORI_DELETE: 'fornitori:delete',

  // Fatture (Invoices)
  FATTURE_VIEW: 'fatture:view',
  FATTURE_CREATE: 'fatture:create',
  FATTURE_UPDATE: 'fatture:update',
  FATTURE_DELETE: 'fatture:delete',

  // Costi (Costs)
  COSTI_VIEW: 'costi:view',
  COSTI_CREATE: 'costi:create',
  COSTI_UPDATE: 'costi:update',
  COSTI_DELETE: 'costi:delete',

  // Tenant Profile
  TENANT_VIEW: 'tenant:view',
  TENANT_UPDATE: 'tenant:update',

  // Billing & Subscription
  BILLING_VIEW: 'billing:view',
  BILLING_UPDATE: 'billing:update',

  // Critical Operations (owner only)
  TENANT_DELETE: 'tenant:delete',
  TENANT_TRANSFER: 'tenant:transfer',
  PLAN_CHANGE: 'plan:change',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================================================
// ROLE-PERMISSION MAPPING
// ============================================================================

export const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  // OWNER: Full access to everything including critical operations
  [ROLES.OWNER]: [
    // Users
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,

    // Rapportini - All
    PERMISSIONS.RAPPORTINI_OWN_VIEW,
    PERMISSIONS.RAPPORTINI_OWN_CREATE,
    PERMISSIONS.RAPPORTINI_OWN_UPDATE,
    PERMISSIONS.RAPPORTINI_OWN_DELETE,
    PERMISSIONS.RAPPORTINI_ALL_VIEW,
    PERMISSIONS.RAPPORTINI_ALL_CREATE,
    PERMISSIONS.RAPPORTINI_ALL_UPDATE,
    PERMISSIONS.RAPPORTINI_ALL_DELETE,

    // Commesse
    PERMISSIONS.COMMESSE_VIEW,
    PERMISSIONS.COMMESSE_CREATE,
    PERMISSIONS.COMMESSE_UPDATE,
    PERMISSIONS.COMMESSE_DELETE,

    // Clienti
    PERMISSIONS.CLIENTI_VIEW,
    PERMISSIONS.CLIENTI_CREATE,
    PERMISSIONS.CLIENTI_UPDATE,
    PERMISSIONS.CLIENTI_DELETE,

    // Fornitori
    PERMISSIONS.FORNITORI_VIEW,
    PERMISSIONS.FORNITORI_CREATE,
    PERMISSIONS.FORNITORI_UPDATE,
    PERMISSIONS.FORNITORI_DELETE,

    // Fatture
    PERMISSIONS.FATTURE_VIEW,
    PERMISSIONS.FATTURE_CREATE,
    PERMISSIONS.FATTURE_UPDATE,
    PERMISSIONS.FATTURE_DELETE,

    // Costi
    PERMISSIONS.COSTI_VIEW,
    PERMISSIONS.COSTI_CREATE,
    PERMISSIONS.COSTI_UPDATE,
    PERMISSIONS.COSTI_DELETE,

    // Tenant
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.TENANT_UPDATE,

    // Billing
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_UPDATE,

    // Critical Operations
    PERMISSIONS.TENANT_DELETE,
    PERMISSIONS.TENANT_TRANSFER,
    PERMISSIONS.PLAN_CHANGE,
  ],

  // ADMIN: Full read/write access except critical operations
  [ROLES.ADMIN]: [
    // Users
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,

    // Rapportini - All
    PERMISSIONS.RAPPORTINI_OWN_VIEW,
    PERMISSIONS.RAPPORTINI_OWN_CREATE,
    PERMISSIONS.RAPPORTINI_OWN_UPDATE,
    PERMISSIONS.RAPPORTINI_OWN_DELETE,
    PERMISSIONS.RAPPORTINI_ALL_VIEW,
    PERMISSIONS.RAPPORTINI_ALL_CREATE,
    PERMISSIONS.RAPPORTINI_ALL_UPDATE,
    PERMISSIONS.RAPPORTINI_ALL_DELETE,

    // Commesse
    PERMISSIONS.COMMESSE_VIEW,
    PERMISSIONS.COMMESSE_CREATE,
    PERMISSIONS.COMMESSE_UPDATE,
    PERMISSIONS.COMMESSE_DELETE,

    // Clienti
    PERMISSIONS.CLIENTI_VIEW,
    PERMISSIONS.CLIENTI_CREATE,
    PERMISSIONS.CLIENTI_UPDATE,
    PERMISSIONS.CLIENTI_DELETE,

    // Fornitori
    PERMISSIONS.FORNITORI_VIEW,
    PERMISSIONS.FORNITORI_CREATE,
    PERMISSIONS.FORNITORI_UPDATE,
    PERMISSIONS.FORNITORI_DELETE,

    // Fatture
    PERMISSIONS.FATTURE_VIEW,
    PERMISSIONS.FATTURE_CREATE,
    PERMISSIONS.FATTURE_UPDATE,
    PERMISSIONS.FATTURE_DELETE,

    // Costi
    PERMISSIONS.COSTI_VIEW,
    PERMISSIONS.COSTI_CREATE,
    PERMISSIONS.COSTI_UPDATE,
    PERMISSIONS.COSTI_DELETE,

    // Tenant
    PERMISSIONS.TENANT_VIEW,
    PERMISSIONS.TENANT_UPDATE,

    // Billing
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_UPDATE,
  ],

  // ADMIN_READONLY: Full read access, zero write access
  [ROLES.ADMIN_READONLY]: [
    // Users
    PERMISSIONS.USERS_VIEW,

    // Rapportini - All (read only)
    PERMISSIONS.RAPPORTINI_OWN_VIEW,
    PERMISSIONS.RAPPORTINI_ALL_VIEW,

    // Commesse
    PERMISSIONS.COMMESSE_VIEW,

    // Clienti
    PERMISSIONS.CLIENTI_VIEW,

    // Fornitori
    PERMISSIONS.FORNITORI_VIEW,

    // Fatture
    PERMISSIONS.FATTURE_VIEW,

    // Costi
    PERMISSIONS.COSTI_VIEW,

    // Tenant
    PERMISSIONS.TENANT_VIEW,

    // Billing
    PERMISSIONS.BILLING_VIEW,
  ],

  // OPERAIO: Access to own rapportini only
  [ROLES.OPERAIO]: [
    // Rapportini - Own only
    PERMISSIONS.RAPPORTINI_OWN_VIEW,
    PERMISSIONS.RAPPORTINI_OWN_CREATE,
    PERMISSIONS.RAPPORTINI_OWN_UPDATE,
    PERMISSIONS.RAPPORTINI_OWN_DELETE,

    // Can view commesse (to select for rapportini)
    PERMISSIONS.COMMESSE_VIEW,
  ],

  // BILLING_MANAGER: Access to billing/invoices/costs only
  [ROLES.BILLING_MANAGER]: [
    // Fatture
    PERMISSIONS.FATTURE_VIEW,
    PERMISSIONS.FATTURE_CREATE,
    PERMISSIONS.FATTURE_UPDATE,
    PERMISSIONS.FATTURE_DELETE,

    // Costi
    PERMISSIONS.COSTI_VIEW,
    PERMISSIONS.COSTI_CREATE,
    PERMISSIONS.COSTI_UPDATE,
    PERMISSIONS.COSTI_DELETE,

    // Clienti/Fornitori (read only for billing context)
    PERMISSIONS.CLIENTI_VIEW,
    PERMISSIONS.FORNITORI_VIEW,

    // Billing
    PERMISSIONS.BILLING_VIEW,
    PERMISSIONS.BILLING_UPDATE,
  ],

  // MEMBER: Legacy role - minimal permissions
  [ROLES.MEMBER]: [
    PERMISSIONS.RAPPORTINI_OWN_VIEW,
    PERMISSIONS.COMMESSE_VIEW,
  ],

  // VIEWER: Legacy role - read-only access
  [ROLES.VIEWER]: [
    PERMISSIONS.COMMESSE_VIEW,
    PERMISSIONS.CLIENTI_VIEW,
    PERMISSIONS.RAPPORTINI_ALL_VIEW,
  ],
};

// ============================================================================
// ROLE METADATA
// ============================================================================

// ============================================================================
// PERMISSION LABELS (User-friendly descriptions)
// ============================================================================

export const PERMISSION_LABELS: Record<Permission, string> = {
  // Users
  'users:view': 'Visualizza utenti',
  'users:create': 'Crea utenti',
  'users:update': 'Modifica utenti',
  'users:delete': 'Elimina utenti',

  // Rapportini - Own
  'rapportini:own:view': 'Visualizza propri rapportini',
  'rapportini:own:create': 'Crea propri rapportini',
  'rapportini:own:update': 'Modifica propri rapportini',
  'rapportini:own:delete': 'Elimina propri rapportini',

  // Rapportini - All
  'rapportini:all:view': 'Visualizza tutti i rapportini',
  'rapportini:all:create': 'Crea rapportini per altri',
  'rapportini:all:update': 'Modifica rapportini di altri',
  'rapportini:all:delete': 'Elimina rapportini di altri',

  // Commesse
  'commesse:view': 'Visualizza commesse',
  'commesse:create': 'Crea commesse',
  'commesse:update': 'Modifica commesse',
  'commesse:delete': 'Elimina commesse',

  // Clienti
  'clienti:view': 'Visualizza clienti',
  'clienti:create': 'Crea clienti',
  'clienti:update': 'Modifica clienti',
  'clienti:delete': 'Elimina clienti',

  // Fornitori
  'fornitori:view': 'Visualizza fornitori',
  'fornitori:create': 'Crea fornitori',
  'fornitori:update': 'Modifica fornitori',
  'fornitori:delete': 'Elimina fornitori',

  // Fatture
  'fatture:view': 'Visualizza fatture',
  'fatture:create': 'Crea fatture',
  'fatture:update': 'Modifica fatture',
  'fatture:delete': 'Elimina fatture',

  // Costi
  'costi:view': 'Visualizza costi',
  'costi:create': 'Crea costi',
  'costi:update': 'Modifica costi',
  'costi:delete': 'Elimina costi',

  // Tenant
  'tenant:view': 'Visualizza impostazioni azienda',
  'tenant:update': 'Modifica impostazioni azienda',

  // Billing
  'billing:view': 'Visualizza fatturazione',
  'billing:update': 'Gestisci fatturazione',

  // Critical Operations
  'tenant:delete': 'Elimina azienda',
  'tenant:transfer': 'Trasferisci proprietà',
  'plan:change': 'Cambia piano abbonamento',
};

export const ROLE_METADATA: Record<TenantRole, {
  label: string;
  description: string;
  color: string;
  icon: string;
  isLegacy?: boolean;
  isHiddenFromUI?: boolean;
  permissions?: string[]; // User-friendly permission descriptions
}> = {
  [ROLES.OWNER]: {
    label: 'Owner',
    description: 'Proprietario con accesso completo e operazioni critiche',
    color: 'purple',
    icon: 'Crown',
    isHiddenFromUI: true, // Not shown in normal UI, tech role
  },
  [ROLES.ADMIN]: {
    label: 'Admin',
    description: 'Accesso completo in lettura e scrittura',
    color: 'emerald',
    icon: 'Shield',
  },
  [ROLES.ADMIN_READONLY]: {
    label: 'Admin (Sola Lettura)',
    description: 'Accesso completo in sola lettura, nessuna modifica',
    color: 'blue',
    icon: 'Eye',
  },
  [ROLES.OPERAIO]: {
    label: 'Operaio',
    description: 'Accesso alla dashboard operativa e propri rapportini',
    color: 'amber',
    icon: 'User',
  },
  [ROLES.BILLING_MANAGER]: {
    label: 'Responsabile Fatturazione',
    description: 'Accesso ad area pagamenti e fatture',
    color: 'indigo',
    icon: 'Receipt',
  },
  [ROLES.MEMBER]: {
    label: 'Member',
    description: 'Ruolo legacy deprecato',
    color: 'gray',
    icon: 'User',
    isLegacy: true,
    isHiddenFromUI: true,
  },
  [ROLES.VIEWER]: {
    label: 'Viewer',
    description: 'Ruolo legacy deprecato',
    color: 'gray',
    icon: 'Eye',
    isLegacy: true,
    isHiddenFromUI: true,
  },
};
