-- ============================================================================
-- Migration: Enhanced Note Spesa System
-- Date: 2025-02-23
-- Description:
--   Complete expense report system with:
--   - Enhanced note_spesa table (multi-attachments, audit fields)
--   - Audit trail table for tracking all actions
--   - Customizable expense categories per tenant
--   - Automated workflow triggers
--   - Integration with economic summary
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE NOTE_SPESA TABLE
-- ============================================================================

-- 1. Remove overly restrictive UNIQUE constraint (allow multiple expenses per day)
ALTER TABLE note_spesa
DROP CONSTRAINT IF EXISTS note_spesa_tenant_id_dipendente_id_commessa_id_data_nota_key;

-- 2. Enhance stato CHECK constraint to include 'bozza'
ALTER TABLE note_spesa
DROP CONSTRAINT IF EXISTS note_spesa_stato_check;

ALTER TABLE note_spesa
ADD CONSTRAINT note_spesa_stato_check
CHECK (stato IN ('bozza', 'da_approvare', 'approvato', 'rifiutato'));

-- 3. Add multi-attachment support (JSONB array)
ALTER TABLE note_spesa
ADD COLUMN IF NOT EXISTS allegati JSONB DEFAULT '[]'::jsonb;

-- Migrate existing allegato_url to allegati array
UPDATE note_spesa
SET allegati = jsonb_build_array(
  jsonb_build_object(
    'url', allegato_url,
    'tipo', 'scontrino',
    'nome', 'allegato',
    'uploaded_at', created_at
  )
)
WHERE allegato_url IS NOT NULL AND allegati = '[]'::jsonb;

-- 4. Add audit fields
ALTER TABLE note_spesa
ADD COLUMN IF NOT EXISTS approvato_da UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approvato_il TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rifiutato_da UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rifiutato_il TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS motivo_rifiuto TEXT,
ADD COLUMN IF NOT EXISTS numero_nota TEXT;

-- 5. Add enhanced indexes
CREATE INDEX IF NOT EXISTS idx_note_spesa_allegati ON note_spesa USING GIN(allegati);
CREATE INDEX IF NOT EXISTS idx_note_spesa_approvato_da ON note_spesa(approvato_da);
CREATE INDEX IF NOT EXISTS idx_note_spesa_numero_nota ON note_spesa(tenant_id, numero_nota);
CREATE INDEX IF NOT EXISTS idx_note_spesa_tenant_stato ON note_spesa(tenant_id, stato);
CREATE INDEX IF NOT EXISTS idx_note_spesa_commessa_stato ON note_spesa(commessa_id, stato);
CREATE INDEX IF NOT EXISTS idx_note_spesa_dipendente_data ON note_spesa(dipendente_id, data_nota DESC);
CREATE INDEX IF NOT EXISTS idx_note_spesa_pending ON note_spesa(commessa_id, created_at) WHERE stato = 'da_approvare';
CREATE INDEX IF NOT EXISTS idx_note_spesa_descrizione_search ON note_spesa USING GIN(to_tsvector('italian', COALESCE(descrizione, '')));

-- 6. Add business rule constraints
ALTER TABLE note_spesa
DROP CONSTRAINT IF EXISTS note_spesa_importo_positivo,
DROP CONSTRAINT IF EXISTS note_spesa_data_non_futura,
DROP CONSTRAINT IF EXISTS note_spesa_motivo_rifiuto_required,
DROP CONSTRAINT IF EXISTS note_spesa_approvato_coerente,
DROP CONSTRAINT IF EXISTS note_spesa_rifiutato_coerente,
DROP CONSTRAINT IF EXISTS note_spesa_allegati_formato;

ALTER TABLE note_spesa
ADD CONSTRAINT note_spesa_importo_positivo CHECK (importo > 0),
ADD CONSTRAINT note_spesa_data_non_futura CHECK (data_nota <= CURRENT_DATE),
ADD CONSTRAINT note_spesa_motivo_rifiuto_required CHECK (
  (stato = 'rifiutato' AND motivo_rifiuto IS NOT NULL AND trim(motivo_rifiuto) != '')
  OR stato != 'rifiutato'
),
ADD CONSTRAINT note_spesa_approvato_coerente CHECK (
  (stato = 'approvato' AND approvato_da IS NOT NULL AND approvato_il IS NOT NULL)
  OR stato != 'approvato'
),
ADD CONSTRAINT note_spesa_rifiutato_coerente CHECK (
  (stato = 'rifiutato' AND rifiutato_da IS NOT NULL AND rifiutato_il IS NOT NULL)
  OR stato != 'rifiutato'
),
ADD CONSTRAINT note_spesa_allegati_formato CHECK (jsonb_typeof(allegati) = 'array');

-- 7. Update comments
COMMENT ON COLUMN note_spesa.stato IS 'Stati: bozza (incomplete), da_approvare (pending approval), approvato (approved), rifiutato (rejected)';
COMMENT ON COLUMN note_spesa.allegati IS 'JSONB array of attachments: [{url, tipo, nome, size, uploaded_at}]';
COMMENT ON COLUMN note_spesa.motivo_rifiuto IS 'Rejection reason from approver (required if rejected)';
COMMENT ON COLUMN note_spesa.numero_nota IS 'Progressive number per tenant/year (e.g., 2025-0001)';

-- ============================================================================
-- PART 2: CREATE AUDIT TRAIL TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS note_spesa_azioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_spesa_id UUID NOT NULL REFERENCES note_spesa(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Action performed
  azione TEXT NOT NULL CHECK (azione IN (
    'creata', 'modificata', 'sottomessa',
    'approvata', 'rifiutata', 'eliminata'
  )),

  -- Who performed the action
  eseguita_da UUID NOT NULL REFERENCES auth.users(id),
  eseguita_il TIMESTAMPTZ DEFAULT NOW(),

  -- Contextual data
  stato_precedente TEXT,
  stato_nuovo TEXT,
  motivo TEXT,
  dati_modificati JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_azioni_nota_spesa ON note_spesa_azioni(nota_spesa_id);
CREATE INDEX IF NOT EXISTS idx_azioni_tenant ON note_spesa_azioni(tenant_id);
CREATE INDEX IF NOT EXISTS idx_azioni_eseguita_da ON note_spesa_azioni(eseguita_da);
CREATE INDEX IF NOT EXISTS idx_azioni_azione ON note_spesa_azioni(azione);
CREATE INDEX IF NOT EXISTS idx_azioni_eseguita_il ON note_spesa_azioni(eseguita_il DESC);

-- RLS
ALTER TABLE note_spesa_azioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view actions from their tenant"
  ON note_spesa_azioni FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE note_spesa_azioni IS 'Complete audit trail of all actions on expense notes';

-- ============================================================================
-- PART 3: CREATE CUSTOMIZABLE EXPENSE CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS categorie_note_spesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Category details
  nome TEXT NOT NULL,
  codice TEXT NOT NULL,
  descrizione TEXT,
  colore TEXT,
  icona TEXT,

  -- Validation rules
  importo_massimo NUMERIC(10,2),
  richiede_allegato BOOLEAN DEFAULT true,

  -- Status
  attiva BOOLEAN DEFAULT true,
  ordinamento INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  UNIQUE(tenant_id, codice)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categorie_tenant ON categorie_note_spesa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categorie_attive ON categorie_note_spesa(tenant_id, attiva);
CREATE INDEX IF NOT EXISTS idx_categorie_ordinamento ON categorie_note_spesa(tenant_id, ordinamento);

-- RLS
ALTER TABLE categorie_note_spesa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories from their tenant"
  ON categorie_note_spesa FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage categories in their tenant"
  ON categorie_note_spesa FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Trigger
CREATE TRIGGER update_categorie_updated_at
  BEFORE UPDATE ON categorie_note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE categorie_note_spesa IS 'Customizable expense categories per tenant';

-- ============================================================================
-- PART 4: AUTOMATED WORKFLOW TRIGGERS
-- ============================================================================

-- Trigger: Set initial stato based on approval configuration
CREATE OR REPLACE FUNCTION set_nota_spesa_stato_iniziale()
RETURNS TRIGGER AS $$
DECLARE
  v_richiede_approvazione BOOLEAN;
BEGIN
  -- If stato not specified or is 'bozza', determine correct stato
  IF NEW.stato IS NULL OR NEW.stato = 'bozza' THEN
    -- Check if commessa requires approval
    SELECT richiede_approvazione(NEW.commessa_id, 'note_spesa')
    INTO v_richiede_approvazione;

    IF v_richiede_approvazione THEN
      NEW.stato := 'da_approvare';
    ELSE
      NEW.stato := 'approvato';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_nota_spesa_stato_iniziale ON note_spesa;
CREATE TRIGGER trigger_set_nota_spesa_stato_iniziale
  BEFORE INSERT ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION set_nota_spesa_stato_iniziale();

-- Trigger: Generate progressive numero_nota
CREATE OR REPLACE FUNCTION genera_numero_nota_spesa()
RETURNS TRIGGER AS $$
DECLARE
  v_anno INTEGER;
  v_progressivo INTEGER;
BEGIN
  IF NEW.numero_nota IS NULL THEN
    v_anno := EXTRACT(YEAR FROM NEW.data_nota);

    -- Get next progressive number for tenant/year
    SELECT COALESCE(MAX(
      CAST(
        SUBSTRING(numero_nota FROM '\d+$') AS INTEGER
      )
    ), 0) + 1
    INTO v_progressivo
    FROM note_spesa
    WHERE tenant_id = NEW.tenant_id
      AND numero_nota LIKE v_anno || '-%';

    -- Format: 2025-0001, 2025-0002, etc.
    NEW.numero_nota := v_anno || '-' || LPAD(v_progressivo::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_genera_numero_nota_spesa ON note_spesa;
CREATE TRIGGER trigger_genera_numero_nota_spesa
  BEFORE INSERT ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION genera_numero_nota_spesa();

-- Trigger: Automatic audit trail
CREATE OR REPLACE FUNCTION audit_nota_spesa_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO note_spesa_azioni (
      nota_spesa_id, tenant_id, azione,
      eseguita_da, stato_nuovo
    ) VALUES (
      NEW.id, NEW.tenant_id, 'creata',
      auth.uid(), NEW.stato
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- If stato changed
    IF OLD.stato != NEW.stato THEN
      INSERT INTO note_spesa_azioni (
        nota_spesa_id, tenant_id, azione,
        eseguita_da, stato_precedente, stato_nuovo,
        motivo
      ) VALUES (
        NEW.id, NEW.tenant_id,
        CASE
          WHEN NEW.stato = 'approvato' THEN 'approvata'
          WHEN NEW.stato = 'rifiutato' THEN 'rifiutata'
          WHEN NEW.stato = 'da_approvare' THEN 'sottomessa'
          ELSE 'modificata'
        END,
        auth.uid(), OLD.stato, NEW.stato,
        NEW.motivo_rifiuto
      );
    -- If only data modified (no stato change)
    ELSIF OLD.importo != NEW.importo OR OLD.descrizione IS DISTINCT FROM NEW.descrizione THEN
      INSERT INTO note_spesa_azioni (
        nota_spesa_id, tenant_id, azione,
        eseguita_da, stato_nuovo,
        dati_modificati
      ) VALUES (
        NEW.id, NEW.tenant_id, 'modificata',
        auth.uid(), NEW.stato,
        jsonb_build_object(
          'importo_old', OLD.importo,
          'importo_new', NEW.importo,
          'descrizione_old', OLD.descrizione,
          'descrizione_new', NEW.descrizione
        )
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO note_spesa_azioni (
      nota_spesa_id, tenant_id, azione,
      eseguita_da, stato_precedente
    ) VALUES (
      OLD.id, OLD.tenant_id, 'eliminata',
      auth.uid(), OLD.stato
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_nota_spesa ON note_spesa;
CREATE TRIGGER trigger_audit_nota_spesa
  AFTER INSERT OR UPDATE OR DELETE ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION audit_nota_spesa_changes();

-- Trigger: Rate limiting (max 20 expenses per 24h)
CREATE OR REPLACE FUNCTION check_nota_spesa_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM note_spesa
  WHERE dipendente_id = NEW.dipendente_id
    AND tenant_id = NEW.tenant_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 20 expense notes in 24 hours';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_nota_spesa_rate_limit ON note_spesa;
CREATE TRIGGER trigger_nota_spesa_rate_limit
  BEFORE INSERT ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION check_nota_spesa_rate_limit();

-- ============================================================================
-- PART 5: APPROVAL/REJECTION FUNCTIONS
-- ============================================================================

-- Function to approve expense note
CREATE OR REPLACE FUNCTION approva_nota_spesa(
  p_nota_spesa_id UUID,
  p_tenant_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_approvatore_id UUID;
  v_result JSONB;
BEGIN
  -- Get approvatore dipendente_id
  SELECT id INTO v_approvatore_id
  FROM dipendenti
  WHERE user_id = auth.uid() AND tenant_id = p_tenant_id;

  IF v_approvatore_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Approvatore non trovato'
    );
  END IF;

  -- Verify user is authorized approver
  IF NOT EXISTS (
    SELECT 1 FROM note_spesa ns
    JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = ns.commessa_id
    WHERE ns.id = p_nota_spesa_id
      AND ns.tenant_id = p_tenant_id
      AND cia.tipo_approvazione = 'note_spesa'
      AND v_approvatore_id = ANY(cia.approvatori)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non sei autorizzato ad approvare questa nota spesa'
    );
  END IF;

  -- Update expense note
  UPDATE note_spesa
  SET
    stato = 'approvato',
    approvato_da = auth.uid(),
    approvato_il = NOW(),
    updated_at = NOW()
  WHERE id = p_nota_spesa_id
    AND tenant_id = p_tenant_id
    AND stato = 'da_approvare'
  RETURNING jsonb_build_object(
    'id', id,
    'stato', stato,
    'approvato_il', approvato_il
  ) INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nota spesa non trovata o già processata'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject expense note
CREATE OR REPLACE FUNCTION rifiuta_nota_spesa(
  p_nota_spesa_id UUID,
  p_tenant_id UUID,
  p_motivo TEXT
) RETURNS JSONB AS $$
DECLARE
  v_approvatore_id UUID;
  v_result JSONB;
BEGIN
  -- Validate motivo
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Il motivo del rifiuto è obbligatorio'
    );
  END IF;

  -- Get approvatore dipendente_id
  SELECT id INTO v_approvatore_id
  FROM dipendenti
  WHERE user_id = auth.uid() AND tenant_id = p_tenant_id;

  -- Verify authorization
  IF NOT EXISTS (
    SELECT 1 FROM note_spesa ns
    JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = ns.commessa_id
    WHERE ns.id = p_nota_spesa_id
      AND ns.tenant_id = p_tenant_id
      AND cia.tipo_approvazione = 'note_spesa'
      AND v_approvatore_id = ANY(cia.approvatori)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Non sei autorizzato a rifiutare questa nota spesa'
    );
  END IF;

  -- Update expense note
  UPDATE note_spesa
  SET
    stato = 'rifiutato',
    rifiutato_da = auth.uid(),
    rifiutato_il = NOW(),
    motivo_rifiuto = p_motivo,
    updated_at = NOW()
  WHERE id = p_nota_spesa_id
    AND tenant_id = p_tenant_id
    AND stato = 'da_approvare'
  RETURNING jsonb_build_object(
    'id', id,
    'stato', stato,
    'rifiutato_il', rifiutato_il,
    'motivo_rifiuto', motivo_rifiuto
  ) INTO v_result;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nota spesa non trovata o già processata'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approva_nota_spesa IS 'Approve expense note if user is authorized approver';
COMMENT ON FUNCTION rifiuta_nota_spesa IS 'Reject expense note with mandatory reason';

-- ============================================================================
-- PART 6: UPDATE ECONOMIC SUMMARY VIEW
-- ============================================================================

-- Drop and recreate riepilogo_economico_commessa with note_spesa integration
DROP VIEW IF EXISTS public.riepilogo_economico_commessa;

CREATE VIEW public.riepilogo_economico_commessa
WITH (security_invoker = true) AS
WITH ricavi AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as ricavi_imponibile,
    COALESCE(SUM(importo_iva), 0) as ricavi_iva,
    COALESCE(SUM(importo_totale), 0) as ricavi_totali,
    COUNT(*) as numero_ricavi
  FROM fatture_attive
  WHERE commessa_id IS NOT NULL
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
  WHERE commessa_id IS NOT NULL
  GROUP BY commessa_id
),
costi_note_spesa AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo), 0) as costi_note_spesa,
    COUNT(*) as numero_note_spesa
  FROM note_spesa
  WHERE commessa_id IS NOT NULL
    AND stato = 'approvato'
  GROUP BY commessa_id
),
all_commesse AS (
  SELECT DISTINCT commessa_id FROM fatture_attive WHERE commessa_id IS NOT NULL
  UNION
  SELECT DISTINCT commessa_id FROM fatture_passive WHERE commessa_id IS NOT NULL
  UNION
  SELECT DISTINCT commessa_id FROM note_spesa WHERE commessa_id IS NOT NULL AND stato = 'approvato'
)
SELECT
  ac.commessa_id,

  -- Ricavi
  COALESCE(r.ricavi_imponibile, 0) as ricavi_imponibile,
  COALESCE(r.ricavi_iva, 0) as ricavi_iva,
  COALESCE(r.ricavi_totali, 0) as ricavi_totali,
  COALESCE(r.numero_ricavi, 0) as numero_ricavi,

  -- Costi da fatture passive
  COALESCE(cf.costi_imponibile, 0) as costi_fatture_imponibile,
  COALESCE(cf.costi_iva, 0) as costi_fatture_iva,
  COALESCE(cf.costi_totali, 0) as costi_fatture_totali,
  COALESCE(cf.numero_fatture_passive, 0) as numero_fatture_passive,

  -- Costi da note spesa
  COALESCE(cns.costi_note_spesa, 0) as costi_note_spesa,
  COALESCE(cns.numero_note_spesa, 0) as numero_note_spesa,

  -- Totali costi (fatture + note spesa)
  COALESCE(cf.costi_totali, 0) + COALESCE(cns.costi_note_spesa, 0) as costi_totali,
  COALESCE(cf.numero_fatture_passive, 0) + COALESCE(cns.numero_note_spesa, 0) as numero_movimenti_costi,

  -- Totali complessivi
  COALESCE(cf.costi_totali, 0) + COALESCE(cns.costi_note_spesa, 0) as costi_totali_completi,
  COALESCE(r.numero_ricavi, 0) + COALESCE(cf.numero_fatture_passive, 0) + COALESCE(cns.numero_note_spesa, 0) as numero_movimenti_totali,

  -- Margini
  COALESCE(r.ricavi_totali, 0) - (COALESCE(cf.costi_totali, 0) + COALESCE(cns.costi_note_spesa, 0)) as margine_lordo,
  CASE
    WHEN COALESCE(r.ricavi_totali, 0) > 0 THEN
      ((COALESCE(r.ricavi_totali, 0) - (COALESCE(cf.costi_totali, 0) + COALESCE(cns.costi_note_spesa, 0)))
        / COALESCE(r.ricavi_totali, 0)) * 100
    ELSE 0
  END as margine_percentuale

FROM all_commesse ac
LEFT JOIN ricavi r ON ac.commessa_id = r.commessa_id
LEFT JOIN costi_fatture cf ON ac.commessa_id = cf.commessa_id
LEFT JOIN costi_note_spesa cns ON ac.commessa_id = cns.commessa_id;

COMMENT ON VIEW public.riepilogo_economico_commessa IS
'Economic summary per commessa: revenues from fatture_attive, costs from fatture_passive and approved note_spesa';

-- ============================================================================
-- PART 7: UPDATE RLS POLICIES
-- ============================================================================

-- Drop old generic policies
DROP POLICY IF EXISTS "Users can view note_spesa from their tenant" ON note_spesa;
DROP POLICY IF EXISTS "Users can create note_spesa for their tenant" ON note_spesa;
DROP POLICY IF EXISTS "Users can update note_spesa" ON note_spesa;
DROP POLICY IF EXISTS "Users can delete note_spesa" ON note_spesa;

-- SELECT: Employees see own, Approvers see assigned commesse
CREATE POLICY "Enhanced view policy for note_spesa"
  ON note_spesa FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      -- Employee sees own
      dipendente_id IN (SELECT id FROM dipendenti WHERE user_id = auth.uid())
      OR
      -- Approver sees commesse where they are approver
      EXISTS (
        SELECT 1 FROM commesse_impostazioni_approvazione cia
        JOIN dipendenti d ON auth.uid() = d.user_id
        WHERE cia.commessa_id = note_spesa.commessa_id
          AND cia.tipo_approvazione = 'note_spesa'
          AND d.id = ANY(cia.approvatori)
      )
      OR
      -- Admin/Owner sees all
      EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = note_spesa.tenant_id
          AND ut.role IN ('owner', 'admin')
      )
    )
  );

-- INSERT: Only employees for team commesse
CREATE POLICY "Enhanced insert policy for note_spesa"
  ON note_spesa FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND created_by = auth.uid()
    AND dipendente_id IN (SELECT id FROM dipendenti WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM commesse_team ct
      WHERE ct.commessa_id = note_spesa.commessa_id
        AND ct.dipendente_id = note_spesa.dipendente_id
        AND ct.tenant_id = note_spesa.tenant_id
    )
  );

-- UPDATE: Complex policy for different roles and states
CREATE POLICY "Enhanced update policy for note_spesa"
  ON note_spesa FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      (
        dipendente_id IN (SELECT id FROM dipendenti WHERE user_id = auth.uid())
        AND stato IN ('bozza', 'rifiutato')
      )
      OR
      EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = note_spesa.tenant_id
          AND ut.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    CASE
      WHEN stato IN ('approvato', 'rifiutato') THEN
        EXISTS (
          SELECT 1 FROM commesse_impostazioni_approvazione cia
          JOIN dipendenti d ON auth.uid() = d.user_id
          WHERE cia.commessa_id = note_spesa.commessa_id
            AND cia.tipo_approvazione = 'note_spesa'
            AND d.id = ANY(cia.approvatori)
        )
        OR
        EXISTS (
          SELECT 1 FROM user_tenants ut
          WHERE ut.user_id = auth.uid()
            AND ut.tenant_id = note_spesa.tenant_id
            AND ut.role IN ('owner', 'admin')
        )
      ELSE TRUE
    END
  );

-- DELETE: Employees only own non-approved, Admin all
CREATE POLICY "Enhanced delete policy for note_spesa"
  ON note_spesa FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      (
        dipendente_id IN (SELECT id FROM dipendenti WHERE user_id = auth.uid())
        AND stato != 'approvato'
      )
      OR
      EXISTS (
        SELECT 1 FROM user_tenants ut
        WHERE ut.user_id = auth.uid()
          AND ut.tenant_id = note_spesa.tenant_id
          AND ut.role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
