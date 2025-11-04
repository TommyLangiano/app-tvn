-- Update user_tenants table with extended fields
-- Adds: is_active, created_by, scopes, and improves tracking

-- ============================================================================
-- ADD NEW COLUMNS TO USER_TENANTS
-- ============================================================================

-- Add is_active column (soft detach from tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_tenants'
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Add created_by column (who added the user to tenant)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_tenants'
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add scopes column (future: custom permission overrides)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_tenants'
    AND column_name = 'scopes'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN scopes JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_tenants'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE user_tenants ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_tenants_is_active ON user_tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tenants_created_by ON user_tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_user_tenants_scopes ON user_tenants USING gin(scopes);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_tenants_updated_at ON user_tenants;
CREATE TRIGGER user_tenants_updated_at
  BEFORE UPDATE ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tenants_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is active in a specific tenant
CREATE OR REPLACE FUNCTION is_user_active_in_tenant(
  user_id_param UUID,
  tenant_id_param UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = user_id_param
    AND ut.tenant_id = tenant_id_param
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to soft-disable user in tenant
CREATE OR REPLACE FUNCTION deactivate_user_in_tenant(
  user_id_param UUID,
  tenant_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INT;
BEGIN
  UPDATE user_tenants
  SET is_active = false
  WHERE user_id = user_id_param
  AND tenant_id = tenant_id_param
  AND is_active = true;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate user in tenant
CREATE OR REPLACE FUNCTION reactivate_user_in_tenant(
  user_id_param UUID,
  tenant_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  affected_rows INT;
BEGIN
  UPDATE user_tenants
  SET is_active = true
  WHERE user_id = user_id_param
  AND tenant_id = tenant_id_param
  AND is_active = false;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users count for a tenant
CREATE OR REPLACE FUNCTION get_active_users_count(tenant_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM user_tenants ut
  INNER JOIN user_profiles up ON ut.user_id = up.user_id
  WHERE ut.tenant_id = tenant_id_param
  AND ut.is_active = true
  AND up.is_active = true;

  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- UPDATE RLS POLICIES TO RESPECT is_active
-- ============================================================================

-- Update the helper function to check active status
CREATE OR REPLACE FUNCTION is_admin_or_owner(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update has_read_access to check active status
CREATE OR REPLACE FUNCTION has_read_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner', 'admin_readonly')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update has_write_access to check active status
CREATE OR REPLACE FUNCTION has_write_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role NOT IN ('admin_readonly', 'viewer')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update has_billing_access to check active status
CREATE OR REPLACE FUNCTION has_billing_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner', 'admin_readonly', 'billing_manager')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update can_write_billing to check active status
CREATE OR REPLACE FUNCTION can_write_billing(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants ut
    INNER JOIN user_profiles up ON ut.user_id = up.user_id
    WHERE ut.user_id = auth.uid()
    AND ut.tenant_id = tenant_id_param
    AND ut.role IN ('admin', 'owner', 'billing_manager')
    AND ut.is_active = true
    AND up.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- TRIGGER TO SET created_by
-- ============================================================================

-- Automatically set created_by when adding user to tenant
CREATE OR REPLACE FUNCTION set_user_tenants_created_by()
RETURNS TRIGGER AS $$
BEGIN
  -- Set created_by to current user if not already set
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_created_by ON user_tenants;
CREATE TRIGGER set_created_by
  BEFORE INSERT ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tenants_created_by();

-- ============================================================================
-- BACKFILL created_by FOR EXISTING RECORDS
-- ============================================================================

-- Set created_by to tenant creator for existing records
UPDATE user_tenants ut
SET created_by = t.created_by
FROM tenants t
WHERE ut.tenant_id = t.id
AND ut.created_by IS NULL
AND ut.role = 'owner';

-- For non-owners without created_by, set to tenant owner
UPDATE user_tenants ut
SET created_by = (
  SELECT user_id
  FROM user_tenants ut2
  WHERE ut2.tenant_id = ut.tenant_id
  AND ut2.role = 'owner'
  LIMIT 1
)
WHERE ut.created_by IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN user_tenants.is_active IS 'Soft detach from tenant. False = user cannot access tenant';
COMMENT ON COLUMN user_tenants.created_by IS 'User who added this user to the tenant';
COMMENT ON COLUMN user_tenants.scopes IS 'JSON object for future custom permission overrides';
COMMENT ON COLUMN user_tenants.updated_at IS 'Last modification timestamp';

COMMENT ON FUNCTION is_user_active_in_tenant IS 'Check if user is active in specific tenant (checks both user_tenants.is_active and user_profiles.is_active)';
COMMENT ON FUNCTION deactivate_user_in_tenant IS 'Soft-disable user in tenant';
COMMENT ON FUNCTION reactivate_user_in_tenant IS 'Reactivate user in tenant';
COMMENT ON FUNCTION get_active_users_count IS 'Get count of active users in tenant';
