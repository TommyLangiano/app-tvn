-- Create new app-storage bucket (keeping fatture-documents for migration)
-- This migration creates the new bucket alongside the old one
-- Files will be migrated manually, then the old bucket will be dropped

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
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for app-storage bucket
-- These mirror the existing fatture-documents policies

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

-- Bucket structure: {tenant_id}/{category}/{filename}
-- Categories: logos, fatture, documenti, rapportini, etc.
