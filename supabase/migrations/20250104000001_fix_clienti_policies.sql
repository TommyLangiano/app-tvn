-- Drop all existing policies
DROP POLICY IF EXISTS "Users can only access their tenant's clienti" ON clienti;
DROP POLICY IF EXISTS "Users can view clienti in their tenant" ON clienti;
DROP POLICY IF EXISTS "Users can insert clienti in their tenant" ON clienti;
DROP POLICY IF EXISTS "Users can update clienti in their tenant" ON clienti;
DROP POLICY IF EXISTS "Users can delete clienti in their tenant" ON clienti;

-- Create new policies for tenant isolation
CREATE POLICY "Users can view clienti in their tenant"
  ON clienti FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clienti in their tenant"
  ON clienti FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clienti in their tenant"
  ON clienti FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clienti in their tenant"
  ON clienti FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );
