-- Add stato column to rapportini table
ALTER TABLE rapportini
ADD COLUMN IF NOT EXISTS stato TEXT DEFAULT 'approvato' CHECK (stato IN ('approvato', 'da_approvare', 'rifiutato'));

-- Add comment
COMMENT ON COLUMN rapportini.stato IS 'Stato del rapportino: approvato (default), da_approvare, rifiutato';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_rapportini_stato ON rapportini(stato);
