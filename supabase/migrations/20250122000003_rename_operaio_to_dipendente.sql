-- Rinomina ruolo "Operaio" in "Dipendente" per renderlo più generico
-- Questo software deve essere usabile da qualsiasi tipo di azienda, non solo edilizia

-- Aggiorna il nome e la descrizione del ruolo
UPDATE custom_roles
SET
  name = 'Dipendente',
  description = 'Accesso base per dipendenti - dashboard dedicata con rapportini e attivita assegnate',
  system_role_key = 'dipendente'
WHERE system_role_key = 'operaio'
  AND is_system_role = TRUE;

-- Aggiorna il vincolo CHECK per accettare 'dipendente' invece di 'operaio'
ALTER TABLE custom_roles
  DROP CONSTRAINT IF EXISTS system_role_key_valid;

ALTER TABLE custom_roles
  ADD CONSTRAINT system_role_key_valid CHECK (
    system_role_key IS NULL OR
    system_role_key IN ('owner', 'admin', 'admin_readonly', 'dipendente')
  );

-- Aggiorna il commento
COMMENT ON COLUMN custom_roles.system_role_key IS 'Chiave univoca per ruoli sistema: owner, admin, admin_readonly, dipendente';
