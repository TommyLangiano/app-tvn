-- Add orario_inizio and orario_fine to rapportini table
-- These fields are used when modalita_calcolo_rapportini = 'orari'

ALTER TABLE rapportini
  ADD COLUMN IF NOT EXISTS orario_inizio TIME,
  ADD COLUMN IF NOT EXISTS orario_fine TIME;

-- Comments
COMMENT ON COLUMN rapportini.orario_inizio IS 'Orario di inizio lavoro (usato con modalità orari)';
COMMENT ON COLUMN rapportini.orario_fine IS 'Orario di fine lavoro (usato con modalità orari)';
