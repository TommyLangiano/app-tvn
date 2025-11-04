-- Fix username generation to handle uppercase letters correctly
-- Migration: 20250112000006_fix_username_generation.sql

-- Drop and recreate the username generation function with correct logic
DROP FUNCTION IF EXISTS generate_username(TEXT, TEXT);

CREATE OR REPLACE FUNCTION generate_username(
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 1;
  cleaned_first TEXT;
  cleaned_last TEXT;
BEGIN
  -- Clean and lowercase names: remove spaces, special chars, convert to lowercase
  -- IMPORTANT: First lowercase, THEN remove accents to preserve all characters
  cleaned_first := LOWER(TRIM(p_first_name));
  cleaned_last := LOWER(TRIM(p_last_name));

  -- Remove accents AFTER lowercasing
  cleaned_first := UNACCENT(cleaned_first);
  cleaned_last := UNACCENT(cleaned_last);

  -- Remove any remaining non-alphanumeric characters
  cleaned_first := REGEXP_REPLACE(cleaned_first, '[^a-z0-9]', '', 'g');
  cleaned_last := REGEXP_REPLACE(cleaned_last, '[^a-z0-9]', '', 'g');

  -- Format: cognome_nome
  base_username := cleaned_last || '_' || cleaned_first;

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

-- Update existing usernames that were generated incorrectly
UPDATE user_profiles
SET username = NULL
WHERE username IS NOT NULL;

-- Regenerate usernames for all users
UPDATE user_profiles
SET username = generate_username(first_name, last_name)
WHERE first_name IS NOT NULL AND last_name IS NOT NULL;

-- Test the function
DO $$
BEGIN
  RAISE NOTICE 'Test username generation:';
  RAISE NOTICE 'Vincenzo Riondino -> %', generate_username('Vincenzo', 'Riondino');
  RAISE NOTICE 'Mario Rossi -> %', generate_username('Mario', 'Rossi');
  RAISE NOTICE 'Tommaso Langiano -> %', generate_username('Tommaso', 'Langiano');
END $$;
