-- Create settori_personalizzati table
CREATE TABLE IF NOT EXISTS settori_personalizzati (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('clienti', 'fornitori', 'entrambi')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate settore names per tenant and type
  CONSTRAINT unique_settore_per_tenant UNIQUE (tenant_id, nome, tipo)
);

-- Create index on tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_settori_personalizzati_tenant_id ON settori_personalizzati(tenant_id);

-- Create index on tipo for filtering
CREATE INDEX IF NOT EXISTS idx_settori_personalizzati_tipo ON settori_personalizzati(tipo);

-- Enable RLS
ALTER TABLE settori_personalizzati ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
CREATE POLICY "Users can view settori in their tenant"
  ON settori_personalizzati FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert settori in their tenant"
  ON settori_personalizzati FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update settori in their tenant"
  ON settori_personalizzati FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete settori in their tenant"
  ON settori_personalizzati FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );
