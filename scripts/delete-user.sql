-- Script per eliminare un utente e tutti i suoi dati
-- ATTENZIONE: Questa operazione è IRREVERSIBILE!
--
-- Uso:
-- 1. Sostituisci 'EMAIL_DA_ELIMINARE' con l'email dell'utente
-- 2. Esegui questo script nel SQL Editor di Supabase
-- 3. Oppure via psql: psql [CONNECTION_STRING] -f delete-user.sql

DO $$
DECLARE
  user_email TEXT := 'EMAIL_DA_ELIMINARE'; -- CAMBIA QUI
  user_uuid UUID;
  deleted_count INT;
BEGIN
  -- Trova l'user_id dall'email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;

  -- Controlla se l'utente esiste
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'Utente con email % non trovato', user_email;
  END IF;

  RAISE NOTICE '🔍 Trovato utente: % (ID: %)', user_email, user_uuid;

  -- 1. Elimina da user_tenants
  DELETE FROM user_tenants WHERE user_id = user_uuid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Eliminati % record da user_tenants', deleted_count;

  -- 2. Elimina da user_profiles
  DELETE FROM user_profiles WHERE user_id = user_uuid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Eliminati % record da user_profiles', deleted_count;

  -- 3. Elimina rapportini dell'utente
  DELETE FROM rapportini WHERE user_id = user_uuid OR created_by = user_uuid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Eliminati % rapportini', deleted_count;

  -- 4. Elimina da dipendenti se è un dipendente
  DELETE FROM dipendenti WHERE user_id = user_uuid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Eliminati % record da dipendenti', deleted_count;

  -- 5. Elimina da auth.users (Supabase Auth)
  DELETE FROM auth.users WHERE id = user_uuid;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Eliminati % record da auth.users', deleted_count;

  RAISE NOTICE '🎉 Utente % eliminato completamente!', user_email;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Errore durante eliminazione: %', SQLERRM;
END $$;
