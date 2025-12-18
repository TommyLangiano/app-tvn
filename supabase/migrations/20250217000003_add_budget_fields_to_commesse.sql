-- Add budget and costo_materiali fields to commesse table if they don't exist
ALTER TABLE public.commesse
ADD COLUMN IF NOT EXISTS budget_commessa numeric,
ADD COLUMN IF NOT EXISTS costo_materiali numeric;
