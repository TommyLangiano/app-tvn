-- ============================================================================
-- CUSTOM ROLES SYSTEM
-- ============================================================================
-- Sistema di ruoli personalizzati per ogni tenant
-- Permette alle aziende di creare ruoli custom con permessi granulari
--
-- Ruoli di Sistema (predefiniti, non modificabili):
-- - owner: Proprietario unico del tenant
-- - admin: Amministratore con accesso completo
-- - admin_readonly: Admin in sola lettura
-- - dipendente: Accesso base per dipendenti (dashboard dedicata)
--
-- Ruoli Custom: Creati e gestiti da ogni tenant
-- ============================================================================

-- Create custom_roles table
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Role info
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- System role flag (owner, admin, admin_readonly, dipendente)
  is_system_role BOOLEAN DEFAULT FALSE,
  system_role_key VARCHAR(50), -- 'owner', 'admin', 'admin_readonly', 'dipendente'

  -- Permissions as JSONB (granular permissions)
  permissions JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_role_name_per_tenant UNIQUE(tenant_id, name),
  CONSTRAINT unique_system_role_per_tenant UNIQUE(tenant_id, system_role_key),
  CONSTRAINT system_role_key_valid CHECK (
    system_role_key IS NULL OR
    system_role_key IN ('owner', 'admin', 'admin_readonly', 'dipendente')
  )
);

-- Indexes
CREATE INDEX idx_custom_roles_tenant ON custom_roles(tenant_id);
CREATE INDEX idx_custom_roles_system ON custom_roles(is_system_role) WHERE is_system_role = TRUE;

-- Comments
COMMENT ON TABLE custom_roles IS 'Ruoli personalizzati per tenant con permessi granulari';
COMMENT ON COLUMN custom_roles.is_system_role IS 'TRUE se è un ruolo di sistema predefinito (non modificabile)';
COMMENT ON COLUMN custom_roles.system_role_key IS 'Chiave univoca per ruoli sistema: owner, admin, admin_readonly, dipendente';
COMMENT ON COLUMN custom_roles.permissions IS 'Permessi granulari in formato JSONB';

-- ============================================================================
-- MODIFY USER_TENANTS TO USE CUSTOM ROLES
-- ============================================================================

-- Add custom_role_id column to user_tenants
ALTER TABLE user_tenants
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id) ON DELETE RESTRICT;

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_tenants_custom_role ON user_tenants(custom_role_id);

-- Comment
COMMENT ON COLUMN user_tenants.custom_role_id IS 'Reference to custom_roles table (replaces old role string)';

-- Note: We keep the old 'role' column for backward compatibility during migration
-- It will be deprecated later after data migration

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE custom_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view roles in their tenant
CREATE POLICY "Users can view roles in their tenant"
  ON custom_roles
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins and owners can create custom roles (not system roles)
CREATE POLICY "Admins can create custom roles"
  ON custom_roles
  FOR INSERT
  WITH CHECK (
    -- User must be admin or owner in the tenant (using old role column)
    EXISTS (
      SELECT 1
      FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = custom_roles.tenant_id
        AND ut.role IN ('admin', 'owner')
    )
    -- Cannot create system roles via policy (only via migration/seed)
    AND is_system_role = FALSE
  );

-- Policy: Admins can update custom roles (not system roles)
CREATE POLICY "Admins can update custom roles"
  ON custom_roles
  FOR UPDATE
  USING (
    -- Must be in same tenant and user must be admin/owner
    tenant_id IN (
      SELECT ut.tenant_id
      FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.role IN ('admin', 'owner')
    )
    -- Cannot update system roles
    AND is_system_role = FALSE
  )
  WITH CHECK (
    -- Cannot change to system role
    is_system_role = FALSE
  );

-- Policy: Admins can delete custom roles (not system roles)
CREATE POLICY "Admins can delete custom roles"
  ON custom_roles
  FOR DELETE
  USING (
    -- Must be in same tenant and user must be admin/owner
    tenant_id IN (
      SELECT ut.tenant_id
      FROM user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.role IN ('admin', 'owner')
    )
    -- Cannot delete system roles
    AND is_system_role = FALSE
    -- Cannot delete if users are assigned to this role
    AND NOT EXISTS (
      SELECT 1 FROM user_tenants WHERE custom_role_id = custom_roles.id
    )
  );

-- ============================================================================
-- FUNCTION: Auto-create system roles for new tenants
-- ============================================================================

CREATE OR REPLACE FUNCTION create_system_roles_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Owner role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
  VALUES (
    NEW.id,
    'Owner',
    'Proprietario dell''azienda con accesso completo incluso fatturazione e operazioni critiche',
    TRUE,
    'owner',
    '{
      "users": ["view", "create", "update", "delete"],
      "dipendenti": ["view", "create", "update", "delete"],
      "commesse": ["view", "create", "update", "delete"],
      "rapportini": {"own": ["view", "create", "update", "delete"], "all": ["view", "create", "update", "delete"]},
      "clienti": ["view", "create", "update", "delete"],
      "fornitori": ["view", "create", "update", "delete"],
      "fatture": ["view", "create", "update", "delete"],
      "costi": ["view", "create", "update", "delete"],
      "settings": ["view", "update"],
      "billing": ["view", "update"],
      "critical": ["tenant_delete", "tenant_transfer", "plan_change"]
    }'::jsonb
  );

  -- Create Admin role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
  VALUES (
    NEW.id,
    'Admin',
    'Amministratore con accesso completo a tutto il sistema',
    TRUE,
    'admin',
    '{
      "users": ["view", "create", "update", "delete"],
      "dipendenti": ["view", "create", "update", "delete"],
      "commesse": ["view", "create", "update", "delete"],
      "rapportini": {"own": ["view", "create", "update", "delete"], "all": ["view", "create", "update", "delete"]},
      "clienti": ["view", "create", "update", "delete"],
      "fornitori": ["view", "create", "update", "delete"],
      "fatture": ["view", "create", "update", "delete"],
      "costi": ["view", "create", "update", "delete"],
      "settings": ["view", "update"]
    }'::jsonb
  );

  -- Create Admin (Read-Only) role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
  VALUES (
    NEW.id,
    'Admin (Sola Lettura)',
    'Può vedere tutto ma non modificare nulla',
    TRUE,
    'admin_readonly',
    '{
      "users": ["view"],
      "dipendenti": ["view"],
      "commesse": ["view"],
      "rapportini": {"own": ["view"], "all": ["view"]},
      "clienti": ["view"],
      "fornitori": ["view"],
      "fatture": ["view"],
      "costi": ["view"],
      "settings": ["view"]
    }'::jsonb
  );

  -- Create Dipendente role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
  VALUES (
    NEW.id,
    'Dipendente',
    'Accesso base per dipendenti - dashboard dedicata con rapportini e attivita assegnate',
    TRUE,
    'dipendente',
    '{
      "rapportini": {"own": ["view", "create", "update", "delete"], "all": []},
      "commesse": ["view"],
      "profile": ["view", "update"]
    }'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create system roles when a new tenant is created
DROP TRIGGER IF EXISTS trigger_create_system_roles ON tenants;
CREATE TRIGGER trigger_create_system_roles
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_system_roles_for_tenant();

-- ============================================================================
-- SEED SYSTEM ROLES FOR EXISTING TENANTS
-- ============================================================================

-- Create system roles for all existing tenants that don't have them yet
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants LOOP
    -- Only create if not exists
    IF NOT EXISTS (
      SELECT 1 FROM custom_roles
      WHERE tenant_id = tenant_record.id
      AND system_role_key = 'owner'
    ) THEN
      -- Create Owner role
      INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
      VALUES (
        tenant_record.id,
        'Owner',
        'Proprietario dell''azienda con accesso completo incluso fatturazione e operazioni critiche',
        TRUE,
        'owner',
        '{
          "users": ["view", "create", "update", "delete"],
          "dipendenti": ["view", "create", "update", "delete"],
          "commesse": ["view", "create", "update", "delete"],
          "rapportini": {"own": ["view", "create", "update", "delete"], "all": ["view", "create", "update", "delete"]},
          "clienti": ["view", "create", "update", "delete"],
          "fornitori": ["view", "create", "update", "delete"],
          "fatture": ["view", "create", "update", "delete"],
          "costi": ["view", "create", "update", "delete"],
          "settings": ["view", "update"],
          "billing": ["view", "update"],
          "critical": ["tenant_delete", "tenant_transfer", "plan_change"]
        }'::jsonb
      );

      -- Create Admin role
      INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
      VALUES (
        tenant_record.id,
        'Admin',
        'Amministratore con accesso completo a tutto il sistema',
        TRUE,
        'admin',
        '{
          "users": ["view", "create", "update", "delete"],
          "dipendenti": ["view", "create", "update", "delete"],
          "commesse": ["view", "create", "update", "delete"],
          "rapportini": {"own": ["view", "create", "update", "delete"], "all": ["view", "create", "update", "delete"]},
          "clienti": ["view", "create", "update", "delete"],
          "fornitori": ["view", "create", "update", "delete"],
          "fatture": ["view", "create", "update", "delete"],
          "costi": ["view", "create", "update", "delete"],
          "settings": ["view", "update"]
        }'::jsonb
      );

      -- Create Admin (Read-Only) role
      INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
      VALUES (
        tenant_record.id,
        'Admin (Sola Lettura)',
        'Può vedere tutto ma non modificare nulla',
        TRUE,
        'admin_readonly',
        '{
          "users": ["view"],
          "dipendenti": ["view"],
          "commesse": ["view"],
          "rapportini": {"own": ["view"], "all": ["view"]},
          "clienti": ["view"],
          "fornitori": ["view"],
          "fatture": ["view"],
          "costi": ["view"],
          "settings": ["view"]
        }'::jsonb
      );

      -- Create Dipendente role
      INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions)
      VALUES (
        tenant_record.id,
        'Dipendente',
        'Accesso base per dipendenti - dashboard dedicata con rapportini e attivita assegnate',
        TRUE,
        'dipendente',
        '{
          "rapportini": {"own": ["view", "create", "update", "delete"], "all": []},
          "commesse": ["view"],
          "profile": ["view", "update"]
        }'::jsonb
      );
    END IF;
  END LOOP;
END $$;
