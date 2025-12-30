-- Migration: Fix fatture_passive importo_totale calculation
-- Description: Assicura che importo_totale sia correttamente calcolato come GENERATED COLUMN
-- Date: 2025-02-28

-- Drop the existing column if it's not GENERATED
-- Then recreate it as GENERATED ALWAYS
DO $$
BEGIN
  -- Check if the column exists and is not generated
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'fatture_passive'
    AND column_name = 'importo_totale'
    AND is_generated = 'NEVER'
  ) THEN
    -- Drop the existing column
    ALTER TABLE public.fatture_passive DROP COLUMN importo_totale;

    -- Recreate as GENERATED ALWAYS
    ALTER TABLE public.fatture_passive
    ADD COLUMN importo_totale DECIMAL(15,2)
    GENERATED ALWAYS AS (importo_imponibile + importo_iva) STORED;

    RAISE NOTICE 'Column importo_totale recreated as GENERATED ALWAYS';
  ELSE
    RAISE NOTICE 'Column importo_totale is already GENERATED or does not exist';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.fatture_passive.importo_totale IS 'Importo totale (imponibile + IVA) - GENERATED COLUMN';
