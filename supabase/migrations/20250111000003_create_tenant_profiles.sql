-- Create tenant_profiles table for company/organization data
CREATE TABLE IF NOT EXISTS tenant_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dati aziendali principali
  ragione_sociale TEXT,
  partita_iva TEXT,
  codice_fiscale TEXT,
  forma_giuridica TEXT CHECK (forma_giuridica IN ('SRL', 'SPA', 'SRLS', 'SNC', 'SAS', 'Ditta Individuale', 'Altro')),

  -- Contatti
  pec TEXT,
  email TEXT,
  telefono TEXT,
  fax TEXT,
  website TEXT,

  -- Sede legale
  sede_legale_via TEXT,
  sede_legale_civico TEXT,
  sede_legale_cap TEXT,
  sede_legale_citta TEXT,
  sede_legale_provincia TEXT,
  sede_legale_nazione TEXT DEFAULT 'Italia',

  -- Dati fiscali/amministrativi
  iban TEXT,
  codice_sdi TEXT,
  rea TEXT,
  ateco TEXT,

  -- Branding
  logo_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant profile"
  ON tenant_profiles FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their tenant profile"
  ON tenant_profiles FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert their tenant profile"
  ON tenant_profiles FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_tenant_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER tenant_profiles_updated_at
  BEFORE UPDATE ON tenant_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_profiles_updated_at();

-- Create index
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_tenant ON tenant_profiles(tenant_id);
