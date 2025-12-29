-- ============================================================================
-- Convert note_spesa.categoria from TEXT to UUID and add foreign key
-- ============================================================================

-- Step 1: Convert the column type from TEXT to UUID
ALTER TABLE note_spesa
  ALTER COLUMN categoria TYPE uuid USING categoria::uuid;

-- Step 2: Add foreign key constraint
ALTER TABLE note_spesa
  ADD CONSTRAINT note_spesa_categoria_fkey
  FOREIGN KEY (categoria)
  REFERENCES categorie_note_spesa(id)
  ON DELETE RESTRICT;

-- Step 3: Add index for better join performance
CREATE INDEX IF NOT EXISTS idx_note_spesa_categoria ON note_spesa(categoria);
