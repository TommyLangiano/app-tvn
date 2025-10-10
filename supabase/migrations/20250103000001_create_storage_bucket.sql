-- Create storage bucket for fatture documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fatture-documents',
  'fatture-documents',
  true, -- Changed to true to allow public access with RLS
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for fatture-documents bucket
-- Struttura dei file: {tenant_id}/{commessa_id}/{filename}

-- Policy: Users can view files in their tenant
CREATE POLICY "Users can view fatture documents in their tenant"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can upload files to their tenant folders
CREATE POLICY "Users can upload fatture documents to their tenant"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update files in their tenant
CREATE POLICY "Users can update fatture documents in their tenant"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete files in their tenant
CREATE POLICY "Users can delete fatture documents in their tenant"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'fatture-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );
