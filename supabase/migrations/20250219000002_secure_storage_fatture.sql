-- Abilita RLS sul bucket app-storage per le fatture
-- Questo impedisce l'accesso pubblico ai file

-- Prima verifica che il bucket esista
DO $$
BEGIN
    -- Aggiorna il bucket per renderlo privato (non pubblico)
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'app-storage';
END $$;

-- Abilita RLS sul bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo i file del loro tenant
CREATE POLICY "Users can view files from their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'app-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM user_tenants
    WHERE user_id = auth.uid()
  )
);

-- Policy per permettere agli utenti di caricare file solo nel loro tenant
CREATE POLICY "Users can upload files to their tenant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'app-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM user_tenants
    WHERE user_id = auth.uid()
  )
);

-- Policy per permettere agli utenti di aggiornare file solo nel loro tenant
CREATE POLICY "Users can update files from their tenant"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'app-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM user_tenants
    WHERE user_id = auth.uid()
  )
);

-- Policy per permettere agli utenti di eliminare file solo nel loro tenant
CREATE POLICY "Users can delete files from their tenant"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'app-storage'
  AND (storage.foldername(name))[1] IN (
    SELECT tenant_id::text
    FROM user_tenants
    WHERE user_id = auth.uid()
  )
);
