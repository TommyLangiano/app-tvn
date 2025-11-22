-- Fix infinite recursion in custom_roles RLS policies
-- The policies were doing LEFT JOIN on custom_roles within custom_roles policies
-- causing infinite recursion. Fixed by using only user_tenants.role column.

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can create custom roles" ON custom_roles;
DROP POLICY IF EXISTS "Admins can update custom roles" ON custom_roles;
DROP POLICY IF EXISTS "Admins can delete custom roles" ON custom_roles;

-- Recreate policies without recursive JOIN

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
