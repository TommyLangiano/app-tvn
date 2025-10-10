-- Drop old movimenti_commessa table and view
DROP VIEW IF EXISTS riepilogo_economico_commessa;
DROP TABLE IF EXISTS movimenti_commessa;

-- Create fatture_attive table (ricavi)
CREATE TABLE fatture_attive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dati fattura
  numero_fattura TEXT NOT NULL,
  cliente TEXT NOT NULL,
  tipologia TEXT NOT NULL,
  data_emissione DATE NOT NULL,
  data_pagamento DATE,

  -- Importi
  importo_imponibile DECIMAL(15,2) NOT NULL CHECK (importo_imponibile >= 0),
  aliquota_iva DECIMAL(5,2) NOT NULL CHECK (aliquota_iva >= 0),
  importo_iva DECIMAL(15,2) NOT NULL CHECK (importo_iva >= 0),
  importo_totale DECIMAL(15,2) GENERATED ALWAYS AS (importo_imponibile + importo_iva) STORED,

  -- Pagamento
  modalita_pagamento TEXT,
  stato_pagamento TEXT NOT NULL CHECK (stato_pagamento IN ('Pagato', 'Non Pagato')),

  -- Allegato
  allegato_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Constraint: numero fattura univoco per tenant
  CONSTRAINT unique_numero_fattura_per_tenant UNIQUE (tenant_id, numero_fattura)
);

-- Create index for performance
CREATE INDEX idx_fatture_attive_commessa ON fatture_attive(commessa_id);
CREATE INDEX idx_fatture_attive_tenant ON fatture_attive(tenant_id);
CREATE INDEX idx_fatture_attive_data_emissione ON fatture_attive(data_emissione);
CREATE INDEX idx_fatture_attive_stato ON fatture_attive(stato_pagamento);

-- Enable RLS
ALTER TABLE fatture_attive ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view fatture_attive in their tenant"
  ON fatture_attive
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert fatture_attive in their tenant"
  ON fatture_attive
  FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update fatture_attive in their tenant"
  ON fatture_attive
  FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete fatture_attive in their tenant"
  ON fatture_attive
  FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_fatture_attive_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fatture_attive_updated_at
  BEFORE UPDATE ON fatture_attive
  FOR EACH ROW
  EXECUTE FUNCTION update_fatture_attive_updated_at();

-- Create view for riepilogo economico commessa
CREATE VIEW riepilogo_economico_commessa AS
SELECT
  commessa_id,
  -- Ricavi (fatture attive)
  COALESCE(SUM(importo_imponibile), 0) as ricavi_imponibile,
  COALESCE(SUM(importo_iva), 0) as ricavi_iva,
  COALESCE(SUM(importo_totale), 0) as ricavi_totali,
  -- Costi (placeholder - sarà aggiornato dopo)
  0::DECIMAL(15,2) as costi_imponibile,
  0::DECIMAL(15,2) as costi_iva,
  0::DECIMAL(15,2) as costi_totali,
  -- Margini calcolati
  COALESCE(SUM(importo_imponibile), 0) as margine_lordo,
  COALESCE(SUM(importo_iva), 0) as saldo_iva,
  -- Conteggi
  COALESCE(SUM(importo_totale), 0) as totale_movimenti,
  COUNT(*) as numero_ricavi,
  0::BIGINT as numero_costi
FROM fatture_attive
GROUP BY commessa_id;

-- Grant permissions
GRANT SELECT ON riepilogo_economico_commessa TO authenticated;
