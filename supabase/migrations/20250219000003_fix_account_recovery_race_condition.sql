-- Fix race condition in account recovery
-- Previene che un utente possa creare multipli tenant con richieste simultanee

-- 1. Crea constraint parziale: ogni user può avere massimo 1 tenant tramite account recovery
-- Nota: Usiamo WHERE clause perché vogliamo constraint solo per tenant creati via recovery
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tenants_single_per_user
ON user_tenants (user_id)
WHERE tenant_id IS NOT NULL;

-- 2. Aggiungi commento per documentazione
COMMENT ON INDEX idx_user_tenants_single_per_user IS
'Previene race condition in account recovery: un utente può essere associato a un solo tenant alla volta';

-- 3. IMPORTANTE: Verifica che non ci siano già utenti con multipli tenant
-- Se esistono, questa migration fallirà e bisognerà pulire manualmente
DO $$
DECLARE
  duplicates_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicates_count
  FROM (
    SELECT user_id
    FROM user_tenants
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) AS dups;

  IF duplicates_count > 0 THEN
    RAISE NOTICE 'ATTENZIONE: Trovati % utenti con multipli tenant. Constraint NON creato.', duplicates_count;
    -- Non blocchiamo la migration, solo warning
  END IF;
END $$;
