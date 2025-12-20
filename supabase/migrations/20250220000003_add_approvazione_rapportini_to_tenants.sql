-- Migration: Add richiede_approvazione_rapportini to tenants table
-- Date: 2025-02-20
-- Description: Aggiunge campo per configurare se i rapportini richiedono approvazione manuale

-- Add column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS richiede_approvazione_rapportini boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.richiede_approvazione_rapportini IS
'Se true, i rapportini inseriti dai dipendenti richiedono approvazione (stato = richiesto). Se false, vengono automaticamente approvati (stato = approvato).';

-- Update existing tenants to have default value
UPDATE public.tenants
SET richiede_approvazione_rapportini = false
WHERE richiede_approvazione_rapportini IS NULL;
