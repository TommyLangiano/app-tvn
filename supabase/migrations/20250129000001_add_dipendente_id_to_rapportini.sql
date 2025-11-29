-- Add dipendente_id to rapportini table to support employees without accounts
ALTER TABLE rapportini
ADD COLUMN IF NOT EXISTS dipendente_id UUID REFERENCES dipendenti(id) ON DELETE CASCADE;

-- Make user_id nullable since we'll use either user_id OR dipendente_id
ALTER TABLE rapportini
ALTER COLUMN user_id DROP NOT NULL;

-- Add check constraint to ensure either user_id or dipendente_id is set
ALTER TABLE rapportini
ADD CONSTRAINT rapportini_user_or_dipendente_check
CHECK (
  (user_id IS NOT NULL AND dipendente_id IS NULL) OR
  (user_id IS NULL AND dipendente_id IS NOT NULL)
);

-- Drop the old unique constraint
ALTER TABLE rapportini
DROP CONSTRAINT IF EXISTS rapportini_tenant_id_user_id_commessa_id_data_rapportino_key;

-- Create new unique constraint that works with either user_id or dipendente_id
-- We need two separate constraints because of the NULL handling
CREATE UNIQUE INDEX IF NOT EXISTS rapportini_user_unique
ON rapportini(tenant_id, user_id, commessa_id, data_rapportino)
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rapportini_dipendente_unique
ON rapportini(tenant_id, dipendente_id, commessa_id, data_rapportino)
WHERE dipendente_id IS NOT NULL;

-- Add index for dipendente_id
CREATE INDEX IF NOT EXISTS idx_rapportini_dipendente ON rapportini(dipendente_id);
