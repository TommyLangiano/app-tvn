# Guida Utilizzo Sistema Permessi

Questa guida pratica mostra come utilizzare il sistema di permessi nell'applicazione.

## Quick Start

### 1. Applicare le Migrazioni Database

```bash
# Apply migrations al database locale
npx supabase db push

# O al database di produzione (linked)
npx supabase db push --linked
```

### 2. Verificare i Ruoli

Dopo le migrazioni, verifica i ruoli disponibili:

```sql
-- Query per vedere i ruoli disponibili
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tenant_role')
ORDER BY enumlabel;

-- Risultato atteso:
-- admin
-- admin_readonly
-- billing_manager
-- member (legacy)
-- operaio
-- owner
-- viewer (legacy)
```

## Utilizzo nei Componenti React

### Hook Base: usePermissions

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

function MyComponent() {
  const {
    role,           // Ruolo corrente
    loading,        // Caricamento in corso
    can,            // Check singolo permesso
    canAll,         // Check tutti i permessi
    canAny,         // Check almeno un permesso
    isAdmin,        // È admin?
    isOwner,        // È owner?
    isReadOnly,     // È read-only?
    isOperaio,      // È operaio?
    isBillingManager, // È billing manager?
  } = usePermissions();

  if (loading) return <div>Caricamento...</div>;

  return (
    <div>
      <p>Il tuo ruolo è: {role}</p>

      {/* Check specifico permesso */}
      {can(PERMISSIONS.USERS_CREATE) && (
        <button>Crea Utente</button>
      )}

      {/* Check multipli permessi */}
      {canAll([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_CREATE]) && (
        <div>Gestione Utenti Completa</div>
      )}

      {/* Check ruolo */}
      {isAdmin && <AdminPanel />}
      {isReadOnly && <ReadOnlyBanner />}
    </div>
  );
}
```

### PermissionGate Components

Usa i componenti gate per rendering condizionale:

```typescript
import {
  RequirePermission,
  RequireAdmin,
  RequireWriteAccess,
  WriteAccessSwitch,
} from '@/components/auth/PermissionGate';
import { PERMISSIONS } from '@/lib/permissions';

function UsersPage() {
  return (
    <div>
      {/* Mostra solo se ha il permesso */}
      <RequirePermission permission={PERMISSIONS.USERS_CREATE}>
        <button>Crea Nuovo Utente</button>
      </RequirePermission>

      {/* Mostra solo per admin/owner */}
      <RequireAdmin>
        <AdvancedSettings />
      </RequireAdmin>

      {/* Nascondi per utenti read-only */}
      <RequireWriteAccess>
        <button>Modifica</button>
      </RequireWriteAccess>

      {/* Mostra contenuto diverso basato su write access */}
      <WriteAccessSwitch
        writeContent={<EditForm />}
        readOnlyContent={<ViewOnlyMessage />}
      />
    </div>
  );
}
```

### Con Fallback

```typescript
<RequirePermission
  permission={PERMISSIONS.USERS_CREATE}
  fallback={<p>Non hai i permessi per creare utenti</p>}
>
  <CreateUserButton />
</RequirePermission>
```

## Utilizzo nelle API Routes

### Pattern Base

```typescript
import { requirePermissions, requireAdmin } from '@/lib/permissions/server';
import { PERMISSIONS } from '@/lib/permissions';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Require specific permission
  const context = await requirePermissions(PERMISSIONS.USERS_VIEW);

  // Se non autorizzato, context è un NextResponse con errore
  if (context instanceof NextResponse) {
    return context;
  }

  // Se autorizzato, context contiene userId, tenantId, role
  const { userId, tenantId, role } = context;

  // ... tua logica
  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  // Require admin role
  const context = await requireAdmin();
  if (context instanceof NextResponse) return context;

  // ... tua logica per admin
}
```

### Check Multipli Permessi

```typescript
export async function POST(request: Request) {
  // Require multiple permissions
  const context = await requirePermissions([
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE
  ]);

  if (context instanceof NextResponse) return context;

  // ... tua logica
}
```

### Require Owner (Operazioni Critiche)

```typescript
import { requireOwner } from '@/lib/permissions/server';

export async function DELETE(request: Request) {
  // Only owner can delete tenant
  const context = await requireOwner();
  if (context instanceof NextResponse) return context;

  // ... logica eliminazione tenant
}
```

### Check Accesso a Risorsa Specifica

```typescript
import { requireRapportinoAccess } from '@/lib/permissions/server';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check if user can edit this specific rapportino
  const context = await requireRapportinoAccess(params.id, 'edit');
  if (context instanceof NextResponse) return context;

  // User can edit this rapportino
  // ... tua logica
}
```

### Wrapper Pattern (Advanced)

```typescript
import { withPermission } from '@/lib/permissions/server';
import { PERMISSIONS } from '@/lib/permissions';

export const POST = withPermission(
  PERMISSIONS.USERS_CREATE,
  async (context, request: Request) => {
    // Context già validato, non serve check
    const { tenantId, role } = context;

    // ... tua logica
    return NextResponse.json({ success: true });
  }
);
```

## Utilizzo Helper Functions

### Check Permessi Direttamente

```typescript
import { hasPermission, canViewRapportino } from '@/lib/permissions';
import { PERMISSIONS } from '@/lib/permissions';

// Check se un ruolo ha un permesso
const canCreate = hasPermission('admin', PERMISSIONS.USERS_CREATE);
// true

const canOperaioCreate = hasPermission('operaio', PERMISSIONS.USERS_CREATE);
// false

// Check accesso a rapportino specifico
const canView = canViewRapportino(
  'operaio',           // Role
  'user-123',          // User ID
  'user-123'           // Rapportino owner ID
);
// true (può vedere il proprio)

const canViewOthers = canViewRapportino(
  'operaio',
  'user-123',
  'user-456'
);
// false (non può vedere quelli altrui)
```

## Esempi Comuni

### Pagina Gestione Utenti

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { RequirePermission, RequireWriteAccess } from '@/components/auth/PermissionGate';
import { PERMISSIONS } from '@/lib/permissions';

function UsersManagement() {
  const { can, isReadOnly } = usePermissions();

  // Verifica accesso alla pagina
  if (!can(PERMISSIONS.USERS_VIEW)) {
    return <div>Accesso negato</div>;
  }

  return (
    <div>
      <h1>Gestione Utenti</h1>

      {/* Lista utenti - visibile a tutti con VIEW */}
      <UsersList />

      {/* Pulsante crea - solo con CREATE */}
      <RequirePermission permission={PERMISSIONS.USERS_CREATE}>
        <button>Crea Utente</button>
      </RequirePermission>

      {/* Azioni edit/delete - nascondi per read-only */}
      <RequireWriteAccess>
        <UserActions />
      </RequireWriteAccess>

      {/* Banner per read-only */}
      {isReadOnly && (
        <div className="bg-blue-100 p-4">
          Stai visualizzando in modalità sola lettura
        </div>
      )}
    </div>
  );
}
```

### API Create User

```typescript
import { requirePermissions, requireWrite } from '@/lib/permissions/server';
import { PERMISSIONS } from '@/lib/permissions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Check permission to create users
  const context = await requirePermissions(PERMISSIONS.USERS_CREATE);
  if (context instanceof NextResponse) return context;

  // Also ensure user has write access (not read-only)
  const writeContext = await requireWrite();
  if (writeContext instanceof NextResponse) return writeContext;

  const { tenantId } = context;
  const body = await request.json();

  // Create user logic
  // ...

  return NextResponse.json({ success: true });
}
```

### Rapportini con Ownership

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { canEditRapportino } from '@/lib/permissions';

function RapportinoCard({ rapportino, currentUserId }) {
  const { role } = usePermissions();

  const canEdit = canEditRapportino(
    role!,
    currentUserId,
    rapportino.user_id
  );

  return (
    <div>
      <h3>{rapportino.titolo}</h3>
      <p>{rapportino.descrizione}</p>

      {canEdit && (
        <button>Modifica</button>
      )}
    </div>
  );
}
```

## Testing Permessi

### Test Checklist

Per ogni feature, testa con tutti i ruoli:

```typescript
describe('User Management', () => {
  it('owner can create users', async () => {
    // Test con owner
  });

  it('admin can create users', async () => {
    // Test con admin
  });

  it('admin_readonly cannot create users', async () => {
    // Test con admin_readonly - deve fallire
  });

  it('operaio cannot access user management', async () => {
    // Test con operaio - deve dare 403
  });
});
```

### Mock per Testing

```typescript
// Mock usePermissions hook
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    role: 'admin',
    loading: false,
    can: (permission) => permission === PERMISSIONS.USERS_CREATE,
    isAdmin: true,
    isReadOnly: false,
  })
}));
```

## Troubleshooting

### "Permission denied" in API

Verifica:
1. Utente autenticato? (`auth.uid()` non null)
2. Utente in tenant? (record in `user_tenants`)
3. Ruolo corretto? (query `user_tenants.role`)
4. Permesso assegnato al ruolo? (vedi `ROLE_PERMISSIONS` in config)

### UI mostra pulsanti ma API ritorna 403

Significa mismatch tra client e server permission check. Verifica:
1. Hook `usePermissions` usa gli stessi permessi delle API
2. RLS policies corrispondono ai permessi TypeScript
3. Cache client non è stale (prova refresh)

### "Cannot remove last owner"

Trigger database blocca rimozione ultimo owner. Per risolvere:
1. Promuovi un altro utente a owner prima
2. Poi rimuovi/demote l'owner originale

### RLS policies non funzionano

Verifica:
1. RLS è abilitato? `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Policies create? `\dp table_name` in psql
3. Helper functions create? `\df is_admin_or_owner`
4. User autenticato ha `auth.uid()` valido?

## Best Practices

### ✅ DO

- Controlla permessi a TUTTI i livelli (UI, API, DB)
- Usa componenti `PermissionGate` per UI condizionale
- Nascondi completamente aree non accessibili (non solo disabilitare)
- Testa con tutti i ruoli
- Usa ruoli specifici (billing_manager > admin per fatturazione)

### ❌ DON'T

- Non fare solo client-side checks (bypassabili)
- Non esporre API senza permission checks
- Non mostrare UI per azioni non permesse (confonde utenti)
- Non hardcodare ruoli in componenti (usa hook/config)
- Non dare admin a tutti "per sicurezza"

## Riferimenti Rapidi

### Import Statements

```typescript
// Hooks
import { usePermissions } from '@/hooks/usePermissions';

// Permissions config
import { PERMISSIONS, ROLES } from '@/lib/permissions';

// Helper functions
import { hasPermission, canViewRapportino } from '@/lib/permissions';

// Server utilities
import { requirePermissions, requireAdmin, requireOwner } from '@/lib/permissions/server';

// UI Components
import { RequirePermission, RequireAdmin, RequireWriteAccess } from '@/components/auth/PermissionGate';
```

### Ruoli Quick Reference

| Ruolo | Codice | Caso d'uso |
|-------|--------|------------|
| Owner | `ROLES.OWNER` | Fondatore, deve fare operazioni critiche |
| Admin | `ROLES.ADMIN` | Manager, gestione completa |
| Admin R/O | `ROLES.ADMIN_READONLY` | Consulente, auditor |
| Operaio | `ROLES.OPERAIO` | Dipendenti operativi |
| Billing | `ROLES.BILLING_MANAGER` | Contabile, solo fatture |

### Permessi Comuni

```typescript
// Users
PERMISSIONS.USERS_VIEW
PERMISSIONS.USERS_CREATE
PERMISSIONS.USERS_UPDATE
PERMISSIONS.USERS_DELETE

// Rapportini
PERMISSIONS.RAPPORTINI_OWN_VIEW
PERMISSIONS.RAPPORTINI_OWN_CREATE
PERMISSIONS.RAPPORTINI_ALL_VIEW
PERMISSIONS.RAPPORTINI_ALL_UPDATE

// Billing
PERMISSIONS.FATTURE_VIEW
PERMISSIONS.FATTURE_CREATE
PERMISSIONS.BILLING_VIEW

// Critical
PERMISSIONS.TENANT_DELETE
PERMISSIONS.PLAN_CHANGE
```

## Prossimi Passi

1. ✅ Applica migrations
2. ✅ Testa ruoli in dev
3. ✅ Aggiorna UI esistenti con permission gates
4. ✅ Aggiungi permission checks alle API
5. ✅ Testa con tutti i ruoli
6. ✅ Deploy in staging
7. ✅ Test finali
8. ✅ Deploy in produzione
