# Approval System - Quick Reference Card

## TL;DR - Quick Start

```sql
-- Run this migration
\i supabase/migrations/20250222000001_create_approval_system.sql

-- Enable approval for a commessa
INSERT INTO commesse_impostazioni_approvazione (
  commessa_id, tenant_id, tipo_approvazione, abilitato, approvatori, created_by
) VALUES (
  'your-commessa-uuid',
  'your-tenant-uuid',
  'presenze',
  true,
  ARRAY['approver-dipendente-uuid']::UUID[],
  'your-user-uuid'
);

-- Check if approval required
SELECT richiede_approvazione('commessa-uuid', 'presenze');

-- Get pending approvals
SELECT * FROM rapportini
WHERE stato = 'da_approvare'
  AND commessa_id IN (
    SELECT commessa_id FROM commesse_impostazioni_approvazione
    WHERE tipo_approvazione = 'presenze'
      AND 'your-dipendente-uuid' = ANY(approvatori)
  );

-- Approve/Reject
UPDATE rapportini SET stato = 'approvato' WHERE id = 'rapportino-uuid';
UPDATE rapportini SET stato = 'rifiutato' WHERE id = 'rapportino-uuid';
```

---

## Tables Created

### 1. `note_spesa`
```
Purpose: Expense notes with approval workflow
Key Fields: commessa_id, dipendente_id, importo, categoria, stato
Unique: (tenant_id, dipendente_id, commessa_id, data_nota)
```

### 2. `commesse_impostazioni_approvazione`
```
Purpose: Approval configuration per commessa
Key Fields: commessa_id, tipo_approvazione, abilitato, approvatori[]
Unique: (commessa_id, tipo_approvazione)
```

---

## Key Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **tipo_approvazione** | Type of approval | 'presenze', 'note_spesa' |
| **abilitato** | Toggle approval on/off | true = requires approval |
| **approvatori** | Array of dipendente UUIDs | ARRAY['uuid1', 'uuid2'] |
| **stato** | Approval status | 'approvato', 'da_approvare', 'rifiutato' |

---

## Common Queries

### Check if Approval Required
```sql
SELECT richiede_approvazione('commessa-id', 'presenze');
-- Returns: true/false
```

### Get Approval Settings for Commessa
```sql
SELECT * FROM v_commesse_approvazioni
WHERE commessa_id = 'your-commessa-id';
```

### Get All Pending Items for Approver
```sql
-- Presenze
SELECT r.*, d.nome, d.cognome, c.nome_commessa
FROM rapportini r
JOIN dipendenti d ON d.id = r.dipendente_id
JOIN commesse c ON c.id = r.commessa_id
JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = r.commessa_id
WHERE r.stato = 'da_approvare'
  AND cia.tipo_approvazione = 'presenze'
  AND 'approver-dipendente-uuid' = ANY(cia.approvatori);

-- Note Spesa
SELECT ns.*, d.nome, d.cognome, c.nome_commessa
FROM note_spesa ns
JOIN dipendenti d ON d.id = ns.dipendente_id
JOIN commesse c ON c.id = ns.commessa_id
JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = ns.commessa_id
WHERE ns.stato = 'da_approvare'
  AND cia.tipo_approvazione = 'note_spesa'
  AND 'approver-dipendente-uuid' = ANY(cia.approvatori);
```

### Enable/Disable Approval
```sql
-- Enable
INSERT INTO commesse_impostazioni_approvazione (
  commessa_id, tenant_id, tipo_approvazione, abilitato, approvatori, created_by
) VALUES (
  'commessa-uuid', 'tenant-uuid', 'presenze', true,
  ARRAY['approver1', 'approver2']::UUID[], 'user-uuid'
)
ON CONFLICT (commessa_id, tipo_approvazione)
DO UPDATE SET abilitato = true, approvatori = EXCLUDED.approvatori;

-- Disable
UPDATE commesse_impostazioni_approvazione
SET abilitato = false
WHERE commessa_id = 'commessa-uuid'
  AND tipo_approvazione = 'presenze';
```

### Manage Approvers
```sql
-- Add approver
UPDATE commesse_impostazioni_approvazione
SET approvatori = array_append(approvatori, 'new-approver-uuid'::UUID)
WHERE commessa_id = 'commessa-uuid' AND tipo_approvazione = 'presenze';

-- Remove approver
UPDATE commesse_impostazioni_approvazione
SET approvatori = array_remove(approvatori, 'approver-uuid'::UUID)
WHERE commessa_id = 'commessa-uuid' AND tipo_approvazione = 'presenze';

-- Replace all approvers
UPDATE commesse_impostazioni_approvazione
SET approvatori = ARRAY['uuid1', 'uuid2']::UUID[]
WHERE commessa_id = 'commessa-uuid' AND tipo_approvazione = 'presenze';
```

### Approve/Reject
```sql
-- Approve
UPDATE rapportini
SET stato = 'approvato', updated_at = NOW()
WHERE id = 'rapportino-uuid';

-- Reject
UPDATE rapportini
SET stato = 'rifiutato', updated_at = NOW()
WHERE id = 'rapportino-uuid';
```

---

## TypeScript Examples

### Check if Approval Required
```typescript
const { data: requiresApproval } = await supabase
  .rpc('richiede_approvazione', {
    p_commessa_id: commessaId,
    p_tipo_approvazione: 'presenze'
  });

const stato = requiresApproval ? 'da_approvare' : 'approvato';
```

### Get Approval Settings
```typescript
const { data: settings } = await supabase
  .from('commesse_impostazioni_approvazione')
  .select('*')
  .eq('commessa_id', commessaId);

const presenzeEnabled = settings?.find(s => s.tipo_approvazione === 'presenze')?.abilitato || false;
```

### Update Approval Settings
```typescript
await supabase
  .from('commesse_impostazioni_approvazione')
  .upsert({
    commessa_id: commessaId,
    tenant_id: tenantId,
    tipo_approvazione: 'presenze',
    abilitato: true,
    approvatori: ['uuid1', 'uuid2'],
    created_by: userId
  }, {
    onConflict: 'commessa_id,tipo_approvazione'
  });
```

### Get Pending Approvals
```typescript
const { data: pending } = await supabase
  .from('rapportini')
  .select(`
    *,
    dipendente:dipendenti(nome, cognome),
    commessa:commesse(nome_commessa)
  `)
  .eq('stato', 'da_approvare');
```

### Approve Item
```typescript
await supabase
  .from('rapportini')
  .update({ stato: 'approvato' })
  .eq('id', rapportinoId);
```

---

## React Component Snippets

### Settings Toggle
```tsx
<Switch
  checked={approvalEnabled}
  onCheckedChange={(checked) => {
    // Update approval settings
    updateSettings({ tipo: 'presenze', enabled: checked });
  }}
/>
```

### Approver Multi-Select
```tsx
<MultiSelect
  options={dipendenti.map(d => ({
    value: d.id,
    label: `${d.nome} ${d.cognome}`
  }))}
  value={selectedApprovers}
  onChange={setSelectedApprovers}
/>
```

### Pending Approvals List
```tsx
{pendingPresenze.map(item => (
  <div key={item.id} className="approval-card">
    <div>{item.dipendente.nome} {item.dipendente.cognome}</div>
    <div>{item.ore_lavorate}h - {item.data_rapportino}</div>
    <button onClick={() => approve(item.id)}>Approva</button>
    <button onClick={() => reject(item.id)}>Rifiuta</button>
  </div>
))}
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/commesse/{id}/approval-settings` | Get settings |
| PUT | `/api/commesse/{id}/approval-settings` | Update settings |
| GET | `/api/approvals/pending` | Get pending items |
| POST | `/api/rapportini/{id}/approve` | Approve/reject |
| POST | `/api/note-spesa/{id}/approve` | Approve/reject |

---

## Index Reference

| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `idx_approvazione_commessa` | commesse_impostazioni_approvazione | commessa_id | Fast lookup |
| `idx_approvazione_approvatori` | commesse_impostazioni_approvazione | approvatori (GIN) | Array search |
| `idx_note_spesa_stato` | note_spesa | stato | Filter pending |
| `idx_rapportini_stato` | rapportini | stato | Filter pending |

---

## Workflow States

```
Create Item
    │
    ├─→ Approval Disabled → stato: 'approvato' (FINAL)
    │
    └─→ Approval Enabled → stato: 'da_approvare'
            │
            ├─→ Approver Approves → stato: 'approvato' (FINAL)
            │
            └─→ Approver Rejects → stato: 'rifiutato'
                    │
                    └─→ User Edits & Resubmits → stato: 'da_approvare'
```

---

## RLS Policies

All tables have these policies:
- SELECT: User's tenant only
- INSERT: User's tenant + created_by = auth.uid()
- UPDATE: User's tenant
- DELETE: User's tenant

---

## Common Gotchas

1. **Array Queries**: Use `= ANY(array)` not `IN (array)`
   ```sql
   -- CORRECT
   WHERE 'uuid' = ANY(approvatori)

   -- WRONG
   WHERE 'uuid' IN approvatori
   ```

2. **UPSERT Conflict**: Must specify both columns
   ```sql
   ON CONFLICT (commessa_id, tipo_approvazione) DO UPDATE ...
   ```

3. **Null Approvers**: Default is `'{}'` not `NULL`
   ```sql
   approvatori UUID[] DEFAULT '{}'
   ```

4. **Stato Values**: Must match exactly (case-sensitive)
   ```sql
   -- CORRECT
   stato = 'da_approvare'

   -- WRONG
   stato = 'da approvare'
   stato = 'pending'
   ```

---

## Debugging Tips

### Check if Settings Exist
```sql
SELECT * FROM commesse_impostazioni_approvazione
WHERE commessa_id = 'your-uuid';
```

### Check Approver Membership
```sql
SELECT
  cia.commessa_id,
  cia.tipo_approvazione,
  'your-dipendente-uuid' = ANY(cia.approvatori) as is_approver
FROM commesse_impostazioni_approvazione cia;
```

### Count Pending Items
```sql
SELECT
  tipo_approvazione,
  COUNT(*) as pending_count
FROM (
  SELECT 'presenze' as tipo_approvazione FROM rapportini WHERE stato = 'da_approvare'
  UNION ALL
  SELECT 'note_spesa' FROM note_spesa WHERE stato = 'da_approvare'
) counts
GROUP BY tipo_approvazione;
```

### Test Approval Function
```sql
-- Should return true if enabled
SELECT richiede_approvazione('commessa-uuid', 'presenze');

-- Should return false if disabled or not configured
SELECT richiede_approvazione('unknown-commessa', 'presenze');
```

---

## Migration Rollback (If Needed)

```sql
-- WARNING: This will delete all approval settings and note_spesa data!

DROP TABLE IF EXISTS note_spesa CASCADE;
DROP TABLE IF EXISTS commesse_impostazioni_approvazione CASCADE;
DROP FUNCTION IF EXISTS richiede_approvazione(UUID, TEXT) CASCADE;
DROP VIEW IF EXISTS v_commesse_approvazioni CASCADE;
```

---

## Next Steps After Migration

1. ✅ Run migration file
2. ✅ Verify tables exist: `\dt` in psql
3. ✅ Test helper function: `SELECT richiede_approvazione(...)`
4. ✅ Create UI components for settings toggle
5. ✅ Create UI for pending approvals list
6. ✅ Add API routes for approval actions
7. ✅ Test end-to-end workflow
8. ✅ Add notifications (optional)
9. ✅ Add approval history logging (optional)

---

## Performance Benchmarks (Expected)

| Query | Rows | Time | Index Used |
|-------|------|------|------------|
| Get settings for 1 commessa | 2 | <5ms | idx_approvazione_commessa |
| Get pending items (100 rows) | 100 | <50ms | idx_rapportini_stato + tenant |
| Check if approver (10K commesse) | 1 | <10ms | idx_approvazione_approvatori (GIN) |
| Approve item | 1 | <10ms | Primary key |

---

## Support & Resources

- **Schema Docs**: `/docs/approval-system-schema.md`
- **Architecture**: `/docs/approval-system-architecture.md`
- **API Guide**: `/docs/approval-system-api-guide.md`
- **Migration File**: `/supabase/migrations/20250222000001_create_approval_system.sql`

---

## Quick Health Check

```sql
-- Run this to verify everything is working
SELECT
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_name IN ('note_spesa', 'commesse_impostazioni_approvazione')
UNION ALL
SELECT
  'Indexes',
  COUNT(*)
FROM pg_indexes
WHERE tablename IN ('note_spesa', 'commesse_impostazioni_approvazione')
UNION ALL
SELECT
  'Functions',
  COUNT(*)
FROM pg_proc
WHERE proname = 'richiede_approvazione'
UNION ALL
SELECT
  'Views',
  COUNT(*)
FROM pg_views
WHERE viewname = 'v_commesse_approvazioni';

-- Expected results:
-- Tables: 2
-- Indexes: 11+
-- Functions: 1
-- Views: 1
```

---

**Happy Coding!** 🚀
