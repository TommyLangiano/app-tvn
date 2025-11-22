-- Add tempo_pausa column to rapportini table
-- This stores the break time in minutes (e.g., 60 for 1 hour, 90 for 1.5 hours, 0 for no break)

ALTER TABLE rapportini
  ADD COLUMN IF NOT EXISTS tempo_pausa INTEGER DEFAULT 60 CHECK (tempo_pausa >= 0 AND tempo_pausa <= 480);

-- Comment
COMMENT ON COLUMN rapportini.tempo_pausa IS 'Tempo di pausa in minuti (0 = nessuna pausa, 60 = 1 ora, 90 = 1 ora e 30 min)';
