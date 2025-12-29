-- ============================================================================
-- Add foreign key constraint from note_spesa.categoria to categorie_note_spesa.id
-- ============================================================================

-- Add foreign key constraint
ALTER TABLE note_spesa
  ADD CONSTRAINT note_spesa_categoria_fkey
  FOREIGN KEY (categoria)
  REFERENCES categorie_note_spesa(id)
  ON DELETE RESTRICT;

-- Add index for better join performance
CREATE INDEX IF NOT EXISTS idx_note_spesa_categoria ON note_spesa(categoria);
