-- Create rapportini table
CREATE TABLE IF NOT EXISTS rapportini (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  data_rapportino DATE NOT NULL,
  ore_lavorate DECIMAL(5,2) NOT NULL CHECK (ore_lavorate > 0 AND ore_lavorate <= 24),
  note TEXT,
  allegato_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Unique constraint: one rapportino per user per day per commessa
  UNIQUE(tenant_id, user_id, commessa_id, data_rapportino)
);

-- Create index for faster queries
CREATE INDEX idx_rapportini_tenant ON rapportini(tenant_id);
CREATE INDEX idx_rapportini_user ON rapportini(user_id);
CREATE INDEX idx_rapportini_commessa ON rapportini(commessa_id);
CREATE INDEX idx_rapportini_data ON rapportini(data_rapportino);
CREATE INDEX idx_rapportini_tenant_data ON rapportini(tenant_id, data_rapportino);

-- Enable RLS
ALTER TABLE rapportini ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see rapportini from their tenant
CREATE POLICY "Users can view rapportini from their tenant"
  ON rapportini
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Users can insert rapportini for their tenant
CREATE POLICY "Users can create rapportini for their tenant"
  ON rapportini
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Users can update their own rapportini or admins can update any
CREATE POLICY "Users can update rapportini"
  ON rapportini
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_tenants
        WHERE user_id = auth.uid()
        AND tenant_id = rapportini.tenant_id
        AND role = 'admin'
      )
    )
  );

-- Users can delete their own rapportini or admins can delete any
CREATE POLICY "Users can delete rapportini"
  ON rapportini
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_tenants
        WHERE user_id = auth.uid()
        AND tenant_id = rapportini.tenant_id
        AND role = 'admin'
      )
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_rapportini_updated_at
  BEFORE UPDATE ON rapportini
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
