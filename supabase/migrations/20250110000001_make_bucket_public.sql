-- Update app-storage bucket to be public
-- This allows accessing files via public URLs while still protected by RLS policies
UPDATE storage.buckets
SET public = true
WHERE id = 'app-storage';
