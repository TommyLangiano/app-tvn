-- Add avatar_url column to dipendenti table
ALTER TABLE dipendenti ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment
COMMENT ON COLUMN dipendenti.avatar_url IS 'Path to avatar image in app-storage bucket: {tenant_id}/avatars/dipendenti/{dipendente_id}.webp';
