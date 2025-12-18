-- Migration: Drop scontrini table
-- Description: Rimuove completamente la tabella scontrini e tutte le sue dipendenze
-- Date: 2025-02-18

-- Drop table scontrini
DROP TABLE IF EXISTS public.scontrini CASCADE;
