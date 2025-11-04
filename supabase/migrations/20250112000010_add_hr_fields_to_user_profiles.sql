-- Add HR fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS hire_date DATE,
ADD COLUMN IF NOT EXISTS medical_checkup_date DATE,
ADD COLUMN IF NOT EXISTS medical_checkup_expiry DATE,
ADD COLUMN IF NOT EXISTS document_path TEXT;

-- Add comments
COMMENT ON COLUMN public.user_profiles.birth_date IS 'Data di nascita del dipendente';
COMMENT ON COLUMN public.user_profiles.hire_date IS 'Data di assunzione del dipendente';
COMMENT ON COLUMN public.user_profiles.medical_checkup_date IS 'Data della visita medica';
COMMENT ON COLUMN public.user_profiles.medical_checkup_expiry IS 'Data di scadenza della visita medica';
COMMENT ON COLUMN public.user_profiles.document_path IS 'Path to user document in storage (CV or other documents)';
