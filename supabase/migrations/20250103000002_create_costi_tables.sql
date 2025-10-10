-- Create fatture_passive table (costi - fattura)
CREATE TABLE fatture_passive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dati fattura
  numero_fattura TEXT NOT NULL,
  fornitore TEXT NOT NULL,
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
  banca_emissione TEXT,
  numero_conto TEXT,
  stato_pagamento TEXT NOT NULL CHECK (stato_pagamento IN ('Pagato', 'Non Pagato')),

  -- Allegato
  allegato_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Constraint: numero fattura univoco per tenant
  CONSTRAINT unique_numero_fattura_passiva_per_tenant UNIQUE (tenant_id, numero_fattura)
);

-- Create scontrini table (costi - scontrino)
CREATE TABLE scontrini (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dati scontrino
  fornitore TEXT NOT NULL,
  tipologia TEXT NOT NULL,
  data_emissione DATE NOT NULL,

  -- Importo
  importo_totale DECIMAL(15,2) NOT NULL CHECK (importo_totale >= 0),

  -- Pagamento (sempre pagato per scontrini)
  modalita_pagamento TEXT,
  stato_pagamento TEXT NOT NULL DEFAULT 'Pagato' CHECK (stato_pagamento = 'Pagato'),

  -- Allegato
  allegato_url TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_fatture_passive_commessa ON fatture_passive(commessa_id);
CREATE INDEX idx_fatture_passive_tenant ON fatture_passive(tenant_id);
CREATE INDEX idx_fatture_passive_data_emissione ON fatture_passive(data_emissione);
CREATE INDEX idx_fatture_passive_stato ON fatture_passive(stato_pagamento);

CREATE INDEX idx_scontrini_commessa ON scontrini(commessa_id);
CREATE INDEX idx_scontrini_tenant ON scontrini(tenant_id);
CREATE INDEX idx_scontrini_data_emissione ON scontrini(data_emissione);

-- Enable RLS
ALTER TABLE fatture_passive ENABLE ROW LEVEL SECURITY;
ALTER TABLE scontrini ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fatture_passive
CREATE POLICY "Users can view fatture_passive in their tenant"
  ON fatture_passive FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert fatture_passive in their tenant"
  ON fatture_passive FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update fatture_passive in their tenant"
  ON fatture_passive FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete fatture_passive in their tenant"
  ON fatture_passive FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- RLS Policies for scontrini
CREATE POLICY "Users can view scontrini in their tenant"
  ON scontrini FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert scontrini in their tenant"
  ON scontrini FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update scontrini in their tenant"
  ON scontrini FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete scontrini in their tenant"
  ON scontrini FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  ));

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_fatture_passive_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_scontrini_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_fatture_passive_updated_at
  BEFORE UPDATE ON fatture_passive
  FOR EACH ROW
  EXECUTE FUNCTION update_fatture_passive_updated_at();

CREATE TRIGGER trigger_scontrini_updated_at
  BEFORE UPDATE ON scontrini
  FOR EACH ROW
  EXECUTE FUNCTION update_scontrini_updated_at();

-- Update riepilogo_economico_commessa view to include costi
DROP VIEW IF EXISTS riepilogo_economico_commessa;

CREATE VIEW riepilogo_economico_commessa AS
WITH ricavi AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as ricavi_imponibile,
    COALESCE(SUM(importo_iva), 0) as ricavi_iva,
    COALESCE(SUM(importo_totale), 0) as ricavi_totali,
    COUNT(*) as numero_ricavi
  FROM fatture_attive
  GROUP BY commessa_id
),
costi_fatture AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as costi_imponibile,
    COALESCE(SUM(importo_iva), 0) as costi_iva,
    COALESCE(SUM(importo_totale), 0) as costi_totali,
    COUNT(*) as numero_fatture_passive
  FROM fatture_passive
  GROUP BY commessa_id
),
costi_scontrini AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_totale), 0) as scontrini_totali,
    COUNT(*) as numero_scontrini
  FROM scontrini
  GROUP BY commessa_id
),
all_commesse AS (
  SELECT DISTINCT commessa_id FROM fatture_attive
  UNION
  SELECT DISTINCT commessa_id FROM fatture_passive
  UNION
  SELECT DISTINCT commessa_id FROM scontrini
)
SELECT
  ac.commessa_id,
  -- Ricavi
  COALESCE(r.ricavi_imponibile, 0) as ricavi_imponibile,
  COALESCE(r.ricavi_iva, 0) as ricavi_iva,
  COALESCE(r.ricavi_totali, 0) as ricavi_totali,
  -- Costi (fatture passive hanno imponibile e IVA, scontrini solo totale)
  COALESCE(cf.costi_imponibile, 0) as costi_imponibile,
  COALESCE(cf.costi_iva, 0) as costi_iva,
  COALESCE(cf.costi_totali, 0) + COALESCE(cs.scontrini_totali, 0) as costi_totali,
  -- Margini calcolati
  COALESCE(r.ricavi_imponibile, 0) - COALESCE(cf.costi_imponibile, 0) as margine_lordo,
  COALESCE(r.ricavi_iva, 0) - COALESCE(cf.costi_iva, 0) as saldo_iva,
  -- Conteggi
  COALESCE(r.ricavi_totali, 0) + COALESCE(cf.costi_totali, 0) + COALESCE(cs.scontrini_totali, 0) as totale_movimenti,
  COALESCE(r.numero_ricavi, 0) as numero_ricavi,
  COALESCE(cf.numero_fatture_passive, 0) + COALESCE(cs.numero_scontrini, 0) as numero_costi
FROM all_commesse ac
LEFT JOIN ricavi r ON ac.commessa_id = r.commessa_id
LEFT JOIN costi_fatture cf ON ac.commessa_id = cf.commessa_id
LEFT JOIN costi_scontrini cs ON ac.commessa_id = cs.commessa_id;

-- Grant permissions
GRANT SELECT ON riepilogo_economico_commessa TO authenticated;
