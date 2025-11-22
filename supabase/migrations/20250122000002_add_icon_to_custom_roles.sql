-- Add icon column to custom_roles table
ALTER TABLE custom_roles
  ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Lock';

-- Comment
COMMENT ON COLUMN custom_roles.icon IS 'Nome icona Lucide da usare per visualizzare il ruolo';
