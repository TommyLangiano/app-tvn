-- Update tenant_role enum to include all new roles
-- This migration adds: admin_readonly, billing_manager
-- Existing roles: owner, admin, member (legacy), viewer (legacy), operaio

-- Add new roles to the enum
DO $$
BEGIN
  -- Add admin_readonly if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin_readonly'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'tenant_role'
    )
  ) THEN
    ALTER TYPE tenant_role ADD VALUE 'admin_readonly';
  END IF;

  -- Add billing_manager if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'billing_manager'
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'tenant_role'
    )
  ) THEN
    ALTER TYPE tenant_role ADD VALUE 'billing_manager';
  END IF;
END$$;

-- Create function to check if tenant has at least one owner
CREATE OR REPLACE FUNCTION check_tenant_has_owner()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- If we're deleting or updating a role from owner
  IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role != 'owner') THEN

    -- Count remaining owners for this tenant
    SELECT COUNT(*) INTO owner_count
    FROM user_tenants
    WHERE tenant_id = OLD.tenant_id
    AND role = 'owner'
    AND (TG_OP = 'DELETE' OR user_id != NEW.user_id);

    -- If no owners remain, block the operation
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove last owner from tenant. At least one owner must remain.';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce owner constraint
DROP TRIGGER IF EXISTS ensure_tenant_has_owner ON user_tenants;
CREATE TRIGGER ensure_tenant_has_owner
  BEFORE UPDATE OR DELETE ON user_tenants
  FOR EACH ROW
  EXECUTE FUNCTION check_tenant_has_owner();

-- Create index for role-based queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_tenants_role ON user_tenants(role);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_role ON user_tenants(tenant_id, role);

-- Add comment documenting role definitions
COMMENT ON TYPE tenant_role IS
'Tenant user roles:
- owner: Full system access + critical operations (delete tenant, change plan, transfer ownership). Cannot be removed if last owner.
- admin: Full read/write access to all tenant areas except critical operations.
- admin_readonly: Full read-only access to all tenant areas. Cannot modify any data.
- operaio: Access to own dashboard and rapportini only. Can read/write own data.
- billing_manager: Access to billing/payments area only with read/write permissions.
- member: Legacy role, deprecated.
- viewer: Legacy role, deprecated.';
