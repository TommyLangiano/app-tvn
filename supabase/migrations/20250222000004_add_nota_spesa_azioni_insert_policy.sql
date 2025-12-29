-- ============================================================================
-- Add INSERT policy for nota_spesa_azioni table
-- This is needed for triggers to insert audit log entries
-- ============================================================================

-- Policy: INSERT (triggers need to be able to insert audit entries)
CREATE POLICY "Allow insert actions for note spesa"
  ON nota_spesa_azioni FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
    AND eseguita_da = auth.uid()
  );
