-- Update RLS policies to support new role system
-- This migration updates policies across all tables to properly handle:
-- - owner, admin (full read/write)
-- - admin_readonly (read only)
-- - operaio (own data only)
-- - billing_manager (billing data only)

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user is admin or owner
CREATE OR REPLACE FUNCTION is_admin_or_owner(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_id_param
    AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has read access (admin, owner, or admin_readonly)
CREATE OR REPLACE FUNCTION has_read_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_id_param
    AND role IN ('admin', 'owner', 'admin_readonly')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has write access (not read-only)
CREATE OR REPLACE FUNCTION has_write_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_id_param
    AND role NOT IN ('admin_readonly', 'viewer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has billing access
CREATE OR REPLACE FUNCTION has_billing_access(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_id_param
    AND role IN ('admin', 'owner', 'admin_readonly', 'billing_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user can write billing data
CREATE OR REPLACE FUNCTION can_write_billing(tenant_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_id_param
    AND role IN ('admin', 'owner', 'billing_manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- RAPPORTINI POLICIES (handle own vs all access)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view rapportini in their tenant" ON rapportini;
DROP POLICY IF EXISTS "Users can create rapportini in their tenant" ON rapportini;
DROP POLICY IF EXISTS "Users can update rapportini in their tenant" ON rapportini;
DROP POLICY IF EXISTS "Users can delete rapportini in their tenant" ON rapportini;

-- View: admin/owner/admin_readonly can view all, operaio can view own
CREATE POLICY "rapportini_select_policy" ON rapportini
  FOR SELECT
  USING (
    -- Tenant match is required
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      -- Admin/owner/readonly can view all
      has_read_access(tenant_id)
      OR
      -- Operaio can view own
      (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_tenants
          WHERE user_id = auth.uid()
          AND tenant_id = rapportini.tenant_id
          AND role = 'operaio'
        )
      )
    )
  );

-- Create: admin/owner can create for anyone, operaio can create own
CREATE POLICY "rapportini_insert_policy" ON rapportini
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      -- Admin/owner can create for anyone
      is_admin_or_owner(tenant_id)
      OR
      -- Operaio can create own
      (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_tenants
          WHERE user_id = auth.uid()
          AND tenant_id = rapportini.tenant_id
          AND role = 'operaio'
        )
      )
    )
  );

-- Update: admin/owner can update all, operaio can update own, readonly cannot update
CREATE POLICY "rapportini_update_policy" ON rapportini
  FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      -- Admin/owner can update all
      is_admin_or_owner(tenant_id)
      OR
      -- Operaio can update own
      (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_tenants
          WHERE user_id = auth.uid()
          AND tenant_id = rapportini.tenant_id
          AND role = 'operaio'
        )
      )
    )
  );

-- Delete: same as update
CREATE POLICY "rapportini_delete_policy" ON rapportini
  FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      is_admin_or_owner(tenant_id)
      OR
      (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM user_tenants
          WHERE user_id = auth.uid()
          AND tenant_id = rapportini.tenant_id
          AND role = 'operaio'
        )
      )
    )
  );

-- ============================================================================
-- COMMESSE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view commesse in their tenant" ON commesse;
DROP POLICY IF EXISTS "Users can insert commesse in their tenant" ON commesse;
DROP POLICY IF EXISTS "Users can update commesse in their tenant" ON commesse;
DROP POLICY IF EXISTS "Users can delete commesse in their tenant" ON commesse;

-- View: all authenticated tenant users can view
CREATE POLICY "commesse_select_policy" ON commesse
  FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

-- Create/Update/Delete: only admin/owner with write access
CREATE POLICY "commesse_insert_policy" ON commesse
  FOR INSERT
  WITH CHECK (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "commesse_update_policy" ON commesse
  FOR UPDATE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "commesse_delete_policy" ON commesse
  FOR DELETE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

-- ============================================================================
-- CLIENTI POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view clienti in their tenant" ON clienti;
DROP POLICY IF EXISTS "Users can insert clienti in their tenant" ON clienti;
DROP POLICY IF EXISTS "Users can update clienti in their tenant" ON clienti;
DROP POLICY IF EXISTS "Users can delete clienti in their tenant" ON clienti;

-- View: admin/owner/readonly/billing_manager
CREATE POLICY "clienti_select_policy" ON clienti
  FOR SELECT
  USING (
    has_read_access(tenant_id)
    OR has_billing_access(tenant_id)
  );

-- Write: admin/owner only
CREATE POLICY "clienti_insert_policy" ON clienti
  FOR INSERT
  WITH CHECK (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "clienti_update_policy" ON clienti
  FOR UPDATE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "clienti_delete_policy" ON clienti
  FOR DELETE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

-- ============================================================================
-- FORNITORI POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view fornitori in their tenant" ON fornitori;
DROP POLICY IF EXISTS "Users can insert fornitori in their tenant" ON fornitori;
DROP POLICY IF EXISTS "Users can update fornitori in their tenant" ON fornitori;
DROP POLICY IF EXISTS "Users can delete fornitori in their tenant" ON fornitori;

-- Same as clienti
CREATE POLICY "fornitori_select_policy" ON fornitori
  FOR SELECT
  USING (
    has_read_access(tenant_id)
    OR has_billing_access(tenant_id)
  );

CREATE POLICY "fornitori_insert_policy" ON fornitori
  FOR INSERT
  WITH CHECK (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "fornitori_update_policy" ON fornitori
  FOR UPDATE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "fornitori_delete_policy" ON fornitori
  FOR DELETE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

-- ============================================================================
-- FATTURE ATTIVE POLICIES (billing access)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view fatture_attive in their tenant" ON fatture_attive;
DROP POLICY IF EXISTS "Users can insert fatture_attive in their tenant" ON fatture_attive;
DROP POLICY IF EXISTS "Users can update fatture_attive in their tenant" ON fatture_attive;
DROP POLICY IF EXISTS "Users can delete fatture_attive in their tenant" ON fatture_attive;

-- View: admin/owner/readonly/billing_manager
CREATE POLICY "fatture_attive_select_policy" ON fatture_attive
  FOR SELECT
  USING (has_billing_access(tenant_id));

-- Write: admin/owner/billing_manager
CREATE POLICY "fatture_attive_insert_policy" ON fatture_attive
  FOR INSERT
  WITH CHECK (can_write_billing(tenant_id));

CREATE POLICY "fatture_attive_update_policy" ON fatture_attive
  FOR UPDATE
  USING (can_write_billing(tenant_id));

CREATE POLICY "fatture_attive_delete_policy" ON fatture_attive
  FOR DELETE
  USING (can_write_billing(tenant_id));

-- ============================================================================
-- COSTI POLICIES (billing access)
-- ============================================================================

-- Costi Commessa (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'costi_commessa') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view costi_commessa in their tenant" ON costi_commessa';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert costi_commessa in their tenant" ON costi_commessa';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update costi_commessa in their tenant" ON costi_commessa';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete costi_commessa in their tenant" ON costi_commessa';

    EXECUTE 'CREATE POLICY "costi_commessa_select_policy" ON costi_commessa FOR SELECT USING (has_billing_access(tenant_id))';
    EXECUTE 'CREATE POLICY "costi_commessa_insert_policy" ON costi_commessa FOR INSERT WITH CHECK (can_write_billing(tenant_id))';
    EXECUTE 'CREATE POLICY "costi_commessa_update_policy" ON costi_commessa FOR UPDATE USING (can_write_billing(tenant_id))';
    EXECUTE 'CREATE POLICY "costi_commessa_delete_policy" ON costi_commessa FOR DELETE USING (can_write_billing(tenant_id))';
  END IF;
END $$;

-- Costi Generali (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'costi_generali') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view costi_generali in their tenant" ON costi_generali';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert costi_generali in their tenant" ON costi_generali';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update costi_generali in their tenant" ON costi_generali';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete costi_generali in their tenant" ON costi_generali';

    EXECUTE 'CREATE POLICY "costi_generali_select_policy" ON costi_generali FOR SELECT USING (has_billing_access(tenant_id))';
    EXECUTE 'CREATE POLICY "costi_generali_insert_policy" ON costi_generali FOR INSERT WITH CHECK (can_write_billing(tenant_id))';
    EXECUTE 'CREATE POLICY "costi_generali_update_policy" ON costi_generali FOR UPDATE USING (can_write_billing(tenant_id))';
    EXECUTE 'CREATE POLICY "costi_generali_delete_policy" ON costi_generali FOR DELETE USING (can_write_billing(tenant_id))';
  END IF;
END $$;

-- ============================================================================
-- TENANT PROFILES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their tenant profile" ON tenant_profiles;
DROP POLICY IF EXISTS "Admins can update their tenant profile" ON tenant_profiles;
DROP POLICY IF EXISTS "Admins can insert their tenant profile" ON tenant_profiles;

-- View: all users in tenant
CREATE POLICY "tenant_profiles_select_policy" ON tenant_profiles
  FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
  );

-- Insert/Update: admin/owner only (not readonly)
CREATE POLICY "tenant_profiles_insert_policy" ON tenant_profiles
  FOR INSERT
  WITH CHECK (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

CREATE POLICY "tenant_profiles_update_policy" ON tenant_profiles
  FOR UPDATE
  USING (
    is_admin_or_owner(tenant_id)
    AND has_write_access(tenant_id)
  );

-- Add comments
COMMENT ON FUNCTION is_admin_or_owner IS 'Check if user is admin or owner for a tenant';
COMMENT ON FUNCTION has_read_access IS 'Check if user has read access (admin, owner, or admin_readonly)';
COMMENT ON FUNCTION has_write_access IS 'Check if user has write access (not read-only)';
COMMENT ON FUNCTION has_billing_access IS 'Check if user has billing access';
COMMENT ON FUNCTION can_write_billing IS 'Check if user can write billing data';
