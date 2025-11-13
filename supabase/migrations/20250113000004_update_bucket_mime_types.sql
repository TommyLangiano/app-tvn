-- Update app-storage bucket to support SVG for logos
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/svg+xml'  -- Added for company logos
]
WHERE id = 'app-storage';
