-- Make commessa_id nullable in fatture_attive and fatture_passive
-- This allows creating invoices not linked to a specific commessa

ALTER TABLE fatture_attive
  ALTER COLUMN commessa_id DROP NOT NULL;

ALTER TABLE fatture_passive
  ALTER COLUMN commessa_id DROP NOT NULL;

-- Add index for better query performance on nullable commessa_id
CREATE INDEX IF NOT EXISTS idx_fatture_attive_commessa_id ON fatture_attive(commessa_id) WHERE commessa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fatture_passive_commessa_id ON fatture_passive(commessa_id) WHERE commessa_id IS NOT NULL;

COMMENT ON COLUMN fatture_attive.commessa_id IS 'Optional reference to commessa - can be NULL for invoices not linked to a specific project';
COMMENT ON COLUMN fatture_passive.commessa_id IS 'Optional reference to commessa - can be NULL for invoices not linked to a specific project';
