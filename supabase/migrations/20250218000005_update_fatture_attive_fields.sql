-- Migration: Update fatture_attive fields
-- Description: Rinomina e aggiunge campi alle fatture attive
-- Date: 2025-02-18

-- Rinomina data_emissione in data_fattura
ALTER TABLE public.fatture_attive RENAME COLUMN data_emissione TO data_fattura;

-- Rinomina tipologia in categoria
ALTER TABLE public.fatture_attive RENAME COLUMN tipologia TO categoria;

-- Rinomina data_pagamento in scadenza_pagamento
ALTER TABLE public.fatture_attive RENAME COLUMN data_pagamento TO scadenza_pagamento;

-- Aggiungi data_pagamento (data effettiva del pagamento)
ALTER TABLE public.fatture_attive ADD COLUMN IF NOT EXISTS data_pagamento date;

-- Aggiungi note
ALTER TABLE public.fatture_attive ADD COLUMN IF NOT EXISTS note text;

-- Commenta le modifiche
COMMENT ON COLUMN public.fatture_attive.data_fattura IS 'Data di emissione della fattura';
COMMENT ON COLUMN public.fatture_attive.categoria IS 'Categoria/tipologia della fattura';
COMMENT ON COLUMN public.fatture_attive.scadenza_pagamento IS 'Data di scadenza del pagamento';
COMMENT ON COLUMN public.fatture_attive.data_pagamento IS 'Data effettiva del pagamento (visibile solo se pagata)';
COMMENT ON COLUMN public.fatture_attive.note IS 'Note interne sulla fattura';
