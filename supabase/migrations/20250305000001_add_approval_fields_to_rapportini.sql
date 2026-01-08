-- Migration: Add approval audit fields to rapportini table
-- Date: 2025-03-05
-- Description: Adds approval tracking fields to match note_spesa structure

-- Add approval audit fields to rapportini
ALTER TABLE public.rapportini
ADD COLUMN IF NOT EXISTS approvato_da uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approvato_il timestamp with time zone,
ADD COLUMN IF NOT EXISTS rifiutato_da uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rifiutato_il timestamp with time zone,
ADD COLUMN IF NOT EXISTS motivo_rifiuto text,
ADD COLUMN IF NOT EXISTS modificato_da uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS modificato_il timestamp with time zone;

-- Add comments for documentation
COMMENT ON COLUMN public.rapportini.approvato_da IS 'User ID who approved the rapportino';
COMMENT ON COLUMN public.rapportini.approvato_il IS 'Timestamp when the rapportino was approved';
COMMENT ON COLUMN public.rapportini.rifiutato_da IS 'User ID who rejected the rapportino';
COMMENT ON COLUMN public.rapportini.rifiutato_il IS 'Timestamp when the rapportino was rejected';
COMMENT ON COLUMN public.rapportini.motivo_rifiuto IS 'Reason for rejection';
COMMENT ON COLUMN public.rapportini.modificato_da IS 'User ID who last modified the rapportino';
COMMENT ON COLUMN public.rapportini.modificato_il IS 'Timestamp when the rapportino was last modified';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rapportini_approvato_da ON public.rapportini(approvato_da);
CREATE INDEX IF NOT EXISTS idx_rapportini_rifiutato_da ON public.rapportini(rifiutato_da);
CREATE INDEX IF NOT EXISTS idx_rapportini_approvato_il ON public.rapportini(approvato_il);
CREATE INDEX IF NOT EXISTS idx_rapportini_modificato_da ON public.rapportini(modificato_da);
CREATE INDEX IF NOT EXISTS idx_rapportini_modificato_il ON public.rapportini(modificato_il);
