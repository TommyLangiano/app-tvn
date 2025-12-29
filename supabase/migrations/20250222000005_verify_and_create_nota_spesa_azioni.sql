-- ============================================================================
-- Verify and create nota_spesa_azioni table if needed
-- ============================================================================

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS note_spesa_azioni (
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
  CONSTRAINT note_spesa_azioni_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_azioni_nota_spesa ON note_spesa_azioni(nota_spesa_id);
CREATE INDEX IF NOT EXISTS idx_azioni_tenant ON note_spesa_azioni(tenant_id);
CREATE INDEX IF NOT EXISTS idx_azioni_eseguita_da ON note_spesa_azioni(eseguita_da);
CREATE INDEX IF NOT EXISTS idx_azioni_azione ON note_spesa_azioni(azione);
CREATE INDEX IF NOT EXISTS idx_azioni_eseguita_il ON note_spesa_azioni(eseguita_il DESC);

-- Enable RLS
ALTER TABLE note_spesa_azioni ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view actions from their tenant" ON note_spesa_azioni;
DROP POLICY IF EXISTS "Allow insert actions for note spesa" ON note_spesa_azioni;

-- Policy: SELECT (view actions)
CREATE POLICY "Users can view actions from their tenant"
  ON note_spesa_azioni FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: INSERT (allow triggers and manual inserts)
CREATE POLICY "Allow insert actions for note spesa"
  ON note_spesa_azioni FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );
