-- ============================================================================
-- ADD CUSTOM ROLES LIMIT PER TENANT
-- ============================================================================
-- Aggiungiamo un limite di massimo 15 ruoli personalizzati per tenant
-- I ruoli di sistema (owner, admin, admin_readonly, dipendente) non contano
-- ============================================================================

-- Create function to check custom roles limit
CREATE OR REPLACE FUNCTION check_custom_roles_limit()
RETURNS TRIGGER AS $$
DECLARE
  custom_roles_count INTEGER;
BEGIN
  -- Only check for non-system roles
  IF NEW.is_system_role = FALSE THEN
    -- Count existing custom roles for this tenant
    SELECT COUNT(*)
    INTO custom_roles_count
    FROM custom_roles
    WHERE tenant_id = NEW.tenant_id
      AND is_system_role = FALSE;

    -- Check if limit is reached (15 custom roles max)
    IF custom_roles_count >= 15 THEN
      RAISE EXCEPTION 'Maximum custom roles limit reached (15) for this tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce limit on INSERT
DROP TRIGGER IF EXISTS trigger_check_custom_roles_limit ON custom_roles;
CREATE TRIGGER trigger_check_custom_roles_limit
  BEFORE INSERT ON custom_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_custom_roles_limit();

-- Add comment
COMMENT ON FUNCTION check_custom_roles_limit() IS 'Ensures each tenant can create a maximum of 15 custom roles (excluding system roles)';
