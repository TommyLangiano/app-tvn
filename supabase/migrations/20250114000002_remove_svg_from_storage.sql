-- Remove SVG from allowed MIME types to prevent XSS attacks
-- SVG files can contain embedded JavaScript

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
]
WHERE id = 'app-storage';
