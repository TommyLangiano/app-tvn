-- Create enum types for commesse
CREATE TYPE tipologia_cliente AS ENUM ('Privato', 'Pubblico');
CREATE TYPE tipologia_commessa AS ENUM ('Appalto', 'ATI', 'Sub Appalto', 'Sub Affidamento');

-- Create commesse table
CREATE TABLE commesse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Required fields
  tipologia_cliente tipologia_cliente NOT NULL,
  tipologia_commessa tipologia_commessa NOT NULL,
  nome_commessa TEXT NOT NULL,
  cliente_commessa TEXT NOT NULL,

  -- Optional fields
  codice_commessa TEXT,
  importo_commessa DECIMAL(15, 2),
  citta TEXT,
  provincia TEXT,
  via TEXT,
  numero_civico TEXT,
  data_inizio DATE,
  data_fine_prevista DATE,
  descrizione TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_commesse_tenant_id ON commesse(tenant_id);
CREATE INDEX idx_commesse_created_by ON commesse(created_by);
CREATE INDEX idx_commesse_cliente ON commesse(cliente_commessa);
CREATE INDEX idx_commesse_nome ON commesse(nome_commessa);

-- Enable Row Level Security
ALTER TABLE commesse ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view commesse in their tenant"
  ON commesse FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert commesse in their tenant"
  ON commesse FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update commesse in their tenant"
  ON commesse FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete commesse in their tenant"
  ON commesse FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_commesse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_commesse_updated_at
  BEFORE UPDATE ON commesse
  FOR EACH ROW
  EXECUTE FUNCTION update_commesse_updated_at();
