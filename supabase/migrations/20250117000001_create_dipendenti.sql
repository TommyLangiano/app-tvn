-- ============================================================================
-- DIPENDENTI TABLE
-- ============================================================================
-- Tabella per gestire i dipendenti con dati HR e professionali
-- Link opzionale a auth.users per permettere login

CREATE TABLE IF NOT EXISTS dipendenti (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Link opzionale a utente (se il dipendente ha accesso all'app)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ============================================================================
  -- DATI ANAGRAFICI
  -- ============================================================================
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  codice_fiscale TEXT,
  data_nascita DATE,
  luogo_nascita TEXT,

  -- Contatti
  telefono TEXT,
  email TEXT,
  pec TEXT,

  -- Indirizzo Residenza
  residenza_via TEXT,
  residenza_civico TEXT,
  residenza_cap TEXT,
  residenza_citta TEXT,
  residenza_provincia TEXT,
  residenza_nazione TEXT DEFAULT 'Italia',

  -- Indirizzo Domicilio (se diverso)
  domicilio_diverso BOOLEAN DEFAULT false,
  domicilio_via TEXT,
  domicilio_civico TEXT,
  domicilio_cap TEXT,
  domicilio_citta TEXT,
  domicilio_provincia TEXT,
  domicilio_nazione TEXT,

  -- ============================================================================
  -- DATI PROFESSIONALI
  -- ============================================================================
  matricola TEXT, -- Numero matricola aziendale
  qualifica TEXT, -- Operaio, Impiegato, Quadro, Dirigente
  mansione TEXT, -- Muratore, Elettricista, Idraulico, etc.
  livello TEXT, -- Livello contrattuale (es. 3°, 4°, 5°)
  ccnl TEXT, -- CCNL applicato (es. Edilizia, Metalmeccanico)

  -- Date contrattuali
  data_assunzione DATE,
  data_fine_contratto DATE, -- NULL se indeterminato
  tipo_contratto TEXT, -- Indeterminato, Determinato, Apprendistato, Collaborazione, etc.

  -- Orario
  ore_settimanali DECIMAL(5,2) DEFAULT 40,
  part_time BOOLEAN DEFAULT false,
  percentuale_part_time INTEGER, -- es. 50 per 50%

  -- ============================================================================
  -- DATI RETRIBUTIVI
  -- ============================================================================
  retribuzione_lorda_mensile DECIMAL(10,2),
  retribuzione_lorda_annua DECIMAL(10,2),
  superminimo DECIMAL(10,2),

  -- Dati bancari
  iban TEXT,
  intestatario_iban TEXT,

  -- ============================================================================
  -- DOCUMENTI E CERTIFICAZIONI
  -- ============================================================================
  documenti_caricati JSONB DEFAULT '[]'::jsonb, -- Array di {tipo, nome, url, data_caricamento}
  scadenze JSONB DEFAULT '[]'::jsonb, -- Array di {tipo, descrizione, data_scadenza}

  -- Patenti e abilitazioni
  patente_guida TEXT[], -- [B, C, CE, etc.]
  patentini TEXT[], -- [Muletto, Gru, Piattaforma, etc.]

  -- ============================================================================
  -- GESTIONE PRESENZE
  -- ============================================================================
  badge_numero TEXT UNIQUE,
  turno_default TEXT, -- Mattina, Pomeriggio, Notte, etc.

  -- ============================================================================
  -- STATO E GESTIONE
  -- ============================================================================
  stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'sospeso', 'licenziato', 'pensionato')),
  note_interne TEXT, -- Note visibili solo agli admin

  -- ============================================================================
  -- TIMESTAMPS
  -- ============================================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ============================================================================
  -- CONSTRAINTS
  -- ============================================================================
  UNIQUE(tenant_id, codice_fiscale),
  UNIQUE(tenant_id, matricola),
  UNIQUE(tenant_id, badge_numero)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dipendenti_tenant_id ON dipendenti(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dipendenti_user_id ON dipendenti(user_id);
CREATE INDEX IF NOT EXISTS idx_dipendenti_codice_fiscale ON dipendenti(codice_fiscale);
CREATE INDEX IF NOT EXISTS idx_dipendenti_stato ON dipendenti(stato);
CREATE INDEX IF NOT EXISTS idx_dipendenti_cognome ON dipendenti(cognome);
CREATE INDEX IF NOT EXISTS idx_dipendenti_data_assunzione ON dipendenti(data_assunzione);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dipendenti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dipendenti_updated_at
  BEFORE UPDATE ON dipendenti
  FOR EACH ROW
  EXECUTE FUNCTION update_dipendenti_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE dipendenti ENABLE ROW LEVEL SECURITY;

-- Tutti gli utenti del tenant possono visualizzare i dipendenti
CREATE POLICY "Users can view tenant dipendenti"
  ON dipendenti FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Solo admin e owner possono inserire dipendenti
CREATE POLICY "Admins can insert dipendenti"
  ON dipendenti FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND tenant_id = dipendenti.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- Solo admin e owner possono modificare dipendenti
CREATE POLICY "Admins can update dipendenti"
  ON dipendenti FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND tenant_id = dipendenti.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- Solo admin e owner possono eliminare dipendenti
CREATE POLICY "Admins can delete dipendenti"
  ON dipendenti FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE user_id = auth.uid()
      AND tenant_id = dipendenti.tenant_id
      AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Funzione per ottenere il nome completo di un dipendente
CREATE OR REPLACE FUNCTION get_dipendente_nome_completo(dipendente_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  nome_completo TEXT;
BEGIN
  SELECT CONCAT(cognome, ' ', nome) INTO nome_completo
  FROM dipendenti
  WHERE id = dipendente_id_param;

  RETURN COALESCE(nome_completo, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Funzione per verificare se un dipendente è attivo
CREATE OR REPLACE FUNCTION is_dipendente_attivo(dipendente_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM dipendenti
    WHERE id = dipendente_id_param
    AND stato = 'attivo'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE dipendenti IS 'Anagrafica dipendenti con dati HR e professionali';
COMMENT ON COLUMN dipendenti.user_id IS 'Link opzionale a auth.users se il dipendente ha accesso all''app';
COMMENT ON COLUMN dipendenti.matricola IS 'Numero matricola aziendale univoco';
COMMENT ON COLUMN dipendenti.qualifica IS 'Qualifica contrattuale (Operaio, Impiegato, Quadro, Dirigente)';
COMMENT ON COLUMN dipendenti.mansione IS 'Mansione specifica (es. Muratore, Elettricista, etc.)';
COMMENT ON COLUMN dipendenti.ccnl IS 'Contratto Collettivo Nazionale di Lavoro applicato';
COMMENT ON COLUMN dipendenti.badge_numero IS 'Numero badge per timbrature';
COMMENT ON COLUMN dipendenti.documenti_caricati IS 'Array JSON di documenti caricati';
COMMENT ON COLUMN dipendenti.scadenze IS 'Array JSON di scadenze da monitorare';
