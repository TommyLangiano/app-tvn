-- Migration: Fix fatture_passive data integrity
-- Description: Corregge i dati delle fatture passive dove importo_imponibile e importo_iva sono 0 ma importo_totale ha un valore
-- Date: 2025-02-28

-- Step 1: Create a temporary backup of importo_totale values
CREATE TEMP TABLE temp_importo_totale AS
SELECT id, importo_totale
FROM public.fatture_passive
WHERE importo_imponibile = 0
  AND importo_iva = 0
  AND importo_totale > 0;

-- Step 2: Check if importo_totale is a GENERATED COLUMN
DO $$
DECLARE
  is_generated_col boolean;
BEGIN
  -- Check if column is generated
  SELECT COALESCE(is_generated = 'ALWAYS', false) INTO is_generated_col
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'fatture_passive'
    AND column_name = 'importo_totale';

  IF is_generated_col THEN
    -- If it's generated, we need to drop and recreate it
    ALTER TABLE public.fatture_passive DROP COLUMN importo_totale;

    -- Add as regular column temporarily
    ALTER TABLE public.fatture_passive
      ADD COLUMN importo_totale DECIMAL(15,2);

    -- Restore backed up values
    UPDATE public.fatture_passive fp
    SET importo_totale = t.importo_totale
    FROM temp_importo_totale t
    WHERE fp.id = t.id;
  END IF;
END $$;

-- Step 3: For rows where importo_imponibile = 0 AND importo_iva = 0 BUT importo_totale > 0
-- Calculate retroactively assuming 22% IVA (most common in Italy)
-- Formula: importo_imponibile = importo_totale / 1.22
--          importo_iva = importo_totale - importo_imponibile

UPDATE public.fatture_passive
SET
  importo_imponibile = ROUND(importo_totale / 1.22, 2),
  importo_iva = ROUND(importo_totale - (importo_totale / 1.22), 2)
WHERE
  importo_imponibile = 0
  AND importo_iva = 0
  AND importo_totale > 0;

-- Step 4: Drop the temporary regular column and recreate as GENERATED
ALTER TABLE public.fatture_passive DROP COLUMN importo_totale;

ALTER TABLE public.fatture_passive
  ADD COLUMN importo_totale DECIMAL(15,2)
  GENERATED ALWAYS AS (importo_imponibile + importo_iva) STORED;

-- Add comment
COMMENT ON COLUMN public.fatture_passive.importo_totale IS 'Importo totale (imponibile + IVA) - GENERATED COLUMN';

-- Drop temp table
DROP TABLE IF EXISTS temp_importo_totale;
