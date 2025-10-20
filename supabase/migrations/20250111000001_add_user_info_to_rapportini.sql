-- Add user info columns to rapportini table
ALTER TABLE rapportini
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update existing records with user email (you'll need to update names manually or via app)
-- This is just a placeholder - you can't access auth.users from SQL directly
-- The app will populate these fields when creating rapportini
