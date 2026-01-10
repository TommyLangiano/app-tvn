-- Aggiungi nuove colonne per i costi dettagliati delle commesse
ALTER TABLE public.commesse
ADD COLUMN IF NOT EXISTS costo_vitto numeric DEFAULT 0 CHECK (costo_vitto >= 0),
ADD COLUMN IF NOT EXISTS costo_alloggio numeric DEFAULT 0 CHECK (costo_alloggio >= 0),
ADD COLUMN IF NOT EXISTS costo_carburante numeric DEFAULT 0 CHECK (costo_carburante >= 0),
ADD COLUMN IF NOT EXISTS costi_vari numeric DEFAULT 0 CHECK (costi_vari >= 0);

-- Commento per documentare le colonne
COMMENT ON COLUMN public.commesse.costo_vitto IS 'Costo previsto per vitto nella commessa';
COMMENT ON COLUMN public.commesse.costo_alloggio IS 'Costo previsto per alloggio nella commessa';
COMMENT ON COLUMN public.commesse.costo_carburante IS 'Costo previsto per carburante nella commessa';
COMMENT ON COLUMN public.commesse.costi_vari IS 'Altri costi vari previsti nella commessa';
