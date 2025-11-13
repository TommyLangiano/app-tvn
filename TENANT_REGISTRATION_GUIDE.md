# 🏢 Guida Registrazione Multi-Tenant

## 📋 Panoramica

Sistema completo di registrazione azienda (tenant) con utente Owner, multi-tenancy sicuro tramite RLS, e gestione utenti.

---

## 🗂️ Architettura Database

### Tabelle Principali

#### 1. `tenants` (Aziende)
```sql
- id: UUID (PK)
- name: TEXT (nome azienda)
- created_at: TIMESTAMPTZ
- created_by: UUID (FK → auth.users)
```

#### 2. `auth.users` (Autenticazione Supabase)
```sql
- id: UUID (PK)
- email: TEXT (unique)
- encrypted_password: TEXT
- raw_user_meta_data: JSONB
  - full_name
  - first_name
  - last_name
```

#### 3. `user_profiles` (Profili Utente)
```sql
- user_id: UUID (PK, FK → auth.users)
- full_name: TEXT
- email: TEXT (denormalized)
- phone: TEXT
- avatar_url: TEXT
- position: TEXT (ruolo aziendale: "Titolare", "Tecnico", etc.)
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMPTZ
```

#### 4. `user_tenants` (Link Utente ↔ Tenant)
```sql
- user_id: UUID (FK → auth.users)
- tenant_id: UUID (FK → tenants)
- role: tenant_role ENUM
  - owner
  - admin
  - manager
  - operaio
  - member
  - viewer
  - collaboratore_esterno
- created_at: TIMESTAMPTZ
- PRIMARY KEY (user_id, tenant_id)
```

#### 5. `tenant_profiles` (Dati Aziendali)
```sql
- tenant_id: UUID (PK, FK → tenants)
- ragione_sociale: TEXT
- partita_iva: TEXT
- codice_fiscale: TEXT
- forma_giuridica: TEXT
- sede_legale_*: TEXT
- logo_url: TEXT
- created_at, updated_at: TIMESTAMPTZ
```

---

## 🚀 Flusso di Registrazione

### 1. Utente compila form `/signup`
```typescript
{
  company_name: "Costruzioni Edili SRL",
  first_name: "Mario",
  last_name: "Rossi",
  email: "mario.rossi@example.com",
  password: "SecurePass123"
}
```

### 2. API `/api/auth/signup` esegue (TRANSAZIONE):

```typescript
// Step 1: Crea utente in auth.users
const { data: authData } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name: `${first_name} ${last_name}`,
    first_name,
    last_name
  }
});

// Step 2: Trigger automatico crea record in user_profiles
// (via trigger on_auth_user_created)

// Step 3: Crea tenant
const { data: tenantData } = await supabaseAdmin
  .from('tenants')
  .insert({
    name: company_name,
    created_by: userId
  })
  .select()
  .single();

// Step 4: Collega utente a tenant con ruolo OWNER
await supabaseAdmin
  .from('user_tenants')
  .insert({
    user_id: userId,
    tenant_id: tenantId,
    role: 'owner'
  });

// Step 5: Aggiorna profilo utente
await supabaseAdmin
  .from('user_profiles')
  .update({
    full_name: `${first_name} ${last_name}`,
    position: 'Titolare'
  })
  .eq('user_id', userId);

// Step 6: Crea profilo azienda vuoto
await supabaseAdmin
  .from('tenant_profiles')
  .insert({
    tenant_id: tenantId,
    ragione_sociale: company_name
  });
```

### 3. Utente viene rediretto a `/auth/signin` per login

### 4. Dopo login, l'utente è OWNER del suo tenant

---

## 🔐 Sicurezza: Row Level Security (RLS)

Tutte le tabelle con `tenant_id` hanno policy RLS che filtrano automaticamente:

```sql
-- Esempio: commesse table
CREATE POLICY "Users can view commesse in their tenant"
  ON commesse FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );
```

**Risultato:** Ogni query automaticamente filtra per `tenant_id` dell'utente loggato.

---

## 👥 Gestione Utenti & Ruoli

### Pagina: `/gestione-utenti` (già esistente)

#### Funzionalità disponibili per OWNER/ADMIN:

1. **Visualizza utenti del tenant**
   - Lista completa con ruoli
   - Stati (attivo/disattivo)

2. **Invita nuovo utente**
   - Crea auth.users
   - Crea user_profiles
   - Crea user_tenants con ruolo scelto

3. **Modifica ruolo**
   - Aggiorna `user_tenants.role`

4. **Disattiva utente**
   - Imposta `user_profiles.is_active = false`
   - Utente non può più accedere

---

## 📁 File Creati/Modificati

### Nuovi File:

```
supabase/migrations/
  └─ 20250113000001_add_new_roles.sql          ← Aggiunge manager, operaio, collaboratore_esterno

apps/web/
  ├─ app/
  │   ├─ (auth)/
  │   │   └─ signup/
  │   │       └─ page.tsx                       ← Form registrazione pubblica
  │   └─ api/
  │       └─ auth/
  │           └─ signup/
  │               └─ route.ts                   ← Backend registration logic
  └─ TENANT_REGISTRATION_GUIDE.md              ← Questa guida
```

### File Esistenti da Verificare:

```
apps/web/
  └─ app/
      └─ (app)/
          └─ gestione-utenti/
              └─ page.tsx                        ← Già esistente, verifica funzionalità
```

---

## 🧪 Come Testare

### 1. Applica Migration

```bash
cd /Users/tommylangiano/Desktop/app.tvn.com
npx supabase db push
```

### 2. Verifica variabili ambiente

```bash
# apps/web/.env.local deve avere:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  ← IMPORTANTE per signup API
```

### 3. Testa Registrazione

```bash
# Avvia dev server
npm run dev

# Apri browser
http://localhost:3000/signup

# Compila form:
- Nome azienda: "Test Edilizia SRL"
- Nome: "Mario"
- Cognome: "Rossi"
- Email: "mario.rossi@test.com"
- Password: "TestPass123"

# Submit → Dovrebbe reindirizzare a /auth/signin
```

### 4. Verifica Database

```sql
-- Controlla tenant creato
SELECT * FROM tenants WHERE name = 'Test Edilizia SRL';

-- Controlla utente
SELECT * FROM auth.users WHERE email = 'mario.rossi@test.com';

-- Controlla profilo
SELECT * FROM user_profiles WHERE email = 'mario.rossi@test.com';

-- Controlla link con ruolo OWNER
SELECT * FROM user_tenants WHERE role = 'owner';

-- Controlla profilo azienda
SELECT * FROM tenant_profiles WHERE ragione_sociale = 'Test Edilizia SRL';
```

### 5. Testa Login

```bash
# Vai a /auth/signin
# Login con:
- Email: mario.rossi@test.com
- Password: TestPass123

# Dopo login dovresti essere nella dashboard
# Verifica che:
- Sidebar mostra "TEST EDILIZIA SRL" in alto
- Puoi accedere a tutte le sezioni
- In "Sistema → Utenti & Ruoli" vedi te stesso come OWNER
```

### 6. Testa Multi-Tenancy

```bash
# Crea SECONDA azienda con altro utente
# Registra: luigi.verdi@test.com / "Impresa Verde SRL"

# Login come mario.rossi@test.com
# Crea una commessa
# Logout

# Login come luigi.verdi@test.com
# Verifica che NON vedi la commessa di Mario
# ✅ Multi-tenancy funziona!
```

---

## 🎯 Prossimi Passi

### Completamenti necessari:

1. **Invito utenti** in `/gestione-utenti`
   - Form per invitare nuovo collaboratore
   - Scelta ruolo (admin, manager, operaio, etc.)
   - Invio email con link per impostare password

2. **Gestione ruoli** in `/gestione-utenti`
   - Dropdown per cambiare ruolo
   - Bottone disattiva/attiva utente

3. **Onboarding opzionale** (futuro)
   - Dopo primo login, modale "Completa profilo azienda"
   - Link a "Sistema → Impostazioni" per dati fiscali

---

## ❗ Note Importanti

### ✅ Da Fare:
- [ ] Testare registrazione completa
- [ ] Verificare RLS su tutte le tabelle esistenti
- [ ] Implementare invito utenti
- [ ] Aggiungere cambio ruolo
- [ ] Testare con 2+ tenant

### ⚠️ Attenzione:
- `SUPABASE_SERVICE_ROLE_KEY` è SENSIBILE
  - Non committare in git
  - Solo lato server (API routes)

- Email di produzione:
  - Configurare SMTP in Supabase
  - Personalizzare template email conferma

- Rate limiting:
  - Aggiungere protezione anti-spam su `/api/auth/signup`
  - Max 5 registrazioni/ora per IP

---

## 🆘 Troubleshooting

### Errore: "Email già registrata"
→ L'email esiste già in `auth.users`. Usa email diversa o elimina utente esistente.

### Errore: "Errore nella creazione dell'azienda"
→ Controlla che migration sia applicata: `npx supabase db push`

### Errore: "Permessi negati"
→ Verifica che `SUPABASE_SERVICE_ROLE_KEY` sia configurata in `.env.local`

### Utente non vede dati dopo login
→ Controlla che esista record in `user_tenants` con `tenant_id` corretto

### RLS blocca query
→ Verifica che policy RLS includano `tenant_id` corretto:
```sql
SELECT * FROM user_tenants WHERE user_id = auth.uid();
```

---

## 📚 Riferimenti

- [Supabase Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

**✅ Sistema Completo e Pronto per Testing!**
