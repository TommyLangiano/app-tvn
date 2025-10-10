-- Create clienti table
CREATE TABLE IF NOT EXISTS clienti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dati Generali
  forma_giuridica TEXT NOT NULL CHECK (forma_giuridica IN ('persona_fisica', 'persona_giuridica')),
  tipologia_settore TEXT NOT NULL,

  -- Persona Fisica
  nome TEXT,
  cognome TEXT,

  -- Persona Giuridica
  ragione_sociale TEXT,
  forma_giuridica_dettaglio TEXT,

  -- Identificativi Fiscali
  codice_fiscale TEXT,
  partita_iva TEXT,
  ateco TEXT,
  rea TEXT,

  -- Contatti
  telefono TEXT,
  fax TEXT,
  pec TEXT,
  email TEXT,
  website TEXT,

  -- Sede Legale / Residenza
  sede_legale_via TEXT,
  sede_legale_civico TEXT,
  sede_legale_cap TEXT,
  sede_legale_citta TEXT,
  sede_legale_provincia TEXT,
  sede_legale_nazione TEXT DEFAULT 'Italia',

  -- Sede Operativa
  sede_operativa_diversa BOOLEAN DEFAULT false,
  sede_operativa_via TEXT,
  sede_operativa_civico TEXT,
  sede_operativa_cap TEXT,
  sede_operativa_citta TEXT,
  sede_operativa_provincia TEXT,
  sede_operativa_nazione TEXT,

  -- Dati Amministrativi
  modalita_pagamento_preferita TEXT,
  iban TEXT,
  aliquota_iva_predefinita NUMERIC(5,2),
  codice_sdi TEXT,

  -- Note
  note TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_clienti_tenant_id ON clienti(tenant_id);

-- Create index on forma_giuridica for filtering
CREATE INDEX IF NOT EXISTS idx_clienti_forma_giuridica ON clienti(forma_giuridica);

-- Create index for alphabetical sorting
CREATE INDEX IF NOT EXISTS idx_clienti_cognome ON clienti(cognome);
CREATE INDEX IF NOT EXISTS idx_clienti_ragione_sociale ON clienti(ragione_sociale);

-- Enable RLS
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant isolation
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

-- Create trigger to update updated_at
DROP TRIGGER IF EXISTS update_clienti_updated_at ON clienti;
CREATE TRIGGER update_clienti_updated_at
  BEFORE UPDATE ON clienti
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
