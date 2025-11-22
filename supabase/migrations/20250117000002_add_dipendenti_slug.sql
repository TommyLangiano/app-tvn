-- Add slug column to dipendenti table
ALTER TABLE dipendenti ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug per tenant
CREATE UNIQUE INDEX IF NOT EXISTS dipendenti_tenant_slug_key ON dipendenti(tenant_id, slug);

-- Function to generate slug from nome and cognome
CREATE OR REPLACE FUNCTION generate_dipendente_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  slug_count INTEGER;
BEGIN
  -- Generate base slug from cognome-nome
  base_slug := lower(
    regexp_replace(
      regexp_replace(
        unaccent(NEW.cognome || '-' || NEW.nome),
        '[^a-z0-9\s-]', '', 'gi'
      ),
      '[\s_]+', '-', 'g'
    )
  );

  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);

  -- Check if slug exists for this tenant
  final_slug := base_slug;
  slug_count := 1;

  WHILE EXISTS (
    SELECT 1 FROM dipendenti
    WHERE tenant_id = NEW.tenant_id
    AND slug = final_slug
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) LOOP
    final_slug := base_slug || '-' || slug_count;
    slug_count := slug_count + 1;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug
DROP TRIGGER IF EXISTS dipendenti_generate_slug ON dipendenti;
CREATE TRIGGER dipendenti_generate_slug
  BEFORE INSERT OR UPDATE OF nome, cognome ON dipendenti
  FOR EACH ROW
  EXECUTE FUNCTION generate_dipendente_slug();

-- Generate slugs for existing dipendenti (trigger will auto-generate on UPDATE)
UPDATE dipendenti SET nome = nome WHERE slug IS NULL OR slug = '';
