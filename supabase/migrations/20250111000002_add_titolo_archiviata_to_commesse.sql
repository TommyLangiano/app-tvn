-- Add titolo (alias for nome_commessa) and archiviata to commesse table
ALTER TABLE commesse
ADD COLUMN IF NOT EXISTS titolo TEXT GENERATED ALWAYS AS (nome_commessa) STORED,
ADD COLUMN IF NOT EXISTS archiviata BOOLEAN DEFAULT FALSE;

-- Create index on archiviata for faster queries
CREATE INDEX IF NOT EXISTS idx_commesse_archiviata ON commesse(archiviata);
