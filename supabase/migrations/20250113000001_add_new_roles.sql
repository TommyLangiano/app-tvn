-- Add new roles to tenant_role enum
-- We need to recreate the enum to add new values

-- Step 1: Add new enum values (PostgreSQL 12+ supports ALTER TYPE ADD VALUE)
ALTER TYPE tenant_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE tenant_role ADD VALUE IF NOT EXISTS 'operaio';
ALTER TYPE tenant_role ADD VALUE IF NOT EXISTS 'collaboratore_esterno';

-- Step 2: Update RLS policies to include new roles
-- The existing policies should already work with the new roles
-- But we add a helper function to check permissions

-- Helper function to check if user has admin-like permissions
CREATE OR REPLACE FUNCTION has_admin_permissions(check_user_id UUID, check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = check_user_id
    AND tenant_id = check_tenant_id
    AND role IN ('owner', 'admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_admin_permissions IS 'Check if user has admin-like permissions (owner, admin, or manager) in a tenant';
