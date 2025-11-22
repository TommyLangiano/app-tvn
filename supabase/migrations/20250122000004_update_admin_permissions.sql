-- ============================================================================
-- UPDATE ADMIN PERMISSIONS
-- ============================================================================
-- L'Admin deve avere tutti i permessi come Owner, tranne:
-- - billing (fatturazione)
-- - critical (operazioni critiche: eliminare tenant, trasferire proprietà, cambiare piano)
-- - Non può eliminare un Owner (implementato a livello applicativo)
-- ============================================================================

-- Update Admin role permissions to match Owner (except billing and critical)
UPDATE custom_roles
SET permissions = jsonb_build_object(
  'users', jsonb_build_array('view', 'create', 'update', 'delete'),
  'dipendenti', jsonb_build_array('view', 'create', 'update', 'delete'),
  'commesse', jsonb_build_array('view', 'create', 'update', 'delete'),
  'rapportini', jsonb_build_array('view', 'create', 'update', 'delete'),
  'clienti', jsonb_build_array('view', 'create', 'update', 'delete'),
  'fornitori', jsonb_build_array('view', 'create', 'update', 'delete'),
  'fatture', jsonb_build_array('view', 'create', 'update', 'delete'),
  'costi', jsonb_build_array('view', 'create', 'update', 'delete'),
  'documenti', jsonb_build_array('view', 'upload', 'delete'),
  'settings', jsonb_build_array('view', 'update')
),
updated_at = NOW()
WHERE is_system_role = TRUE
  AND system_role_key = 'admin';

-- Update Owner role rapportini to simple array format
UPDATE custom_roles
SET permissions = jsonb_set(
  permissions,
  '{rapportini}',
  '["view", "create", "update", "delete"]'::jsonb
),
updated_at = NOW()
WHERE is_system_role = TRUE
  AND system_role_key = 'owner'
  AND jsonb_typeof(permissions->'rapportini') = 'object';

-- Update Admin (Sola Lettura) rapportini to simple array format
UPDATE custom_roles
SET permissions = jsonb_set(
  permissions,
  '{rapportini}',
  '["view"]'::jsonb
),
updated_at = NOW()
WHERE is_system_role = TRUE
  AND system_role_key = 'admin_readonly'
  AND jsonb_typeof(permissions->'rapportini') = 'object';

-- Update Dipendente role permissions
UPDATE custom_roles
SET permissions = jsonb_build_object(
  'rapportini', jsonb_build_array('view', 'create', 'update', 'delete'),
  'commesse', jsonb_build_array('view')
),
updated_at = NOW()
WHERE is_system_role = TRUE
  AND system_role_key = 'dipendente';

-- Update Owner role to include documenti permission
UPDATE custom_roles
SET permissions = permissions || jsonb_build_object(
  'documenti', jsonb_build_array('view', 'upload', 'delete')
),
updated_at = NOW()
WHERE is_system_role = TRUE
  AND system_role_key = 'owner'
  AND NOT (permissions ? 'documenti');

-- Update Admin (Sola Lettura) to include documenti view permission
UPDATE custom_roles
SET permissions = permissions || jsonb_build_object(
  'documenti', jsonb_build_array('view')
),
updated_at = NOW()
WHERE is_system_role = TRUE
  AND system_role_key = 'admin_readonly'
  AND NOT (permissions ? 'documenti');

-- Update the trigger function to include documenti in future tenants
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
      "rapportini": ["view", "create", "update", "delete"],
      "clienti": ["view", "create", "update", "delete"],
      "fornitori": ["view", "create", "update", "delete"],
      "fatture": ["view", "create", "update", "delete"],
      "costi": ["view", "create", "update", "delete"],
      "documenti": ["view", "upload", "delete"],
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
      "rapportini": ["view", "create", "update", "delete"],
      "clienti": ["view", "create", "update", "delete"],
      "fornitori": ["view", "create", "update", "delete"],
      "fatture": ["view", "create", "update", "delete"],
      "costi": ["view", "create", "update", "delete"],
      "documenti": ["view", "upload", "delete"],
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
      "rapportini": ["view"],
      "clienti": ["view"],
      "fornitori": ["view"],
      "fatture": ["view"],
      "costi": ["view"],
      "documenti": ["view"],
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
      "rapportini": ["view", "create", "update", "delete"],
      "commesse": ["view"]
    }'::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
