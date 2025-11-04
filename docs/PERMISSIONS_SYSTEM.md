# Sistema di Permessi e Ruoli

Questo documento descrive il sistema di autorizzazione tenant-scoped implementato nell'applicazione.

## Indice

- [Ruoli](#ruoli)
- [Permessi](#permessi)
- [Architettura](#architettura)
- [Utilizzo](#utilizzo)
- [Database](#database)
- [Sicurezza](#sicurezza)

## Ruoli

Il sistema supporta i seguenti ruoli, definiti a livello di `user_tenants` (quindi specifici per ogni tenant):

### Ruoli Attivi

| Ruolo | Codice | Descrizione | Accesso |
|-------|--------|-------------|---------|
| **Owner** | `owner` | Proprietario del tenant | Accesso completo + operazioni critiche (delete tenant, cambio piano, trasferimento proprietà) |
| **Admin** | `admin` | Amministratore | Accesso completo in lettura/scrittura a tutte le aree (escluse operazioni critiche) |
| **Admin (Sola Lettura)** | `admin_readonly` | Amministratore read-only | Accesso completo in sola lettura. Zero permessi di scrittura |
| **Operaio** | `operaio` | Operatore | Accesso alla propria dashboard operativa. Vede/edita solo i propri rapportini |
| **Responsabile Fatturazione** | `billing_manager` | Gestore billing | Accesso solo ad area pagamenti/fatture con lettura/scrittura |

### Ruoli Legacy (Deprecati)

- `member` - Non più utilizzato, mantenuto per retrocompatibilità
- `viewer` - Non più utilizzato, mantenuto per retrocompatibilità

## Permessi

### Matrice Permessi per Risorsa

| Risorsa | Owner | Admin | Admin R/O | Operaio | Billing Manager |
|---------|-------|-------|-----------|---------|-----------------|
| **Gestione Utenti** | RW | RW | R | - | - |
| **Rapportini (propri)** | RW | RW | R | RW | - |
| **Rapportini (altrui)** | RW | RW | R | - | - |
| **Commesse** | RW | RW | R | R | - |
| **Clienti** | RW | RW | R | - | R |
| **Fornitori** | RW | RW | R | - | R |
| **Fatture** | RW | RW | R | - | RW |
| **Costi** | RW | RW | R | - | RW |
| **Profilo Tenant** | RW | RW | R | - | - |
| **Billing** | RW | RW | R | - | RW |
| **Operazioni Critiche** | ✓ | - | - | - | - |

**Legenda:**
- RW = Read/Write (lettura e scrittura)
- R = Read-only (solo lettura)
- \- = Nessun accesso

### Permessi Dettagliati

I permessi sono definiti in formato `resource:scope:action`. Esempi:

```typescript
// User management
PERMISSIONS.USERS_VIEW      // Visualizza utenti
PERMISSIONS.USERS_CREATE    // Crea utenti
PERMISSIONS.USERS_UPDATE    // Modifica utenti
PERMISSIONS.USERS_DELETE    // Elimina utenti

// Rapportini - Own
PERMISSIONS.RAPPORTINI_OWN_VIEW    // Visualizza propri rapportini
PERMISSIONS.RAPPORTINI_OWN_CREATE  // Crea rapportini
PERMISSIONS.RAPPORTINI_OWN_UPDATE  // Modifica propri rapportini
PERMISSIONS.RAPPORTINI_OWN_DELETE  // Elimina propri rapportini

// Rapportini - All
PERMISSIONS.RAPPORTINI_ALL_VIEW    // Visualizza tutti i rapportini
PERMISSIONS.RAPPORTINI_ALL_CREATE  // Crea rapportini per altri
PERMISSIONS.RAPPORTINI_ALL_UPDATE  // Modifica rapportini altrui
PERMISSIONS.RAPPORTINI_ALL_DELETE  // Elimina rapportini altrui

// Critical operations (owner only)
PERMISSIONS.TENANT_DELETE    // Elimina tenant
PERMISSIONS.TENANT_TRANSFER  // Trasferisci proprietà
PERMISSIONS.PLAN_CHANGE      // Cambia piano
```

## Architettura

### File Principali

```
lib/permissions/
├── config.ts          # Definizione ruoli e permessi (source of truth)
├── index.ts           # Helper functions per controllo permessi
└── server.ts          # Utilities server-side per API routes

hooks/
└── usePermissions.ts  # React hook per controllo permessi client-side

supabase/migrations/
├── 20250112000000_update_tenant_roles.sql    # Aggiorna enum ruoli
└── 20250112000001_update_rls_policies.sql    # RLS policies aggiornate
```

### Flusso di Autorizzazione

```
Request → Authentication → Role Lookup → Permission Check → Resource Access
```

1. **Authentication**: Verifica identità utente (Supabase Auth)
2. **Role Lookup**: Recupera ruolo da `user_tenants`
3. **Permission Check**: Valida permessi richiesti
4. **Resource Access**: Controlla accesso specifico alla risorsa (RLS)

## Utilizzo

### Client-Side (React Components)

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

function MyComponent() {
  const { can, isAdmin, isReadOnly } = usePermissions();

  // Check specific permission
  if (can(PERMISSIONS.USERS_CREATE)) {
    return <CreateUserButton />;
  }

  // Check role
  if (isAdmin) {
    return <AdminPanel />;
  }

  // Check read-only
  if (isReadOnly) {
    return <ViewOnlyMessage />;
  }

  return null;
}
```

### Server-Side (API Routes)

```typescript
import { requirePermissions, requireAdmin, requireOwner } from '@/lib/permissions/server';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(request: Request) {
  // Require specific permission
  const context = await requirePermissions(PERMISSIONS.USERS_CREATE);
  if (context instanceof NextResponse) return context; // Error response

  // Use context
  const { userId, tenantId, role } = context;

  // ... your logic
}

// Or require admin role
export async function DELETE(request: Request) {
  const context = await requireAdmin();
  if (context instanceof NextResponse) return context;

  // Only admin/owner reach here
}

// Or require owner for critical operations
export async function POST(request: Request) {
  const context = await requireOwner();
  if (context instanceof NextResponse) return context;

  // Only owner reaches here
}
```

### Helper Functions

```typescript
import { hasPermission, canViewRapportino, canEditRapportino } from '@/lib/permissions';

// Check if role has permission
const canCreate = hasPermission('operaio', PERMISSIONS.RAPPORTINI_OWN_CREATE); // true

// Check resource-specific access
const canView = canViewRapportino(
  userRole,      // User's role
  userId,        // User's ID
  rapportinoUserId  // Rapportino owner's ID
);

const canEdit = canEditRapportino(userRole, userId, rapportinoUserId);
```

## Database

### Schema

```sql
-- Enum definition
CREATE TYPE tenant_role AS ENUM (
  'owner',
  'admin',
  'admin_readonly',
  'operaio',
  'billing_manager',
  'member',     -- legacy
  'viewer'      -- legacy
);

-- Junction table
CREATE TABLE user_tenants (
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  role tenant_role NOT NULL DEFAULT 'operaio',
  PRIMARY KEY (user_id, tenant_id)
);
```

### RLS Helper Functions

Il sistema fornisce funzioni helper per le RLS policies:

```sql
-- Check if user is admin or owner
is_admin_or_owner(tenant_id UUID) RETURNS BOOLEAN

-- Check if user has read access (includes admin_readonly)
has_read_access(tenant_id UUID) RETURNS BOOLEAN

-- Check if user has write access (excludes read-only)
has_write_access(tenant_id UUID) RETURNS BOOLEAN

-- Check if user has billing access
has_billing_access(tenant_id UUID) RETURNS BOOLEAN

-- Check if user can write billing data
can_write_billing(tenant_id UUID) RETURNS BOOLEAN
```

### Esempio RLS Policy

```sql
-- Rapportini: admin/owner see all, operaio sees own
CREATE POLICY "rapportini_select_policy" ON rapportini
  FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid())
    AND (
      has_read_access(tenant_id)  -- admin/owner/readonly
      OR
      (user_id = auth.uid() AND role = 'operaio')  -- own data
    )
  );
```

## Sicurezza

### Vincoli di Sicurezza

1. **Owner Obbligatorio**: Ogni tenant DEVE avere almeno 1 owner
   - Trigger database impedisce rimozione ultimo owner
   - Validato a livello DB, non bypassabile

2. **Read-Only Enforcement**: `admin_readonly` NON può fare mutazioni
   - Validato in RLS policies (no write access)
   - Validato server-side nelle API
   - UI non mostra pulsanti di modifica

3. **Scope Isolation**: Operaio e billing_manager vedono SOLO le loro aree
   - RLS policies filtrano per ownership/scope
   - UI nasconde rotte non accessibili
   - API ritorna 403 per accessi non autorizzati

4. **Critical Operations**: Solo owner può fare operazioni critiche
   - Delete tenant
   - Cambio piano/subscription
   - Trasferimento proprietà

### Best Practices

1. **Defense in Depth**: Implementare controlli a TUTTI i livelli
   - UI (nascondere controlli non autorizzati)
   - Client-side (validazione form)
   - API (autorizzazione esplicita)
   - Database (RLS policies)

2. **Least Privilege**: Dare SOLO i permessi necessari
   - Usa ruoli specifici invece di admin per tutto
   - Preferisci `admin_readonly` per consultazioni
   - Usa `billing_manager` per chi gestisce solo fatture

3. **Audit Trail**: Logga operazioni sensibili
   - Creazione/modifica/eliminazione utenti
   - Cambio ruoli
   - Operazioni critiche owner

4. **Testing**: Testa TUTTI i casi d'uso per ogni ruolo
   - Accesso consentito
   - Accesso negato
   - Boundary cases (ultimo owner, etc.)

## Migrazioni

Per applicare le modifiche al database:

```bash
# Apply migrations
npx supabase db push

# Or in production
npx supabase db push --linked
```

Le migrazioni includono:
1. `20250112000000_update_tenant_roles.sql` - Aggiorna enum e vincoli
2. `20250112000001_update_rls_policies.sql` - Aggiorna tutte le RLS policies

## Testing

### Test Checklist per Ruolo

**Owner:**
- ✓ Può fare tutto
- ✓ Può eliminare tenant
- ✓ Può cambiare piano
- ✓ Non può essere rimosso se è l'ultimo

**Admin:**
- ✓ Può gestire utenti
- ✓ Può vedere/modificare tutti i rapportini
- ✓ Non può eliminare tenant
- ✓ Non può cambiare piano

**Admin Read-Only:**
- ✓ Può vedere tutto
- ✗ Non può modificare nulla
- ✗ Pulsanti edit/delete nascosti in UI
- ✗ API ritorna 403 su POST/PUT/DELETE

**Operaio:**
- ✓ Può vedere/creare/modificare propri rapportini
- ✗ Non vede rapportini altrui
- ✗ Non accede a gestione utenti
- ✗ Non accede a fatturazione

**Billing Manager:**
- ✓ Può gestire fatture e costi
- ✓ Può vedere clienti/fornitori (read-only)
- ✗ Non vede rapportini
- ✗ Non gestisce utenti

## Riferimenti

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- Codice sorgente: `lib/permissions/`
