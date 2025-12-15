-- ============================================
-- MIGRATION: Add critical fields for analytics
-- ============================================

-- 1. COMMESSE: Add budget fields
ALTER TABLE commesse
  ADD COLUMN IF NOT EXISTS budget_materiali DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS budget_manodopera DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS budget_altro DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS margine_percentuale_target DECIMAL(5,2) DEFAULT 20.0;

-- 2. FATTURE ATTIVE: Add data_scadenza + percentuale_sal
ALTER TABLE fatture_attive
  ADD COLUMN IF NOT EXISTS data_scadenza DATE,
  ADD COLUMN IF NOT EXISTS percentuale_sal DECIMAL(5,2) DEFAULT 100.0;

-- Set data_scadenza = data_emissione + 30 giorni per fatture esistenti senza scadenza
UPDATE fatture_attive
SET data_scadenza = data_emissione + INTERVAL '30 days'
WHERE data_scadenza IS NULL;

-- Rename stato_pagamento to be consistent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fatture_attive' AND column_name = 'stato') THEN
    ALTER TABLE fatture_attive RENAME COLUMN stato_pagamento TO stato;
  END IF;
END $$;

-- Update stato values to be consistent
UPDATE fatture_attive SET stato = 'pagato' WHERE stato = 'Pagato';
UPDATE fatture_attive SET stato = 'da_pagare' WHERE stato = 'Non Pagato';

-- Add scaduto stato per fatture scadute e non pagate
UPDATE fatture_attive
SET stato = 'scaduto'
WHERE stato = 'da_pagare' AND data_scadenza < CURRENT_DATE;

-- 3. FATTURE PASSIVE: Add data_scadenza + categoria
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fatture_passive') THEN
    ALTER TABLE fatture_passive
      ADD COLUMN IF NOT EXISTS data_scadenza DATE,
      ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'altro';

    UPDATE fatture_passive
    SET data_scadenza = data_emissione + INTERVAL '30 days'
    WHERE data_scadenza IS NULL;
  END IF;
END $$;

-- 4. SCONTRINI: Add categoria if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scontrini') THEN
    ALTER TABLE scontrini
      ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'altro';
  END IF;
END $$;

-- 5. RAPPORTINI: Add costo_orario + costo_totale
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rapportini') THEN
    ALTER TABLE rapportini
      ADD COLUMN IF NOT EXISTS costo_orario DECIMAL(10,2) DEFAULT 25.00,
      ADD COLUMN IF NOT EXISTS costo_totale DECIMAL(15,2);

    -- Calcola costo_totale per rapportini esistenti
    UPDATE rapportini
    SET costo_totale = (COALESCE(ore_lavorate, 0) + COALESCE(minuti_lavorati, 0) / 60.0) * costo_orario
    WHERE costo_totale IS NULL;
  END IF;
END $$;

-- 6. CLIENTI: Add payment analytics fields
ALTER TABLE clienti
  ADD COLUMN IF NOT EXISTS giorni_pagamento_standard INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS affidabilita TEXT DEFAULT 'medio' CHECK (affidabilita IN ('buono', 'medio', 'problematico'));

-- 7. Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_fatture_attive_data_scadenza ON fatture_attive(data_scadenza);
CREATE INDEX IF NOT EXISTS idx_fatture_attive_stato ON fatture_attive(stato);
CREATE INDEX IF NOT EXISTS idx_commesse_budget ON commesse(budget_preventivo);

-- 8. Create function to auto-update scaduto stato
CREATE OR REPLACE FUNCTION update_fatture_scadute()
RETURNS void AS $$
BEGIN
  UPDATE fatture_attive
  SET stato = 'scaduto'
  WHERE stato = 'da_pagare'
    AND data_scadenza < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 9. Comments
COMMENT ON COLUMN commesse.budget_materiali IS 'Budget allocato per materiali';
COMMENT ON COLUMN commesse.budget_manodopera IS 'Budget allocato per manodopera (dipendenti)';
COMMENT ON COLUMN commesse.budget_altro IS 'Budget per altre spese (noleggi, trasporti, etc)';
COMMENT ON COLUMN commesse.margine_percentuale_target IS 'Margine % obiettivo della commessa';
COMMENT ON COLUMN fatture_attive.data_scadenza IS 'Data scadenza pagamento';
COMMENT ON COLUMN fatture_attive.percentuale_sal IS 'Percentuale SAL (Stati Avanzamento Lavori)';
COMMENT ON COLUMN clienti.giorni_pagamento_standard IS 'Giorni standard di pagamento concordati (30, 60, 90)';
COMMENT ON COLUMN clienti.affidabilita IS 'Affidabilità pagamenti del cliente';
