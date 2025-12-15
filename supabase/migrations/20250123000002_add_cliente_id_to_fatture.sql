-- Add cliente_id to fatture_attive for better analytics

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fatture_attive' AND column_name = 'cliente_id') THEN
    ALTER TABLE fatture_attive ADD COLUMN cliente_id UUID REFERENCES clienti(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for cliente_id
CREATE INDEX IF NOT EXISTS idx_fatture_attive_cliente_id ON fatture_attive(cliente_id);

-- Try to link existing fatture to clienti by ragione_sociale
UPDATE fatture_attive fa
SET cliente_id = c.id
FROM clienti c
WHERE fa.cliente_id IS NULL
  AND LOWER(TRIM(fa.cliente)) = LOWER(TRIM(c.ragione_sociale))
  AND fa.tenant_id = c.tenant_id;

COMMENT ON COLUMN fatture_attive.cliente_id IS 'Reference al cliente dalla tabella clienti';
