-- ============================================================================
-- Safe fix for note_spesa.categoria - ensures all values are valid UUIDs
-- Handles both TEXT and UUID column types
-- ============================================================================

-- Step 1: Check if column is already UUID type
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'note_spesa'
    AND column_name = 'categoria';

  -- If already UUID, just fix invalid values
  IF col_type = 'uuid' THEN
    RAISE NOTICE 'Column is already UUID type, fixing invalid references...';

    -- Drop FK temporarily
    ALTER TABLE note_spesa DROP CONSTRAINT IF EXISTS note_spesa_categoria_fkey;

    -- Fix invalid categoria values
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
    );

  -- If TEXT, convert to UUID
  ELSIF col_type IN ('text', 'character varying') THEN
    RAISE NOTICE 'Converting from TEXT to UUID...';

    -- Add temporary UUID column
    ALTER TABLE note_spesa ADD COLUMN IF NOT EXISTS categoria_uuid UUID;

    -- Try to match by name first, then use first available
    UPDATE note_spesa
    SET categoria_uuid = COALESCE(
      -- Try to find by exact name match
      (
        SELECT id FROM categorie_note_spesa
        WHERE tenant_id = note_spesa.tenant_id
          AND LOWER(nome) = LOWER(note_spesa.categoria)
        LIMIT 1
      ),
      -- Fallback to first active category
      (
        SELECT id FROM categorie_note_spesa
        WHERE tenant_id = note_spesa.tenant_id
          AND attiva = true
        ORDER BY ordinamento
        LIMIT 1
      )
    )
    WHERE categoria IS NOT NULL;

    -- Drop old column and rename
    ALTER TABLE note_spesa DROP COLUMN categoria CASCADE;
    ALTER TABLE note_spesa RENAME COLUMN categoria_uuid TO categoria;
    ALTER TABLE note_spesa ALTER COLUMN categoria SET NOT NULL;
  END IF;
END $$;

-- Step 2: Add foreign key constraint
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
  END IF;
END $$;

-- Step 3: Add index for better join performance
CREATE INDEX IF NOT EXISTS idx_note_spesa_categoria ON note_spesa(categoria);

-- ============================================================================
-- Verification
-- ============================================================================

-- You can verify the conversion with:
-- SELECT
--   ns.id,
--   ns.categoria,
--   cns.nome as categoria_nome
-- FROM note_spesa ns
-- LEFT JOIN categorie_note_spesa cns ON ns.categoria = cns.id
-- LIMIT 10;
