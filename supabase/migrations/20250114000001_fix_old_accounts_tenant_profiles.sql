-- Fix old accounts created before onboarding system
-- Create tenant_profiles for all tenants that don't have one

INSERT INTO tenant_profiles (tenant_id, ragione_sociale, forma_giuridica, onboarding_completed)
SELECT
  t.id AS tenant_id,
  t.name AS ragione_sociale,
  'SRL' AS forma_giuridica,
  true AS onboarding_completed
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM tenant_profiles tp
  WHERE tp.tenant_id = t.id
);

-- Update any existing tenant_profiles that have onboarding_completed = NULL
UPDATE tenant_profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NULL;
