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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_generate_commessa_slug ON commesse;

-- Trigger to auto-generate slug before insert
CREATE TRIGGER trigger_auto_generate_commessa_slug
  BEFORE INSERT ON commesse
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_commessa_slug();
