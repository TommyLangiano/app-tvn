-- ============================================================================
-- Complete fix for note_spesa system
-- Consolidates all fixes into one migration
-- ============================================================================

-- 1. Add missing index on dipendenti for RLS performance
CREATE INDEX IF NOT EXISTS idx_dipendenti_user_id_tenant_id
  ON dipendenti(user_id, tenant_id);

-- 2. Update RLS policy on dipendenti to allow select by user_id with tenant filter
-- This fixes the 406 error when querying dipendenti by user_id
DROP POLICY IF EXISTS "Users can view dipendenti from their tenant by user_id" ON dipendenti;

CREATE POLICY "Users can view dipendenti from their tenant by user_id"
  ON dipendenti FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- 3. Ensure note_spesa_azioni table exists with correct structure
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'note_spesa_azioni') THEN
    CREATE TABLE note_spesa_azioni (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      nota_spesa_id uuid NOT NULL,
      tenant_id uuid NOT NULL,
      azione text NOT NULL CHECK (azione = ANY (ARRAY['creata'::text, 'modificata'::text, 'sottomessa'::text, 'approvata'::text, 'rifiutata'::text, 'eliminata'::text])),
      eseguita_da uuid NOT NULL,
      eseguita_il timestamp with time zone DEFAULT now(),
      stato_precedente text,
      stato_nuovo text,
      motivo text,
      dati_modificati jsonb,
      created_at timestamp with time zone DEFAULT now(),
      CONSTRAINT note_spesa_azioni_pkey PRIMARY KEY (id),
      CONSTRAINT note_spesa_azioni_eseguita_da_fkey FOREIGN KEY (eseguita_da) REFERENCES auth.users(id),
      CONSTRAINT note_spesa_azioni_nota_spesa_id_fkey FOREIGN KEY (nota_spesa_id) REFERENCES note_spesa(id) ON DELETE CASCADE,
      CONSTRAINT note_spesa_azioni_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    );

    -- Enable RLS
    ALTER TABLE note_spesa_azioni ENABLE ROW LEVEL SECURITY;

    -- Add RLS policies
    CREATE POLICY "Users can view azioni from their tenant"
      ON note_spesa_azioni FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert azioni for their tenant"
      ON note_spesa_azioni FOR INSERT
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. Update audit trigger to include tenant_id
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

-- 5. Create trigger if not exists
DROP TRIGGER IF EXISTS audit_nota_spesa_trigger ON note_spesa;
CREATE TRIGGER audit_nota_spesa_trigger
  AFTER INSERT OR UPDATE OR DELETE ON note_spesa
  FOR EACH ROW
  EXECUTE FUNCTION audit_nota_spesa_changes();

-- 6. Update RPC functions with DROP first
DROP FUNCTION IF EXISTS approva_nota_spesa(UUID, UUID);
DROP FUNCTION IF EXISTS rifiuta_nota_spesa(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION approva_nota_spesa(
  p_nota_spesa_id UUID,
  p_approvato_da UUID
) RETURNS JSONB AS $$
DECLARE
  v_nota_spesa RECORD;
  v_result JSONB;
BEGIN
  -- Get nota_spesa with tenant_id
  SELECT * INTO v_nota_spesa
  FROM note_spesa
  WHERE id = p_nota_spesa_id;

  IF v_nota_spesa IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nota spesa non trovata'
    );
  END IF;

  -- Verify user is authorized approver
  IF NOT EXISTS (
    SELECT 1 FROM commesse_impostazioni_approvazione cia
    WHERE cia.commessa_id = v_nota_spesa.commessa_id
      AND cia.tipo_approvazione = 'note_spesa'
      AND p_approvato_da = ANY(cia.approvatori)
  ) AND NOT EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = v_nota_spesa.tenant_id
      AND ut.role IN ('owner', 'admin')
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

CREATE OR REPLACE FUNCTION rifiuta_nota_spesa(
  p_nota_spesa_id UUID,
  p_rifiutato_da UUID,
  p_motivo TEXT
) RETURNS JSONB AS $$
DECLARE
  v_nota_spesa RECORD;
  v_result JSONB;
BEGIN
  -- Validate motivo
  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Il motivo del rifiuto è obbligatorio'
    );
  END IF;

  -- Get nota_spesa with tenant_id
  SELECT * INTO v_nota_spesa
  FROM note_spesa
  WHERE id = p_nota_spesa_id;

  IF v_nota_spesa IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nota spesa non trovata'
    );
  END IF;

  -- Verify authorization
  IF NOT EXISTS (
    SELECT 1 FROM commesse_impostazioni_approvazione cia
    WHERE cia.commessa_id = v_nota_spesa.commessa_id
      AND cia.tipo_approvazione = 'note_spesa'
      AND p_rifiutato_da = ANY(cia.approvatori)
  ) AND NOT EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = v_nota_spesa.tenant_id
      AND ut.role IN ('owner', 'admin')
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

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION approva_nota_spesa IS 'Approve expense note - handles tenant_id correctly';
COMMENT ON FUNCTION rifiuta_nota_spesa IS 'Reject expense note with mandatory reason - handles tenant_id correctly';
