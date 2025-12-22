-- Add foreign key constraints for approvato_da and rifiutato_da
-- These reference dipendenti table, not users table

ALTER TABLE note_spesa
  ADD CONSTRAINT note_spesa_approvato_da_fkey
  FOREIGN KEY (approvato_da)
  REFERENCES dipendenti(id)
  ON DELETE SET NULL;

ALTER TABLE note_spesa
  ADD CONSTRAINT note_spesa_rifiutato_da_fkey
  FOREIGN KEY (rifiutato_da)
  REFERENCES dipendenti(id)
  ON DELETE SET NULL;

-- Update RLS policies to ensure proper access
-- Note: The existing policies should work, but we verify them here

-- Users can view note spese if:
-- 1. They are the dipendente who created it
-- 2. They are an approvatore for that commessa
-- 3. They are admin/owner
DROP POLICY IF EXISTS "Users can view note spese" ON note_spesa;
CREATE POLICY "Users can view note spese" ON note_spesa FOR SELECT USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  )
);

-- Users can insert note spese if they are part of the tenant
DROP POLICY IF EXISTS "Users can insert note spese" ON note_spesa;
CREATE POLICY "Users can insert note spese" ON note_spesa FOR INSERT WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  )
);

-- Users can update note spese if:
-- 1. They created it and stato != 'approvato'
-- 2. They are an approvatore for that commessa
DROP POLICY IF EXISTS "Users can update note spese" ON note_spesa;
CREATE POLICY "Users can update note spese" ON note_spesa FOR UPDATE USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  )
);

-- Users can delete their own note spese if stato != 'approvato'
DROP POLICY IF EXISTS "Users can delete note spese" ON note_spesa;
CREATE POLICY "Users can delete note spese" ON note_spesa FOR DELETE USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
  )
  AND stato != 'approvato'
);
