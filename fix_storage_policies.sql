-- Fix storage bucket and policies for app-storage

-- Create app-storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-storage',
  'app-storage',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/svg+xml'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view documents in their tenant (app-storage)" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their tenant (app-storage)" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in their tenant (app-storage)" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents in their tenant (app-storage)" ON storage.objects;

-- Create RLS policies for app-storage bucket
CREATE POLICY "Users can view documents in their tenant (app-storage)"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'app-storage'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents to their tenant (app-storage)"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'app-storage'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents in their tenant (app-storage)"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'app-storage'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents in their tenant (app-storage)"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'app-storage'
    AND (storage.foldername(name))[1] IN (
      SELECT tenant_id::text FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%app-storage%'
ORDER BY policyname;
