-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create table for Italian municipalities
CREATE TABLE comuni_italiani (
  codice_istat TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  provincia TEXT NOT NULL,
  sigla_provincia TEXT NOT NULL,
  regione TEXT NOT NULL,
  cap TEXT,
  codice_catastale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast autocomplete search
CREATE INDEX idx_comuni_nome ON comuni_italiani(nome);
CREATE INDEX idx_comuni_nome_trgm ON comuni_italiani USING gin(nome gin_trgm_ops);
CREATE INDEX idx_comuni_provincia ON comuni_italiani(provincia);
CREATE INDEX idx_comuni_sigla ON comuni_italiani(sigla_provincia);
CREATE INDEX idx_comuni_regione ON comuni_italiani(regione);

-- Enable Row Level Security (but allow read for all authenticated users)
ALTER TABLE comuni_italiani ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read comuni (it's public data)
CREATE POLICY "Anyone can view comuni"
  ON comuni_italiani FOR SELECT
  USING (true);

-- Comment
COMMENT ON TABLE comuni_italiani IS 'Database of all Italian municipalities with ISTAT codes, provinces, regions and postal codes (CAP)';
