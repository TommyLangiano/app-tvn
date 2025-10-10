-- Update storage policies to support new folder structure
-- New structure:
-- {tenant_id}/fatture/attive/{commessa_id}/{filename}
-- {tenant_id}/fatture/passive/{commessa_id}/{filename}
-- {tenant_id}/scontrini/{commessa_id}/{filename}
-- {tenant_id}/commesse/documenti/{commessa_id}/{filename}
-- {tenant_id}/commesse/immagini/{commessa_id}/{filename}
-- {tenant_id}/profili/{user_id}/{filename}

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view fatture documents in their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload fatture documents to their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can update fatture documents in their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete fatture documents in their tenant" ON storage.objects;

-- Recreate policies with support for subfolder structure
-- The first folder is always tenant_id, so we check that

-- Policy: Users can view files in their tenant (any subfolder)
CREATE POLICY "Users can view documents in their tenant"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can upload files to their tenant folders (any subfolder)
CREATE POLICY "Users can upload documents to their tenant"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update files in their tenant (any subfolder)
CREATE POLICY "Users can update documents in their tenant"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete files in their tenant (any subfolder)
CREATE POLICY "Users can delete documents in their tenant"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );
