-- Revert fatture-documents bucket to private
-- Files will be accessed via signed URLs with proper authentication
UPDATE storage.buckets
SET public = false
WHERE id = 'fatture-documents';
