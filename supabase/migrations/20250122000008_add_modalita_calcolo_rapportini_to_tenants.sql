-- Add modalita_calcolo_rapportini to tenants table
-- This allows each tenant to choose how rapportini hours are calculated:
-- - 'ore_totali': Direct input of total hours worked (default)
-- - 'orari': Input of start/end time, automatic calculation of hours

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS modalita_calcolo_rapportini VARCHAR(20) DEFAULT 'ore_totali' CHECK (
    modalita_calcolo_rapportini IN ('ore_totali', 'orari')
  );

-- Comment
COMMENT ON COLUMN tenants.modalita_calcolo_rapportini IS 'Modalità di calcolo ore nei rapportini: ore_totali (inserimento diretto) o orari (orario inizio/fine)';
