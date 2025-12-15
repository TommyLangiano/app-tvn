-- Add missing fields to commesse table for analytics

-- Add stato field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commesse' AND column_name = 'stato') THEN
    ALTER TABLE commesse ADD COLUMN stato TEXT DEFAULT 'in_corso';
  END IF;
END $$;

-- Add budget_preventivo field
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commesse' AND column_name = 'budget_preventivo') THEN
    ALTER TABLE commesse ADD COLUMN budget_preventivo DECIMAL(15, 2);
  END IF;
END $$;

-- Add cliente_id field (reference to clienti table)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commesse' AND column_name = 'cliente_id') THEN
    ALTER TABLE commesse ADD COLUMN cliente_id UUID REFERENCES clienti(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for stato
CREATE INDEX IF NOT EXISTS idx_commesse_stato ON commesse(stato);

-- Create index for cliente_id
CREATE INDEX IF NOT EXISTS idx_commesse_cliente_id ON commesse(cliente_id);

-- Update existing records to have a default stato
UPDATE commesse SET stato = 'in_corso' WHERE stato IS NULL;

-- Comment on new columns
COMMENT ON COLUMN commesse.stato IS 'Stato della commessa: in_attesa, in_corso, completata, annullata';
COMMENT ON COLUMN commesse.budget_preventivo IS 'Budget preventivo/previsto per la commessa';
COMMENT ON COLUMN commesse.cliente_id IS 'Reference al cliente dalla tabella clienti';
