# Manual Migration Application

Poiché alcune migrazioni causano errori (tabelle/trigger già esistenti), applica questo SQL manualmente tramite Supabase SQL Editor:

## Step 1: Mark existing migrations as applied

```sql
-- Mark migrations as applied in schema_migrations
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20250111000000', 'create_rapportini'),
  ('20250111000001', 'add_user_info_to_rapportini'),
  ('20250111000002', 'add_titolo_archiviata_to_commesse'),
  ('20250111000003', 'create_tenant_profiles'),
  ('20250111000004', 'add_operaio_role')
ON CONFLICT (version) DO NOTHING;
```

## Step 2: Apply the consolidated migration

Dopo aver marcato le migrazioni, esegui il contenuto del file:
`supabase/migrations/20250112000004_apply_all_pending.sql`

Oppure esegui da terminale:

```bash
npx supabase db push
```

Le migrazioni 20250112000000-20250112000003 saranno comunque applicate ma senza errori perché la 004 usa CREATE OR REPLACE e DROP IF EXISTS.

## Alternatively: Apply just the consolidated migration

Se preferisci applicare solo la migrazione consolidata via SQL Editor:

1. Vai su Supabase Dashboard > SQL Editor
2. Copia e incolla il contenuto di `supabase/migrations/20250112000004_apply_all_pending.sql`
3. Esegui
4. Marca tutte le migrazioni come applicate:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20250111000000', 'create_rapportini'),
  ('20250111000001', 'add_user_info_to_rapportini'),
  ('20250111000002', 'add_titolo_archiviata_to_commesse'),
  ('20250111000003', 'create_tenant_profiles'),
  ('20250111000004', 'add_operaio_role'),
  ('20250112000000', 'update_tenant_roles'),
  ('20250112000001', 'update_rls_policies'),
  ('20250112000002', 'create_user_profiles'),
  ('20250112000003', 'update_user_tenants'),
  ('20250112000004', 'apply_all_pending')
ON CONFLICT (version) DO NOTHING;
```

## Verification

Verifica che tutto funzioni:

```sql
-- Check new roles exist
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tenant_role')
ORDER BY enumlabel;

-- Should return: admin, admin_readonly, billing_manager, member, operaio, owner, viewer

-- Check user_profiles table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Check user_tenants new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_tenants'
AND column_name IN ('is_active', 'created_by', 'scopes', 'updated_at');

-- Check helper functions exist
SELECT proname FROM pg_proc
WHERE proname IN ('is_user_active', 'is_user_active_in_tenant', 'has_read_access', 'has_write_access')
ORDER BY proname;
```
