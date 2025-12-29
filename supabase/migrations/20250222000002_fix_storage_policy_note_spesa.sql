-- ============================================================================
-- Fix storage policy for note_spesa_allegati bucket
-- The path structure is: {tenant_id}/note-spesa/{commessa_id}/{filename}
-- Not 4 levels as originally designed
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view attachments from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments for their notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own non-approved attachments" ON storage.objects;

-- Policy: SELECT (view attachments)
CREATE POLICY "Users can view attachments from their tenant"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT user_id FROM user_tenants
      WHERE tenant_id::text = (storage.foldername(name))[1]
    )
  );

-- Policy: INSERT (upload attachments)
-- Path structure: {tenant_id}/note-spesa/{commessa_id}/{filename}
CREATE POLICY "Users can upload attachments for their notes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT user_id FROM user_tenants
      WHERE tenant_id::text = (storage.foldername(name))[1]
    )
    -- Validate file extension
    AND lower(storage.extension(name)) IN ('pdf', 'jpg', 'jpeg', 'png', 'webp')
    -- Validate path has at least 3 levels: {tenant_id}/note-spesa/{commessa_id}/
    AND array_length(storage.foldername(name), 1) >= 3
    -- Validate second folder is 'note-spesa'
    AND (storage.foldername(name))[2] = 'note-spesa'
  );

-- Policy: UPDATE (replace attachments)
CREATE POLICY "Users can update own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT user_id FROM user_tenants
      WHERE tenant_id::text = (storage.foldername(name))[1]
    )
  );

-- Policy: DELETE (remove attachments)
CREATE POLICY "Users can delete attachments from their tenant"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT user_id FROM user_tenants
      WHERE tenant_id::text = (storage.foldername(name))[1]
    )
  );
