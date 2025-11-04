-- Add username, first_name, last_name to user_profiles
-- Migration: 20250112000005_add_username_and_split_names.sql

-- Enable unaccent extension for removing accents
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add new columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Function to generate unique username from first and last name
CREATE OR REPLACE FUNCTION generate_username(
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
BEGIN
  -- Normalize names: lowercase, remove accents, replace spaces/special chars with underscore
  base_username := LOWER(
    REGEXP_REPLACE(
      UNACCENT(p_last_name || '_' || p_first_name),
      '[^a-z0-9_]',
      '',
      'g'
    )
  );

  -- Start with base username
  final_username := base_username;

  -- Check if username exists, if so, add incremental number
  WHILE EXISTS (SELECT 1 FROM user_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate username before insert
CREATE OR REPLACE FUNCTION auto_generate_username()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if username is not provided and we have first/last name
  IF NEW.username IS NULL AND NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.username := generate_username(NEW.first_name, NEW.last_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate username
DROP TRIGGER IF EXISTS auto_generate_username_trigger ON user_profiles;
CREATE TRIGGER auto_generate_username_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_username();

-- Migrate existing data: split full_name into first_name and last_name
UPDATE user_profiles
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      TRIM(SPLIT_PART(full_name, ' ', 1))
    ELSE NULL
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND full_name != '' THEN
      TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
    ELSE NULL
  END
WHERE first_name IS NULL AND last_name IS NULL AND full_name IS NOT NULL;

-- Generate usernames for existing users
UPDATE user_profiles
SET username = generate_username(first_name, last_name)
WHERE username IS NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;

-- Update trigger to sync full_name when first/last name change
CREATE OR REPLACE FUNCTION sync_full_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-generate full_name from first_name and last_name
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_full_name_trigger ON user_profiles;
CREATE TRIGGER sync_full_name_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_full_name();

-- Add comments
COMMENT ON COLUMN user_profiles.username IS 'Auto-generated unique username in format: cognome_nome (with number suffix if duplicate)';
COMMENT ON COLUMN user_profiles.first_name IS 'User first name';
COMMENT ON COLUMN user_profiles.last_name IS 'User last name';
