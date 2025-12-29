-- ============================================================================
-- Fix note_spesa INSERT policy to allow creating notes for team members
-- ============================================================================

-- Drop all existing insert policies
DROP POLICY IF EXISTS "Enhanced insert policy for note_spesa" ON note_spesa;
DROP POLICY IF EXISTS "Users can insert note spese" ON note_spesa;
DROP POLICY IF EXISTS "Users can create note_spesa for their tenant" ON note_spesa;
DROP POLICY IF EXISTS "Users can create note_spesa for their tenant dipendenti" ON note_spesa;

-- Create new INSERT policy that allows creating notes for any dipendente in the user's tenant
CREATE POLICY "Users can create note_spesa for their tenant dipendenti"
  ON note_spesa FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND created_by = auth.uid()
    -- Dipendente must exist in the same tenant
    AND dipendente_id IN (
      SELECT id FROM dipendenti
      WHERE tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    )
  );
