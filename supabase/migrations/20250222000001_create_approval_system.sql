-- ============================================================================
-- Migration: Create Commessa-Level Approval System
-- Date: 2025-02-22
-- Description:
--   - Creates flexible approval configuration system per commessa
--   - Supports multiple approval types (presenze, note_spesa)
--   - Creates note_spesa table to match rapportini structure
--   - Adds approval tracking with configurable approvers
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE NOTE_SPESA TABLE
-- ============================================================================

-- Create note_spesa table (matching rapportini structure)
CREATE TABLE IF NOT EXISTS note_spesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  dipendente_id UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,

  -- Core expense data
  data_nota DATE NOT NULL,
  importo NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  categoria TEXT NOT NULL, -- e.g., 'Trasporto', 'Vitto', 'Alloggio', 'Materiali', 'Altro'
  descrizione TEXT,
  allegato_url TEXT, -- Receipt/invoice attachment

  -- Approval workflow (matches rapportini)
  stato TEXT DEFAULT 'approvato' CHECK (stato IN ('approvato', 'da_approvare', 'rifiutato')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- One expense note per employee per day per commessa (same pattern as rapportini)
  UNIQUE(tenant_id, dipendente_id, commessa_id, data_nota)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_spesa_tenant ON note_spesa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_note_spesa_commessa ON note_spesa(commessa_id);
CREATE INDEX IF NOT EXISTS idx_note_spesa_dipendente ON note_spesa(dipendente_id);
CREATE INDEX IF NOT EXISTS idx_note_spesa_data ON note_spesa(data_nota);
CREATE INDEX IF NOT EXISTS idx_note_spesa_stato ON note_spesa(stato);
CREATE INDEX IF NOT EXISTS idx_note_spesa_tenant_data ON note_spesa(tenant_id, data_nota);

-- Enable RLS
ALTER TABLE note_spesa ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_spesa
CREATE POLICY "Users can view note_spesa from their tenant"
  ON note_spesa
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create note_spesa for their tenant"
  ON note_spesa
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update note_spesa"
  ON note_spesa
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete note_spesa"
  ON note_spesa
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_note_spesa_updated_at
  BEFORE UPDATE ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE note_spesa IS 'Expense notes (note spesa) per commessa with approval workflow';
COMMENT ON COLUMN note_spesa.stato IS 'Approval status: approvato (approved), da_approvare (pending), rifiutato (rejected)';
COMMENT ON COLUMN note_spesa.categoria IS 'Expense category: Trasporto, Vitto, Alloggio, Materiali, Altro';

-- ============================================================================
-- PART 2: CREATE APPROVAL CONFIGURATION TABLE
-- ============================================================================

-- Create approval settings table (per commessa, per type)
CREATE TABLE IF NOT EXISTS commesse_impostazioni_approvazione (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commessa_id UUID NOT NULL REFERENCES commesse(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Approval type: 'presenze' or 'note_spesa' (extensible for future types)
  tipo_approvazione TEXT NOT NULL CHECK (tipo_approvazione IN ('presenze', 'note_spesa')),

  -- Enable/disable approval requirement
  abilitato BOOLEAN DEFAULT false,

  -- Array of approver dipendente_ids (supports multiple approvers)
  -- Any approver in the list can approve the request
  approvatori UUID[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Ensure one config per commessa per approval type
  UNIQUE(commessa_id, tipo_approvazione)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_approvazione_commessa ON commesse_impostazioni_approvazione(commessa_id);
CREATE INDEX IF NOT EXISTS idx_approvazione_tenant ON commesse_impostazioni_approvazione(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvazione_tipo ON commesse_impostazioni_approvazione(tipo_approvazione);
CREATE INDEX IF NOT EXISTS idx_approvazione_abilitato ON commesse_impostazioni_approvazione(abilitato);
-- GIN index for array column to efficiently query approvers
CREATE INDEX IF NOT EXISTS idx_approvazione_approvatori ON commesse_impostazioni_approvazione USING GIN(approvatori);

-- Enable RLS
ALTER TABLE commesse_impostazioni_approvazione ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approval settings from their tenant"
  ON commesse_impostazioni_approvazione
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create approval settings for their tenant"
  ON commesse_impostazioni_approvazione
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can update approval settings in their tenant"
  ON commesse_impostazioni_approvazione
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete approval settings in their tenant"
  ON commesse_impostazioni_approvazione
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_approvazione_updated_at
  BEFORE UPDATE ON commesse_impostazioni_approvazione
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE commesse_impostazioni_approvazione IS 'Approval workflow configuration per commessa (supports presenze and note_spesa)';
COMMENT ON COLUMN commesse_impostazioni_approvazione.tipo_approvazione IS 'Type of approval: presenze (timesheets) or note_spesa (expense notes)';
COMMENT ON COLUMN commesse_impostazioni_approvazione.abilitato IS 'When true, items require approval before being accepted';
COMMENT ON COLUMN commesse_impostazioni_approvazione.approvatori IS 'Array of dipendente UUIDs who can approve (any approver can approve)';

-- ============================================================================
-- PART 3: CREATE HELPER FUNCTION TO CHECK APPROVAL REQUIREMENTS
-- ============================================================================

-- Function to check if approval is required for a commessa
CREATE OR REPLACE FUNCTION richiede_approvazione(
  p_commessa_id UUID,
  p_tipo_approvazione TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_abilitato BOOLEAN;
BEGIN
  -- Check if approval is enabled for this commessa and type
  SELECT abilitato INTO v_abilitato
  FROM commesse_impostazioni_approvazione
  WHERE commessa_id = p_commessa_id
    AND tipo_approvazione = p_tipo_approvazione;

  -- If no config found, approval is not required (defaults to false)
  RETURN COALESCE(v_abilitato, false);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION richiede_approvazione IS 'Check if approval is required for a specific commessa and approval type';

-- ============================================================================
-- PART 4: CREATE VIEW FOR EASY APPROVAL STATUS QUERIES
-- ============================================================================

-- View to see all approval configurations with commessa details
CREATE OR REPLACE VIEW v_commesse_approvazioni
WITH (security_invoker = true) AS
SELECT
  cia.id,
  cia.commessa_id,
  cia.tenant_id,
  cia.tipo_approvazione,
  cia.abilitato,
  cia.approvatori,
  cia.created_at,
  cia.updated_at,
  -- Commessa details
  c.nome_commessa,
  c.codice_commessa,
  c.cliente_commessa,
  -- Count of approvers
  COALESCE(array_length(cia.approvatori, 1), 0) as numero_approvatori
FROM commesse_impostazioni_approvazione cia
JOIN commesse c ON c.id = cia.commessa_id;

COMMENT ON VIEW v_commesse_approvazioni IS 'View combining approval settings with commessa details for easy querying';

-- ============================================================================
-- PART 5: SAMPLE DATA MIGRATION (OPTIONAL)
-- ============================================================================

-- If you want to initialize approval settings for existing commesse, uncomment below:
-- INSERT INTO commesse_impostazioni_approvazione (commessa_id, tenant_id, tipo_approvazione, abilitato, created_by)
-- SELECT
--   c.id as commessa_id,
--   c.tenant_id,
--   'presenze' as tipo_approvazione,
--   false as abilitato,
--   c.created_by
-- FROM commesse c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM commesse_impostazioni_approvazione
--   WHERE commessa_id = c.id AND tipo_approvazione = 'presenze'
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
