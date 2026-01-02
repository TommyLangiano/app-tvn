-- Migration: Fix margine_lordo calculation to use imponibile instead of totale
-- Description: Il margine lordo deve essere calcolato come (ricavi_imponibile - costi_imponibile)
-- Date: 2026-01-02

-- Drop the existing view
DROP VIEW IF EXISTS public.riepilogo_economico_commessa;

-- Recreate with correct margine_lordo calculation
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
  -- Margini (FIX: usa imponibile invece di totale)
  COALESCE(r.ricavi_imponibile, 0) - COALESCE(cf.costi_imponibile, 0) as margine_lordo,
  CASE
    WHEN COALESCE(r.ricavi_imponibile, 0) > 0 THEN
      ((COALESCE(r.ricavi_imponibile, 0) - COALESCE(cf.costi_imponibile, 0)) / COALESCE(r.ricavi_imponibile, 0)) * 100
    ELSE 0
  END as margine_percentuale,
  -- Saldo IVA (IVA ricavi - IVA costi)
  COALESCE(r.ricavi_iva, 0) - COALESCE(cf.costi_iva, 0) as saldo_iva
FROM all_commesse ac
LEFT JOIN ricavi r ON ac.commessa_id = r.commessa_id
LEFT JOIN costi_fatture cf ON ac.commessa_id = cf.commessa_id;

-- Add comment
COMMENT ON VIEW public.riepilogo_economico_commessa IS 'View che aggrega i dati economici per commessa (ricavi da fatture attive, costi da fatture passive, margine lordo calcolato su imponibile)';
