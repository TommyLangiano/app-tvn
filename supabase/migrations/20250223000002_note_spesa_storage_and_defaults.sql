-- ============================================================================
-- Migration: Note Spesa Storage Bucket and Default Categories
-- Date: 2025-02-23
-- Description:
--   - Creates storage bucket for expense note attachments
--   - Adds storage policies for secure file access
--   - Creates function to seed default categories for new tenants
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE STORAGE BUCKET
-- ============================================================================

-- Create bucket for expense note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note_spesa_allegati',
  'note_spesa_allegati',
  false, -- Private bucket
  10485760, -- 10MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: STORAGE POLICIES
-- ============================================================================

-- Policy: SELECT (view attachments)
CREATE POLICY "Users can view attachments from their tenant"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT user_id FROM user_tenants
      WHERE tenant_id::text = (storage.foldername(name))[1]
    )
  );

-- Policy: INSERT (upload attachments)
CREATE POLICY "Users can upload attachments for their notes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT user_id FROM user_tenants
      WHERE tenant_id::text = (storage.foldername(name))[1]
    )
    -- Validate file extension
    AND lower(storage.extension(name)) IN ('pdf', 'jpg', 'jpeg', 'png', 'webp')
    -- Validate path structure: {tenant_id}/{commessa_id}/{nota_spesa_id}/{filename}
    AND array_length(storage.foldername(name), 1) = 4
  );

-- Policy: UPDATE (replace attachments)
CREATE POLICY "Users can update own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT created_by FROM note_spesa
      WHERE tenant_id::text = (storage.foldername(name))[1]
        AND id::text = (storage.foldername(name))[3]
        AND stato IN ('bozza', 'da_approvare', 'rifiutato')
    )
  );

-- Policy: DELETE (remove attachments)
CREATE POLICY "Users can delete own non-approved attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note_spesa_allegati'
    AND auth.uid() IN (
      SELECT created_by FROM note_spesa
      WHERE tenant_id::text = (storage.foldername(name))[1]
        AND id::text = (storage.foldername(name))[3]
        AND stato IN ('bozza', 'da_approvare', 'rifiutato')
    )
  );

-- ============================================================================
-- PART 3: FUNCTION TO SEED DEFAULT CATEGORIES
-- ============================================================================

-- Function to create default expense categories for a tenant
CREATE OR REPLACE FUNCTION crea_categorie_default_note_spesa(
  p_tenant_id UUID,
  p_created_by UUID
) RETURNS VOID AS $$
BEGIN
  -- Insert default categories
  INSERT INTO categorie_note_spesa (
    tenant_id, nome, codice, descrizione, colore, icona,
    richiede_allegato, importo_massimo, ordinamento, created_by
  )
  VALUES
    (
      p_tenant_id, 'Trasporti', 'TRASPORTI',
      'Taxi, carburante, parcheggi, pedaggi, mezzi pubblici',
      '#3B82F6', 'Car',
      true, NULL, 1, p_created_by
    ),
    (
      p_tenant_id, 'Vitto', 'VITTO',
      'Ristoranti, pranzi di lavoro, colazioni',
      '#10B981', 'Utensils',
      true, 50.00, 2, p_created_by
    ),
    (
      p_tenant_id, 'Alloggio', 'ALLOGGIO',
      'Hotel, B&B, appartamenti',
      '#F59E0B', 'Hotel',
      true, NULL, 3, p_created_by
    ),
    (
      p_tenant_id, 'Materiali e Forniture', 'MATERIALI',
      'Acquisto materiali, attrezzature, forniture',
      '#8B5CF6', 'Package',
      true, NULL, 4, p_created_by
    ),
    (
      p_tenant_id, 'Formazione', 'FORMAZIONE',
      'Corsi, libri tecnici, certificazioni',
      '#EC4899', 'GraduationCap',
      true, NULL, 5, p_created_by
    ),
    (
      p_tenant_id, 'Comunicazione', 'COMUNICAZIONE',
      'Telefono, internet, spese telefoniche',
      '#06B6D4', 'Phone',
      true, 100.00, 6, p_created_by
    ),
    (
      p_tenant_id, 'Rappresentanza', 'RAPPRESENTANZA',
      'Omaggi clienti, spese di rappresentanza',
      '#F97316', 'Gift',
      true, 200.00, 7, p_created_by
    ),
    (
      p_tenant_id, 'Altro', 'ALTRO',
      'Altre spese non classificate',
      '#6B7280', 'Receipt',
      false, NULL, 99, p_created_by
    )
  ON CONFLICT (tenant_id, codice) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION crea_categorie_default_note_spesa IS
'Creates default expense categories for a new tenant';

-- ============================================================================
-- PART 4: TRIGGER TO AUTO-CREATE CATEGORIES FOR NEW TENANTS
-- ============================================================================

-- Function to auto-create categories when tenant is created
CREATE OR REPLACE FUNCTION trigger_crea_categorie_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default categories for new tenant
  PERFORM crea_categorie_default_note_spesa(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on tenants table (if it exists)
DROP TRIGGER IF EXISTS after_tenant_insert_create_categories ON tenants;
CREATE TRIGGER after_tenant_insert_create_categories
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_crea_categorie_tenant();

-- ============================================================================
-- PART 5: SEED CATEGORIES FOR EXISTING TENANTS (ONE-TIME)
-- ============================================================================

-- Create categories for all existing tenants that don't have them yet
DO $$
DECLARE
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN
    SELECT t.id, t.created_by
    FROM tenants t
    WHERE NOT EXISTS (
      SELECT 1 FROM categorie_note_spesa
      WHERE tenant_id = t.id
    )
  LOOP
    PERFORM crea_categorie_default_note_spesa(v_tenant.id, v_tenant.created_by);
  END LOOP;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
