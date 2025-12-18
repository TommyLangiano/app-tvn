-- Funzione Postgres per signup atomico
-- Previene orphan users se la creazione del tenant fallisce

-- NOTA: Questa funzione è preparata ma NON USATA nel codice attuale
-- Per usarla, modificare /api/auth/signup per chiamare questa RPC invece di admin.createUser
-- Esempio: const { data } = await supabase.rpc('atomic_signup', { ... })

CREATE OR REPLACE FUNCTION atomic_signup(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_company_name TEXT
) RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_full_name TEXT;
  v_result JSON;
BEGIN
  v_full_name := p_first_name || ' ' || p_last_name;

  -- IMPORTANTE: Questa funzione richiede che l'auth user sia già creato
  -- dalla API usando admin.createUser PRIMA di chiamare questa RPC
  -- Quindi serve per la parte tenant/profile, non per l'auth user

  -- Per ora, questa funzione serve come TEMPLATE per future implementazioni
  -- Il vero fix richiede gestione Supabase Auth che non può essere in RPC Postgres

  RAISE NOTICE 'Atomic signup template - not yet implemented';
  RAISE EXCEPTION 'Use API signup endpoint instead';

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commento esplicativo
COMMENT ON FUNCTION atomic_signup IS
'TEMPLATE per signup atomico. Non ancora implementato.
Il problema del rollback atomico richiede coordinamento tra Supabase Auth (esterno)
e Postgres (interno). Soluzione attuale: try-catch in API con rollback manuale.';
