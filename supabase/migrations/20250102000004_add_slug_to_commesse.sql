-- Add slug field to commesse table
ALTER TABLE commesse
ADD COLUMN slug TEXT UNIQUE;

-- Create index for slug
CREATE UNIQUE INDEX idx_commesse_slug ON commesse(slug) WHERE slug IS NOT NULL;

-- Function to generate slug from text
CREATE OR REPLACE FUNCTION generate_slug(text_input TEXT, max_length INTEGER DEFAULT 60)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Convert to lowercase, replace spaces and special chars with hyphens
  slug := lower(text_input);
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');

  -- Trim to max length
  IF length(slug) > max_length THEN
    slug := substring(slug, 1, max_length);
    slug := regexp_replace(slug, '-[^-]*$', '');
  END IF;

  RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Populate existing commesse with slugs
UPDATE commesse
SET slug = generate_slug(nome_commessa) || '-' || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE commesse
ALTER COLUMN slug SET NOT NULL;

-- Function to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION auto_generate_commessa_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if it's NULL
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.nome_commessa) || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug before insert
CREATE TRIGGER trigger_auto_generate_commessa_slug
  BEFORE INSERT ON commesse
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_commessa_slug();
