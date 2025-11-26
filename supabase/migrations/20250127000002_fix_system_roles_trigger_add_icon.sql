-- Fix: Update trigger to include icon field when creating system roles
-- This fixes the "icon_valid" constraint violation during tenant creation

CREATE OR REPLACE FUNCTION create_system_roles_for_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Owner role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions, icon)
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
    }'::jsonb,
    'Crown' -- Icon for owner
  );

  -- Create Admin role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions, icon)
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
    }'::jsonb,
    'Shield' -- Icon for admin
  );

  -- Create Admin (Read-Only) role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions, icon)
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
    }'::jsonb,
    'Eye' -- Icon for read-only admin
  );

  -- Create Dipendente role
  INSERT INTO custom_roles (tenant_id, name, description, is_system_role, system_role_key, permissions, icon)
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
    }'::jsonb,
    'User' -- Icon for dipendente
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON FUNCTION create_system_roles_for_tenant() IS 'Auto-creates system roles (with icons) when a new tenant is created';
