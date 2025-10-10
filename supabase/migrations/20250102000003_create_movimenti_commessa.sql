-- Create table for economic movements (ricavi e costi)
CREATE TABLE movimenti_commessa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Tipo movimento
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ricavo', 'costo')),

  -- Dati economici
  descrizione TEXT NOT NULL,
  importo_imponibile DECIMAL(15,2) NOT NULL CHECK (importo_imponibile >= 0),
  aliquota_iva DECIMAL(5,2) NOT NULL CHECK (aliquota_iva >= 0 AND aliquota_iva <= 100),
  importo_iva DECIMAL(15,2) NOT NULL CHECK (importo_iva >= 0),
  importo_totale DECIMAL(15,2) GENERATED ALWAYS AS (importo_imponibile + importo_iva) STORED,

  -- Metadati
  data_movimento DATE NOT NULL,
  categoria TEXT,
  note TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_movimenti_commessa_id ON movimenti_commessa(commessa_id);
CREATE INDEX idx_movimenti_tenant_id ON movimenti_commessa(tenant_id);
CREATE INDEX idx_movimenti_tipo ON movimenti_commessa(tipo);
CREATE INDEX idx_movimenti_data ON movimenti_commessa(data_movimento DESC);

-- Enable RLS
ALTER TABLE movimenti_commessa ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view movimenti of their tenant"
  ON movimenti_commessa FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert movimenti for their tenant"
  ON movimenti_commessa FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update movimenti of their tenant"
  ON movimenti_commessa FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete movimenti of their tenant"
  ON movimenti_commessa FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Create view for economic summary per commessa
CREATE VIEW riepilogo_economico_commessa AS
SELECT
  commessa_id,

  -- Ricavi
  COALESCE(SUM(CASE WHEN tipo = 'ricavo' THEN importo_imponibile ELSE 0 END), 0) as ricavi_imponibile,
  COALESCE(SUM(CASE WHEN tipo = 'ricavo' THEN importo_iva ELSE 0 END), 0) as ricavi_iva,
  COALESCE(SUM(CASE WHEN tipo = 'ricavo' THEN importo_totale ELSE 0 END), 0) as ricavi_totali,

  -- Costi
  COALESCE(SUM(CASE WHEN tipo = 'costo' THEN importo_imponibile ELSE 0 END), 0) as costi_imponibile,
  COALESCE(SUM(CASE WHEN tipo = 'costo' THEN importo_iva ELSE 0 END), 0) as costi_iva,
  COALESCE(SUM(CASE WHEN tipo = 'costo' THEN importo_totale ELSE 0 END), 0) as costi_totali,

  -- Margini calcolati
  COALESCE(SUM(CASE WHEN tipo = 'ricavo' THEN importo_imponibile ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo = 'costo' THEN importo_imponibile ELSE 0 END), 0) as margine_lordo,

  COALESCE(SUM(CASE WHEN tipo = 'ricavo' THEN importo_iva ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN tipo = 'costo' THEN importo_iva ELSE 0 END), 0) as saldo_iva,

  -- Conteggio movimenti
  COUNT(*) as totale_movimenti,
  COUNT(CASE WHEN tipo = 'ricavo' THEN 1 END) as numero_ricavi,
  COUNT(CASE WHEN tipo = 'costo' THEN 1 END) as numero_costi

FROM movimenti_commessa
GROUP BY commessa_id;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_movimenti_commessa_updated_at
  BEFORE UPDATE ON movimenti_commessa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
