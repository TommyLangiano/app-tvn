-- Revert app-storage bucket to private
-- Files will be accessed via signed URLs with proper authentication
UPDATE storage.buckets
SET public = false
WHERE id = 'app-storage';
