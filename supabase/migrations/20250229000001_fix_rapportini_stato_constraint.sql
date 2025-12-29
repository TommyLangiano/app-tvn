-- Fix rapportini stato constraint conflict
-- Drop all existing stato check constraints
ALTER TABLE rapportini
DROP CONSTRAINT IF EXISTS rapportini_stato_check;

-- Add the correct constraint
ALTER TABLE rapportini
ADD CONSTRAINT rapportini_stato_check
CHECK (stato IN ('approvato', 'da_approvare', 'rifiutato'));

-- Add comment
COMMENT ON CONSTRAINT rapportini_stato_check ON rapportini IS 'Valid states: approvato, da_approvare, rifiutato';
