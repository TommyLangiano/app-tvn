-- ============================================================================
-- ESEGUI QUESTO SCRIPT SU SUPABASE SQL EDITOR
-- Fix per note_spesa.categoria - Verifica se è già UUID o TEXT
-- ============================================================================

-- Step 1: Verifica tipo attuale
DO $$
DECLARE
  col_type text;
  total_notes integer;
  notes_with_null_categoria integer;
BEGIN
  -- Check column type
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'note_spesa'
    AND column_name = 'categoria';

  -- Count total notes
  SELECT COUNT(*) INTO total_notes FROM note_spesa;

  -- Count notes with invalid FK
  SELECT COUNT(*) INTO notes_with_null_categoria
  FROM note_spesa ns
  WHERE NOT EXISTS (
    SELECT 1 FROM categorie_note_spesa cns
    WHERE cns.id = ns.categoria
  );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tipo colonna categoria: %', col_type;
  RAISE NOTICE 'Totale note spese: %', total_notes;
  RAISE NOTICE 'Note con categoria invalida: %', notes_with_null_categoria;
  RAISE NOTICE '========================================';
END $$;

-- Step 2: Verifica stato foreign key
DO $$
DECLARE
  fk_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'note_spesa_categoria_fkey'
  ) INTO fk_exists;

  IF fk_exists THEN
    RAISE NOTICE 'Foreign key constraint ESISTE già';
  ELSE
    RAISE NOTICE 'Foreign key constraint NON ESISTE';
  END IF;
END $$;

-- Step 3: Drop foreign key se esiste (per permettere fix)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'note_spesa_categoria_fkey'
  ) THEN
    ALTER TABLE note_spesa DROP CONSTRAINT note_spesa_categoria_fkey;
    RAISE NOTICE 'Foreign key temporaneamente rimosso per fix';
  END IF;
END $$;

-- Step 4: Fix note con categoria invalida - assegna prima categoria disponibile
DO $$
DECLARE
  fixed_count integer := 0;
BEGIN
  WITH fixed_notes AS (
    UPDATE note_spesa ns
    SET categoria = (
      SELECT id FROM categorie_note_spesa
      WHERE tenant_id = ns.tenant_id
        AND attiva = true
      ORDER BY ordinamento
      LIMIT 1
    )
    WHERE NOT EXISTS (
      SELECT 1 FROM categorie_note_spesa cns
      WHERE cns.id = ns.categoria
    )
    RETURNING ns.id
  )
  SELECT COUNT(*) INTO fixed_count FROM fixed_notes;

  IF fixed_count > 0 THEN
    RAISE NOTICE 'Fixate % note spese con categoria invalida', fixed_count;
  ELSE
    RAISE NOTICE 'Nessuna nota spesa da fixare';
  END IF;
END $$;

-- Step 5: Ricrea foreign key
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

    RAISE NOTICE 'Foreign key constraint ricreato con successo';
  END IF;
END $$;

-- Step 6: Aggiungi indice se non esiste
CREATE INDEX IF NOT EXISTS idx_note_spesa_categoria ON note_spesa(categoria);

-- Step 7: Verifica finale
SELECT
  '✅ VERIFICA FINALE' as status,
  COUNT(*) as totale_note_spese,
  COUNT(CASE WHEN cns.id IS NOT NULL THEN 1 END) as note_con_categoria_valida,
  COUNT(CASE WHEN cns.id IS NULL THEN 1 END) as note_con_categoria_invalida
FROM note_spesa ns
LEFT JOIN categorie_note_spesa cns ON ns.categoria = cns.id;

-- Step 8: Mostra esempi di note spese
SELECT
  ns.id,
  ns.numero_nota,
  ns.categoria as categoria_uuid,
  cns.nome as categoria_nome,
  ns.importo,
  ns.stato
FROM note_spesa ns
LEFT JOIN categorie_note_spesa cns ON ns.categoria = cns.id
ORDER BY ns.created_at DESC
LIMIT 10;

-- ✅ SUCCESS!
-- Tutte le note dovrebbero avere categoria_nome popolata
