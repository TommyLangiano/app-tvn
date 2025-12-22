# Commessa-Level Approval System - Database Schema

## Overview

This document describes the database schema for the commessa-level approval system supporting:
- **Approvazione Presenze** (Timesheet/Attendance Approval)
- **Approvazione Note Spesa** (Expense Note Approval)

## Architecture Decision

**Chosen Approach:** Separate configuration table (`commesse_impostazioni_approvazione`)

### Why This Design?

1. **Scalability**: Easy to add new approval types without ALTER TABLE operations
2. **Flexibility**: Type-specific metadata can be added without cluttering commesse table
3. **Performance**: Filtered queries on approval settings don't impact commesse table
4. **Separation of Concerns**: Keeps commesse table focused on core project data
5. **Multi-tenant Safety**: Explicit tenant_id prevents cross-tenant data leaks

## Database Schema

### 1. New Table: `note_spesa`

Expense notes table matching the `rapportini` structure:

```sql
CREATE TABLE note_spesa (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  commessa_id UUID NOT NULL,
  dipendente_id UUID NOT NULL,
  data_nota DATE NOT NULL,
  importo NUMERIC(10,2) NOT NULL,
  categoria TEXT NOT NULL,
  descrizione TEXT,
  allegato_url TEXT,
  stato TEXT DEFAULT 'approvato' CHECK (stato IN ('approvato', 'da_approvare', 'rifiutato')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  UNIQUE(tenant_id, dipendente_id, commessa_id, data_nota)
);
```

**Key Features:**
- One expense note per employee per day per commessa
- Same approval states as rapportini: `approvato`, `da_approvare`, `rifiutato`
- Categories: Trasporto, Vitto, Alloggio, Materiali, Altro
- Optional receipt attachment via `allegato_url`

**Indexes:**
- `idx_note_spesa_tenant` - Fast tenant filtering
- `idx_note_spesa_commessa` - Fast commessa lookups
- `idx_note_spesa_dipendente` - Fast employee lookups
- `idx_note_spesa_stato` - Fast approval status filtering
- `idx_note_spesa_tenant_data` - Composite index for date range queries

### 2. New Table: `commesse_impostazioni_approvazione`

Approval configuration per commessa:

```sql
CREATE TABLE commesse_impostazioni_approvazione (
  id UUID PRIMARY KEY,
  commessa_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  tipo_approvazione TEXT NOT NULL CHECK (tipo_approvazione IN ('presenze', 'note_spesa')),
  abilitato BOOLEAN DEFAULT false,
  approvatori UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  UNIQUE(commessa_id, tipo_approvazione)
);
```

**Key Features:**
- One configuration per commessa per approval type
- `tipo_approvazione`: Extensible enum ('presenze', 'note_spesa')
- `abilitato`: Toggle approval requirement on/off
- `approvatori`: Array of dipendente_id UUIDs (supports multiple approvers)
- Any approver in the list can approve the request

**Indexes:**
- `idx_approvazione_commessa` - Fast commessa lookups
- `idx_approvazione_tenant` - Fast tenant filtering
- `idx_approvazione_tipo` - Fast type filtering
- `idx_approvazione_approvatori` (GIN) - Efficient array queries

### 3. Helper Function: `richiede_approvazione()`

Check if approval is required:

```sql
SELECT richiede_approvazione('commessa-uuid', 'presenze');
-- Returns: true/false
```

### 4. Helper View: `v_commesse_approvazioni`

Denormalized view combining approval settings with commessa details:

```sql
SELECT * FROM v_commesse_approvazioni
WHERE tenant_id = 'your-tenant-id'
  AND tipo_approvazione = 'presenze'
  AND abilitato = true;
```

Returns:
- All approval configuration fields
- Commessa name, code, client
- Count of approvers

## Usage Examples

### 1. Enable Approval for Presenze on a Commessa

```sql
INSERT INTO commesse_impostazioni_approvazione (
  commessa_id,
  tenant_id,
  tipo_approvazione,
  abilitato,
  approvatori,
  created_by
) VALUES (
  'commessa-uuid',
  'tenant-uuid',
  'presenze',
  true,
  ARRAY['dipendente-uuid-1', 'dipendente-uuid-2']::UUID[],
  'user-uuid'
)
ON CONFLICT (commessa_id, tipo_approvazione)
DO UPDATE SET
  abilitato = EXCLUDED.abilitato,
  approvatori = EXCLUDED.approvatori,
  updated_at = NOW();
```

### 2. Check if Approval is Required

```sql
-- Check if presenze approval is required for a commessa
SELECT richiede_approvazione('commessa-uuid', 'presenze');
```

### 3. Get All Commesse Requiring Approval

```sql
SELECT
  c.id,
  c.nome_commessa,
  cia.tipo_approvazione,
  cia.approvatori
FROM commesse c
JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = c.id
WHERE cia.tenant_id = 'your-tenant-id'
  AND cia.abilitato = true;
```

### 4. Get Pending Approvals for a Specific Approver

**For Presenze:**
```sql
SELECT
  r.id,
  r.data_rapportino,
  r.ore_lavorate,
  d.nome || ' ' || d.cognome as dipendente,
  c.nome_commessa
FROM rapportini r
JOIN dipendenti d ON d.id = r.dipendente_id
JOIN commesse c ON c.id = r.commessa_id
JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = r.commessa_id
WHERE r.tenant_id = 'tenant-uuid'
  AND r.stato = 'da_approvare'
  AND cia.tipo_approvazione = 'presenze'
  AND cia.abilitato = true
  AND 'approver-dipendente-uuid' = ANY(cia.approvatori);
```

**For Note Spesa:**
```sql
SELECT
  ns.id,
  ns.data_nota,
  ns.importo,
  ns.categoria,
  d.nome || ' ' || d.cognome as dipendente,
  c.nome_commessa
FROM note_spesa ns
JOIN dipendenti d ON d.id = ns.dipendente_id
JOIN commesse c ON c.id = ns.commessa_id
JOIN commesse_impostazioni_approvazione cia ON cia.commessa_id = ns.commessa_id
WHERE ns.tenant_id = 'tenant-uuid'
  AND ns.stato = 'da_approvare'
  AND cia.tipo_approvazione = 'note_spesa'
  AND cia.abilitato = true
  AND 'approver-dipendente-uuid' = ANY(cia.approvatori);
```

### 5. Approve/Reject a Rapportino

```sql
-- Approve
UPDATE rapportini
SET stato = 'approvato', updated_at = NOW()
WHERE id = 'rapportino-uuid'
  AND tenant_id = 'tenant-uuid';

-- Reject
UPDATE rapportini
SET stato = 'rifiutato', updated_at = NOW()
WHERE id = 'rapportino-uuid'
  AND tenant_id = 'tenant-uuid';
```

### 6. Create a Note Spesa with Approval

```sql
INSERT INTO note_spesa (
  tenant_id,
  commessa_id,
  dipendente_id,
  data_nota,
  importo,
  categoria,
  descrizione,
  stato,
  created_by
) VALUES (
  'tenant-uuid',
  'commessa-uuid',
  'dipendente-uuid',
  '2025-02-22',
  150.00,
  'Trasporto',
  'Taxi per cantiere',
  -- If approval is required, use 'da_approvare', otherwise 'approvato'
  CASE
    WHEN richiede_approvazione('commessa-uuid', 'note_spesa') THEN 'da_approvare'
    ELSE 'approvato'
  END,
  'user-uuid'
);
```

### 7. Disable Approval for a Commessa

```sql
UPDATE commesse_impostazioni_approvazione
SET abilitato = false, updated_at = NOW()
WHERE commessa_id = 'commessa-uuid'
  AND tipo_approvazione = 'presenze';
```

### 8. Add/Remove Approvers

```sql
-- Add an approver
UPDATE commesse_impostazioni_approvazione
SET
  approvatori = array_append(approvatori, 'new-dipendente-uuid'::UUID),
  updated_at = NOW()
WHERE commessa_id = 'commessa-uuid'
  AND tipo_approvazione = 'presenze';

-- Remove an approver
UPDATE commesse_impostazioni_approvazione
SET
  approvatori = array_remove(approvatori, 'dipendente-uuid-to-remove'::UUID),
  updated_at = NOW()
WHERE commessa_id = 'commessa-uuid'
  AND tipo_approvazione = 'presenze';

-- Replace all approvers
UPDATE commesse_impostazioni_approvazione
SET
  approvatori = ARRAY['dipendente-uuid-1', 'dipendente-uuid-2']::UUID[],
  updated_at = NOW()
WHERE commessa_id = 'commessa-uuid'
  AND tipo_approvazione = 'presenze';
```

## Application Logic Examples

### Frontend: Commessa Settings Page (TypeScript)

```typescript
// Get approval settings for a commessa
async function getApprovalSettings(commessaId: string) {
  const { data, error } = await supabase
    .from('commesse_impostazioni_approvazione')
    .select('*')
    .eq('commessa_id', commessaId);

  return data;
}

// Update approval settings
async function updateApprovalSettings(
  commessaId: string,
  tenantId: string,
  tipo: 'presenze' | 'note_spesa',
  abilitato: boolean,
  approvatori: string[]
) {
  const { data, error } = await supabase
    .from('commesse_impostazioni_approvazione')
    .upsert({
      commessa_id: commessaId,
      tenant_id: tenantId,
      tipo_approvazione: tipo,
      abilitato: abilitato,
      approvatori: approvatori,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }, {
      onConflict: 'commessa_id,tipo_approvazione'
    });

  return { data, error };
}
```

### Backend: Auto-set stato on Insert

```typescript
// When creating a rapportino, check if approval is required
async function createRapportino(rapportino: RapportinoInput) {
  // Check if approval is required for this commessa
  const { data: requiresApproval } = await supabase
    .rpc('richiede_approvazione', {
      p_commessa_id: rapportino.commessa_id,
      p_tipo_approvazione: 'presenze'
    });

  const stato = requiresApproval ? 'da_approvare' : 'approvato';

  const { data, error } = await supabase
    .from('rapportini')
    .insert({
      ...rapportino,
      stato: stato
    });

  return { data, error };
}
```

## Performance Considerations

### Indexes Created

1. **note_spesa**: 6 indexes for fast queries on tenant, commessa, dipendente, data, stato
2. **commesse_impostazioni_approvazione**: 5 indexes including GIN index for array queries
3. **Composite indexes**: tenant_id + data for date range queries

### Query Optimization Tips

1. **Always filter by tenant_id first** - Leverages RLS and improves query performance
2. **Use the view** - `v_commesse_approvazioni` for UI display (denormalized data)
3. **Array queries** - Use `ANY(approvatori)` for efficient array membership checks
4. **Date ranges** - Use composite index with `WHERE tenant_id = X AND data_nota BETWEEN Y AND Z`

### Scaling Considerations

1. **Array size**: If approver lists grow beyond 50-100 users, consider a join table
2. **Historical data**: Current design uses soft-delete via RLS, consider archival strategy
3. **Partitioning**: For high-volume tenants, consider partitioning note_spesa/rapportini by date

## Security (RLS Policies)

All tables have Row Level Security enabled with standard policies:
- Users can only access data from their tenant(s)
- INSERT requires created_by = auth.uid()
- UPDATE/DELETE restricted to tenant members

## Future Extensions

This schema is designed for easy extension:

### Add New Approval Type

```sql
-- Just insert a new row, no schema changes needed!
INSERT INTO commesse_impostazioni_approvazione (
  commessa_id, tenant_id, tipo_approvazione, abilitato
) VALUES (
  'commessa-uuid', 'tenant-uuid', 'approvazione_acquisti', true
);
```

### Add Approval Metadata

```sql
-- Add type-specific columns (optional)
ALTER TABLE commesse_impostazioni_approvazione
ADD COLUMN sla_ore INTEGER,
ADD COLUMN richiede_motivazione_rifiuto BOOLEAN DEFAULT false;
```

### Add Approval History Tracking

```sql
CREATE TABLE approvazioni_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_entita TEXT NOT NULL, -- 'rapportino' or 'nota_spesa'
  entita_id UUID NOT NULL,
  approvatore_id UUID NOT NULL REFERENCES dipendenti(id),
  azione TEXT NOT NULL CHECK (azione IN ('approvato', 'rifiutato')),
  motivazione TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Migration Checklist

- [ ] Run migration file: `20250222000001_create_approval_system.sql`
- [ ] Verify tables created: `note_spesa`, `commesse_impostazioni_approvazione`
- [ ] Verify indexes created (check `pg_indexes`)
- [ ] Verify RLS policies active (check `pg_policies`)
- [ ] Test helper function: `SELECT richiede_approvazione('uuid', 'presenze')`
- [ ] Test view: `SELECT * FROM v_commesse_approvazioni LIMIT 1`
- [ ] Update application code to use new schema
- [ ] Add UI for approval settings in commessa detail page
- [ ] Add approval workflow UI for pending items
