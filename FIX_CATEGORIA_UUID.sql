-- ============================================================================
-- ESEGUI QUESTO SCRIPT SU SUPABASE SQL EDITOR
-- Fix immediato per convertire note_spesa.categoria da TEXT a UUID
-- ============================================================================

-- IMPORTANTE: Questo script gestisce sia valori già UUID che valori testuali

-- Step 1: Verifica stato attuale della colonna
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'note_spesa'
    AND column_name = 'categoria';

  RAISE NOTICE 'Tipo attuale di nota_spesa.categoria: %', col_type;
END $$;

-- Step 2: Se la colonna è ancora TEXT, convertila
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'note_spesa'
    AND column_name = 'categoria';

  IF col_type IN ('text', 'character varying') THEN
    RAISE NOTICE 'Conversione categoria da TEXT a UUID...';

    -- Aggiungi colonna temporanea
    ALTER TABLE note_spesa ADD COLUMN IF NOT EXISTS categoria_uuid UUID;

    -- Converti i valori
    UPDATE note_spesa
    SET categoria_uuid = CASE
      -- Se è già un UUID valido, usalo
      WHEN categoria ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN categoria::uuid
      -- Altrimenti cerca per nome
      ELSE (
        SELECT id FROM categorie_note_spesa
        WHERE tenant_id = note_spesa.tenant_id
          AND LOWER(nome) = LOWER(note_spesa.categoria)
        LIMIT 1
      )
    END
    WHERE categoria IS NOT NULL;

    -- Per valori ancora NULL, usa la prima categoria disponibile
    UPDATE note_spesa
    SET categoria_uuid = (
      SELECT id FROM categorie_note_spesa
      WHERE tenant_id = note_spesa.tenant_id
        AND attiva = true
      ORDER BY ordinamento
      LIMIT 1
    )
    WHERE categoria IS NOT NULL
      AND categoria_uuid IS NULL;

    -- Drop vecchia colonna
    ALTER TABLE note_spesa DROP COLUMN categoria;

    -- Rinomina nuova colonna
    ALTER TABLE note_spesa RENAME COLUMN categoria_uuid TO categoria;

    -- Rendi NOT NULL
    ALTER TABLE note_spesa ALTER COLUMN categoria SET NOT NULL;

    RAISE NOTICE 'Conversione completata!';
  ELSE
    RAISE NOTICE 'Colonna già di tipo UUID, skip conversione';
  END IF;
END $$;

-- Step 3: Aggiungi foreign key se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'note_spesa_categoria_fkey'
  ) THEN
    ALTER TABLE note_spesa
      ADD CONSTRAINT note_spesa_categoria_fkey
      FOREIGN KEY (categoria)
      REFERENCES categorie_note_spesa(id)
      ON DELETE RESTRICT;

    RAISE NOTICE 'Foreign key constraint aggiunto';
  ELSE
    RAISE NOTICE 'Foreign key constraint già esistente';
  END IF;
END $$;

-- Step 4: Aggiungi indice se non esiste
CREATE INDEX IF NOT EXISTS idx_note_spesa_categoria ON note_spesa(categoria);

-- Step 5: Verifica risultato
SELECT
  ns.id,
  ns.numero_nota,
  ns.categoria as categoria_uuid,
  cns.nome as categoria_nome,
  ns.importo
FROM note_spesa ns
LEFT JOIN categorie_note_spesa cns ON ns.categoria = cns.id
ORDER BY ns.created_at DESC
LIMIT 10;

-- SUCCESS!
-- Se vedi la colonna categoria_nome popolata, la conversione è riuscita!
