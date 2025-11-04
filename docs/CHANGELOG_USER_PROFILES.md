# Changelog - User Profiles & Extended Data

## STEP 2 - Sistema Profili Utente Completo ✅

Data: 2025-01-12

### 📋 Sommario

Implementato sistema completo di profili utente estesi con separazione tra dati di autenticazione e dati business/tenant.

### 🎯 Obiettivi Completati

- [x] Creata tabella `user_profiles` (1:1 con `auth.users`)
- [x] Estesa tabella `user_tenants` con tracking e stato
- [x] Implementati trigger auto-sync da `auth.users` a `user_profiles`
- [x] Create RLS policies per profili utente
- [x] Helper functions per gestione profili
- [x] Types TypeScript completi
- [x] Utilities client-side per profili

### 📁 File Creati

#### Database Migrations
- `supabase/migrations/20250112000002_create_user_profiles.sql`
  - Tabella `user_profiles` con campi estesi
  - Trigger auto-create/sync con `auth.users`
  - RLS policies (own + admin access)
  - Helper functions (`is_user_active`, `get_user_full_name`)
  - Backfill dati esistenti

- `supabase/migrations/20250112000003_update_user_tenants.sql`
  - Aggiunge `is_active` (soft detach da tenant)
  - Aggiunge `created_by` (tracking chi ha aggiunto l'utente)
  - Aggiunge `scopes` (JSONB per future custom permissions)
  - Aggiunge `updated_at` timestamp
  - Helper functions (`is_user_active_in_tenant`, `deactivate_user_in_tenant`)
  - Aggiorna RLS helpers per considerare `is_active`
  - Trigger auto-set `created_by`

- `supabase/migrations/20250112000004_apply_all_pending.sql`
  - Migrazione consolidata che applica tutti i cambiamenti in modo sicuro
  - Usa `CREATE OR REPLACE`, `DROP IF EXISTS`, `ON CONFLICT DO NOTHING`
  - Può essere applicata anche su DB già esistenti

#### TypeScript Types
- `apps/web/types/user-profile.ts`
  - `UserProfile`: profilo completo
  - `UserWithProfile`: dati combinati (profile + role + tenant)
  - `UserListItem`: per tabelle/liste
  - `CreateUserData`: form creazione utente
  - `UpdateUserData`: form modifica utente
  - `UserStatusUpdate`: attivazione/disattivazione
  - `UserActivity`, `UserCardData`: UI components
  - Type guards e utility types

#### Helper Functions
- `apps/web/lib/users/profiles.ts`
  - `getUserProfile(userId)`: fetch profilo
  - `getUserWithProfile(userId)`: fetch completo
  - `getTenantUsers()`: lista utenti tenant
  - `getActiveUsers()`: solo utenti attivi
  - `updateUserProfile(userId, updates)`: aggiorna profilo
  - `updateUserStatus(statusUpdate)`: attiva/disattiva
  - `deactivateUser(userId)`: soft delete globale
  - `detachUserFromTenant(userId)`: soft delete da tenant
  - `isUserActiveInTenant(userId)`: check stato
  - `getUserDisplayName(user)`: nome visualizzato
  - `getUserInitials(user)`: iniziali per avatar
  - `getUserStatusColor(user)`: colori badge stato

#### Documentation
- `apply_migrations_manual.md`
  - Istruzioni per applicare migrazioni manualmente
  - Queries di verifica
  - Troubleshooting

### 🗄️ Schema Database

#### user_profiles

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,

  -- Professional
  position TEXT, -- e.g., "Tecnico", "Contabile"

  -- Localization
  timezone TEXT DEFAULT 'Europe/Rome',
  locale TEXT DEFAULT 'it-IT',

  -- Additional
  notes TEXT, -- Admin-only internal notes

  -- Status
  is_active BOOLEAN DEFAULT true, -- Global soft-disable

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Denormalized (synced from auth.users)
  email TEXT,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ
);
```

#### user_tenants (updated)

```sql
-- New columns added:
is_active BOOLEAN DEFAULT true, -- Soft detach from tenant
created_by UUID REFERENCES auth.users(id), -- Who added this user
scopes JSONB DEFAULT '{}'::jsonb, -- Future custom permissions
updated_at TIMESTAMPTZ DEFAULT NOW()
```

### ✨ Features Principali

#### 1. Dual-Level Status

**Global Status** (`user_profiles.is_active`):
- Disattiva utente in TUTTA l'applicazione
- Admin può disabilitare utente problematico
- Utente non può più fare login/accedere a niente

**Tenant Status** (`user_tenants.is_active`):
- Disattiva utente solo in UN tenant specifico
- Utente può ancora accedere ad altri tenant
- Soft-detach reversibile

**Check combinato**:
```sql
-- Utente è attivo SE:
-- user_profiles.is_active = true AND user_tenants.is_active = true
```

#### 2. Auto-Sync con Auth

Trigger automatici mantengono sincronizzati:
- `auth.users` → `user_profiles`
- Email, last_sign_in_at, email_confirmed_at

Quando crei utente:
```typescript
// 1. Crea in auth.users
const { data } = await supabase.auth.admin.createUser({...});

// 2. Trigger crea automaticamente in user_profiles ✓
// 3. Crea manualmente in user_tenants
await supabase.from('user_tenants').insert({...});
```

#### 3. Tracking & Audit

- **created_by**: Chi ha aggiunto l'utente al tenant
- **updated_at**: Ultima modifica
- **scopes**: Preparato per future custom permissions

#### 4. RLS Policies

**User Profiles**:
- Users possono vedere/modificare il proprio profilo
- Admin possono vedere/modificare tutti i profili del tenant
- Users NON possono cambiare il proprio `is_active`

**Updated RLS Helpers**:
Tutte le funzioni helper ora considerano entrambi i livelli di `is_active`:
```sql
is_admin_or_owner(tenant_id)  -- checks both is_active flags
has_read_access(tenant_id)     -- checks both is_active flags
has_write_access(tenant_id)    -- checks both is_active flags
```

### 🔄 Migration Strategy

#### Backfill Automatico

Le migrazioni backfillano automaticamente:
1. **user_profiles**: Crea profili per tutti gli utenti esistenti in `auth.users`
2. **created_by**: Imposta owner del tenant per records esistenti

#### Safe Application

La migrazione `20250112000004_apply_all_pending.sql`:
- Usa `CREATE OR REPLACE` per functions
- Usa `DROP IF EXISTS` per triggers
- Usa `ON CONFLICT DO NOTHING` per inserts
- Safe da applicare multiple volte

### 📊 Utilizzo

#### Fetch User with Profile

```typescript
import { getUserWithProfile } from '@/lib/users/profiles';

const user = await getUserWithProfile(userId);

console.log(user.full_name); // Nome completo
console.log(user.position);  // Ruolo aziendale
console.log(user.role);      // Ruolo permessi
console.log(user.is_active); // Stato globale
console.log(user.is_active_in_tenant); // Stato tenant
```

#### Get Active Users

```typescript
import { getActiveUsers } from '@/lib/users/profiles';

const activeUsers = await getActiveUsers();
// Returns only users with both is_active flags = true
```

#### Update Profile

```typescript
import { updateUserProfile } from '@/lib/users/profiles';

await updateUserProfile(userId, {
  full_name: 'Mario Rossi',
  position: 'Tecnico Senior',
  phone: '+39 123 456 7890',
  timezone: 'Europe/Rome',
});
```

#### Deactivate User

```typescript
import { deactivateUser, detachUserFromTenant } from '@/lib/users/profiles';

// Global deactivation (all tenants)
await deactivateUser(userId);

// Tenant-specific deactivation
await detachUserFromTenant(userId);
```

#### Display Helpers

```typescript
import {
  getUserDisplayName,
  getUserInitials,
  getUserStatusColor
} from '@/lib/users/profiles';

const name = getUserDisplayName(user);        // "Mario Rossi" or email
const initials = getUserInitials(user);       // "MR"
const status = getUserStatusColor(user);      // { bg, text, label }
```

### 🎨 UI Components Ready

I types e helpers sono pronti per:

- **User Avatar**: initials, avatar_url
- **User Card**: display name, position, role badge
- **Status Badge**: active/inactive/suspended colors
- **User List**: sortable, filterable by status
- **User Form**: create/edit with validation

### 🔐 Security

#### RLS Enforcement
- Users can only modify their own basic profile
- Admins can modify any profile in their tenant
- `is_active` can only be changed by admins
- Cross-tenant access blocked

#### Status Checks
- All RLS helpers now check both `is_active` flags
- Inactive users automatically blocked at DB level
- No bypass possible

#### Audit Trail
- `created_by` tracks user management actions
- `updated_at` tracks profile changes
- `scopes` prepared for future granular permissions

### ⚠️ Breaking Changes

Nessun breaking change - backwards compatible.

Modifiche esistenti:
- `user_tenants` ha nuove colonne (nullable, con defaults)
- RLS functions aggiornate (più restrittive, ma safe)

### 🐛 Known Issues

Nessuno

### 📝 TODO - Next Steps

- [x] ~~Applicare migrazioni~~ (vedi `apply_migrations_manual.md`)
- [ ] Aggiornare `NuovoUtenteModal` per nuovi campi profilo
- [ ] Aggiornare `gestione-utenti` page per mostrare profili
- [ ] Creare componente `UserAvatar`
- [ ] Creare componente `UserCard`
- [ ] Creare componente `UserStatusBadge`
- [ ] Aggiungere UI per deactivate/reactivate user
- [ ] Aggiungere filtri per status in liste utenti
- [ ] Testare backfill con utenti esistenti

### 📚 Documentazione

- Schema: `supabase/migrations/20250112000002*.sql`
- Types: `apps/web/types/user-profile.ts`
- Helpers: `apps/web/lib/users/profiles.ts`
- Migration guide: `apply_migrations_manual.md`

### 👥 Contributors

- Sistema progettato e implementato per app.tvn.com

---

## Versioning

**v2.0.0** - 2025-01-12 - User profiles & extended data

### Semantic Versioning
- **Major**: Breaking changes allo schema user
- **Minor**: Nuovi campi profilo
- **Patch**: Bug fixes, performance
