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

-- Step 2: Drop the view that depends on importo_totale
DROP VIEW IF EXISTS public.riepilogo_economico_commessa;

-- Step 3: Check if importo_totale is a GENERATED COLUMN
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

-- Step 4: For rows where importo_imponibile = 0 AND importo_iva = 0 BUT importo_totale > 0
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

-- Step 5: Drop the temporary regular column and recreate as GENERATED
ALTER TABLE public.fatture_passive DROP COLUMN importo_totale;

ALTER TABLE public.fatture_passive
  ADD COLUMN importo_totale DECIMAL(15,2)
  GENERATED ALWAYS AS (importo_imponibile + importo_iva) STORED;

-- Add comment
COMMENT ON COLUMN public.fatture_passive.importo_totale IS 'Importo totale (imponibile + IVA) - GENERATED COLUMN';

-- Step 6: Recreate the riepilogo_economico_commessa view
CREATE VIEW public.riepilogo_economico_commessa
WITH (security_invoker = true) AS
WITH ricavi AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as ricavi_imponibile,
    COALESCE(SUM(importo_iva), 0) as ricavi_iva,
    COALESCE(SUM(importo_totale), 0) as ricavi_totali,
    COUNT(*) as numero_ricavi
  FROM fatture_attive
  WHERE commessa_id IS NOT NULL
  GROUP BY commessa_id
),
costi_fatture AS (
  SELECT
    commessa_id,
    COALESCE(SUM(importo_imponibile), 0) as costi_imponibile,
    COALESCE(SUM(importo_iva), 0) as costi_iva,
    COALESCE(SUM(importo_totale), 0) as costi_totali,
    COUNT(*) as numero_fatture_passive
  FROM fatture_passive
  WHERE commessa_id IS NOT NULL
  GROUP BY commessa_id
),
all_commesse AS (
  SELECT DISTINCT commessa_id FROM fatture_attive WHERE commessa_id IS NOT NULL
  UNION
  SELECT DISTINCT commessa_id FROM fatture_passive WHERE commessa_id IS NOT NULL
)
SELECT
  ac.commessa_id,
  -- Ricavi
  COALESCE(r.ricavi_imponibile, 0) as ricavi_imponibile,
  COALESCE(r.ricavi_iva, 0) as ricavi_iva,
  COALESCE(r.ricavi_totali, 0) as ricavi_totali,
  COALESCE(r.numero_ricavi, 0) as numero_ricavi,
  -- Costi
  COALESCE(cf.costi_imponibile, 0) as costi_imponibile,
  COALESCE(cf.costi_iva, 0) as costi_iva,
  COALESCE(cf.costi_totali, 0) as costi_totali,
  COALESCE(cf.numero_fatture_passive, 0) as numero_fatture_passive,
  -- Totali
  COALESCE(cf.costi_totali, 0) as costi_totali_completi,
  COALESCE(r.numero_ricavi, 0) + COALESCE(cf.numero_fatture_passive, 0) as numero_movimenti_totali,
  -- Margini
  COALESCE(r.ricavi_totali, 0) - COALESCE(cf.costi_totali, 0) as margine_lordo,
  CASE
    WHEN COALESCE(r.ricavi_totali, 0) > 0 THEN
      ((COALESCE(r.ricavi_totali, 0) - COALESCE(cf.costi_totali, 0)) / COALESCE(r.ricavi_totali, 0)) * 100
    ELSE 0
  END as margine_percentuale,
  -- Saldo IVA (IVA ricavi - IVA costi)
  COALESCE(r.ricavi_iva, 0) - COALESCE(cf.costi_iva, 0) as saldo_iva
FROM all_commesse ac
LEFT JOIN ricavi r ON ac.commessa_id = r.commessa_id
LEFT JOIN costi_fatture cf ON ac.commessa_id = cf.commessa_id;

-- Add comment
COMMENT ON VIEW public.riepilogo_economico_commessa IS 'View che aggrega i dati economici per commessa (ricavi da fatture attive, costi da fatture passive, include calcolo saldo IVA)';

-- Drop temp table
DROP TABLE IF EXISTS temp_importo_totale;
