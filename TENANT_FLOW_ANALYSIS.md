# Analisi Completa Flusso Tenant System

## 📋 Flusso Completo dalla Registrazione alla Dashboard

### 1️⃣ **REGISTRAZIONE** (`/signup` → `/api/auth/signup`)

**Cosa succede:**
```
1. Utente compila form: company_name, first_name, last_name, email, password
2. POST a /api/auth/signup/route.ts
3. Validazioni: email, password, campi obbligatori
4. Controllo email duplicata
```

**Creazione Dati (ATOMICA):**
```sql
-- Step 1: Crea utente auth
INSERT INTO auth.users (email, password, metadata)
VALUES (email, hashed_password, {full_name, first_name, last_name})
RETURNING id as user_id;

-- Step 2: Crea tenant
INSERT INTO tenants (name, created_by)
VALUES (company_name, user_id)
RETURNING id as tenant_id;

-- Step 3: Collega utente a tenant
INSERT INTO user_tenants (user_id, tenant_id, role)
VALUES (user_id, tenant_id, 'owner');

-- Step 4: Crea profilo utente (trigger automatico o manuale)
UPDATE user_profiles
SET full_name = 'Nome Cognome', position = 'Titolare'
WHERE user_id = user_id;

-- Step 5: Crea profilo tenant
INSERT INTO tenant_profiles (tenant_id, ragione_sociale, onboarding_completed)
VALUES (tenant_id, company_name, FALSE);
```

**✅ ROLLBACK automatico se fallisce:**
- Se tenant creation fallisce → cancella user
- Se user_tenants fallisce → cancella tenant E user
- Garantisce consistenza dati

**Risposta:**
```json
{
  "success": true,
  "user_id": "uuid",
  "tenant_id": "uuid",
  "email": "user@example.com"
}
```

---

### 2️⃣ **LOGIN** (`/sign-in`)

**Cosa succede:**
```
1. Utente inserisce email + password
2. Supabase Auth verifica credenziali
3. Crea session cookie
4. Redirect → middleware controlla stato
```

---

### 3️⃣ **MIDDLEWARE** (`middleware.ts`)

**OGNI richiesta passa da qui:**

```typescript
// 1. Verifica autenticazione
const { user } = await supabase.auth.getUser();

// 2. Se NON autenticato e va su /dashboard o /onboarding → redirect /sign-in
if (!user && (pathname === '/dashboard' || pathname === '/onboarding')) {
  redirect('/sign-in');
}

// 3. Se autenticato:
if (user) {
  // a) Ottieni tenant
  const userTenant = await db.user_tenants
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  // b) Ottieni profilo tenant
  const profile = await db.tenant_profiles
    .select('onboarding_completed')
    .eq('tenant_id', userTenant.tenant_id)
    .single();

  // c) Controlla onboarding
  if (!profile.onboarding_completed && !pathname.includes('/onboarding')) {
    redirect('/onboarding/step-1');
  }

  // d) Se onboarding completato e va su /sign-in → redirect /dashboard
  if (profile.onboarding_completed && pathname === '/sign-in') {
    redirect('/dashboard');
  }
}
```

**⚠️ PROBLEMA POTENZIALE:**
- Se `user_tenants` è vuoto → crash
- Se `tenant_profiles` è vuoto → crash
- ❌ Manca gestione errori se tenant non esiste

---

### 4️⃣ **ONBOARDING STEP-1** (`/onboarding/step-1`)

**Caricamento:**
```typescript
useEffect(() => {
  loadTenantData(); // ← ASYNC, potrebbe essere lenta
}, []);

const loadTenantData = async () => {
  // 1. Get user
  const { user } = await supabase.auth.getUser();

  // 2. Get tenant
  const userTenant = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single(); // ← ⚠️ Può fallire se non esiste

  setTenantId(userTenant.tenant_id); // ← State update

  // 3. Load existing profile
  const profile = await supabase
    .from('tenant_profiles')
    .select('*')
    .eq('tenant_id', userTenant.tenant_id)
    .single();

  // 4. Popola form
  setFormData({...profile});
};
```

**Submit:**
```typescript
const handleSubmit = async () => {
  // UPDATE tenant_profiles
  await supabase
    .from('tenant_profiles')
    .update({...formData})
    .eq('tenant_id', tenantId); // ← Usa tenantId da state

  router.push('/onboarding/step-2');
};
```

**⚠️ PROBLEMI IDENTIFICATI:**
- ❌ **RACE CONDITION**: Se tenantId non è ancora caricato quando l'utente clicca "Continua", la query fallisce
- ❌ Nessun loading state mentre carica tenant
- ❌ Nessun error handling se tenant non esiste

---

### 5️⃣ **ONBOARDING STEP-2** (`/onboarding/step-2`)

**Stesso problema dello step-1:**
```typescript
const [tenantId, setTenantId] = useState<string>(''); // ← Inizialmente vuoto!

useEffect(() => {
  loadTenantData(); // ASYNC
}, []);

// ⚠️ Se utente clicca "Salta per ora" PRIMA che loadTenantData finisca:
const handleSkip = async () => {
  await supabase
    .from('tenant_profiles')
    .update({onboarding_completed: true})
    .eq('tenant_id', tenantId); // ← tenantId = '' ❌ QUERY VUOTA!
};
```

**✅ FIX APPLICATO:**
```typescript
// Mostra loading se tenantId non caricato
if (!tenantId) {
  return <LoadingSpinner />;
}

// Check prima di operazioni
const handleSkip = async () => {
  if (!tenantId) {
    toast.error('Errore: ricarica la pagina');
    return;
  }
  // ... procedi
};
```

---

### 6️⃣ **USER CONTEXT** (Globale app)

**Caricamento globale dati:**
```typescript
// All'avvio app:
useEffect(() => {
  loadUserData();
}, []);

const loadUserData = async () => {
  // 1. Get auth user
  const { user } = await supabase.auth.getUser();

  // 2. Get user_tenant
  const userTenant = await supabase
    .from('user_tenants')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  if (!userTenant) {
    // ⚠️ Tenant non trovato → user = null, tenant = null
    setUser(null);
    setTenant(null);
    return;
  }

  // 3. Get tenant_profile
  const tenantProfile = await supabase
    .from('tenant_profiles')
    .select('ragione_sociale, logo_url')
    .eq('tenant_id', userTenant.tenant_id)
    .single();

  // 4. Set global state
  setUser({userId, email, fullName, role});
  setTenant({tenantId, ragioneSociale, logoUrl});
};
```

**Usato in:**
- Sidebar (logo, nome azienda)
- Navbar (nome utente)
- Tutte le pagine che necessitano tenantId

---

## 🔴 PROBLEMI IDENTIFICATI

### 1. **RACE CONDITIONS negli Onboarding Steps**
**Problema:**
```typescript
// tenantId viene settato DOPO useEffect
const [tenantId, setTenantId] = useState<string>('');

useEffect(() => {
  loadTenantData(); // async - ci mette tempo
}, []);

// Utente clicca PRIMA che finisca
handleSubmit(); // ← usa tenantId = '' ❌
```

**Soluzione:** ✅ APPLICATA
- Loading spinner finché tenantId non è caricato
- Check `if (!tenantId)` prima di ogni operazione

---

### 2. **Middleware non gestisce tenant mancante**
**Problema:**
```typescript
const { data: userTenant } = await supabase
  .from('user_tenants')
  .select('tenant_id')
  .eq('user_id', user.id)
  .single(); // ← Se non esiste → crash

// Nessun check su userTenant!
const { data: profile } = await supabase
  .from('tenant_profiles')
  .select('onboarding_completed')
  .eq('tenant_id', userTenant.tenant_id); // ← userTenant potrebbe essere null!
```

**Soluzione:** ⚠️ DA APPLICARE
- Aggiungere check `if (!userTenant)` → redirect a pagina errore o re-signup

---

### 3. **UserContext fallisce silenziosamente**
**Problema:**
```typescript
const { data: userTenant } = await supabase
  .from('user_tenants')
  .select('tenant_id, role')
  .eq('user_id', user.id)
  .single();

if (!userTenant) {
  setUser(null);
  setTenant(null);
  return; // ← Utente rimane logged ma senza tenant!
}
```

**Effetto:**
- Navbar/Sidebar crashano
- Pagine non caricano dati
- Nessun messaggio errore all'utente

**Soluzione:** ⚠️ DA APPLICARE
- Se tenant manca → logout automatico + messaggio
- Oppure redirect a pagina "Contatta supporto"

---

### 4. **Nessun error boundary**
**Problema:**
- Se query DB falliscono → crash silenzioso
- Console log ma nessun feedback utente

**Soluzione:** ⚠️ DA APPLICARE
- Try/catch con toast.error
- Error boundaries React

---

## ✅ FIXES DA APPLICARE

### Fix 1: Middleware più robusto
```typescript
// middleware.ts
if (user) {
  const { data: userTenant, error } = await supabase
    .from('user_tenants')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single();

  // ✅ Gestione errore
  if (error || !userTenant) {
    console.error('Tenant not found for user', user.id);
    // Logout e redirect a errore
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/tenant-error', request.url));
  }

  // Continua...
}
```

### Fix 2: UserContext con error handling
```typescript
const loadUserData = async () => {
  try {
    // ... codice esistente ...

    if (!userTenant) {
      // ✅ Logout se tenant manca
      await supabase.auth.signOut();
      toast.error('Errore: tenant non trovato. Contatta il supporto.');
      router.push('/sign-in');
      return;
    }

  } catch (error) {
    console.error('Fatal error loading user:', error);
    toast.error('Errore di caricamento. Riprova.');
  }
};
```

### Fix 3: Onboarding con loading guarantee
```typescript
const [isReady, setIsReady] = useState(false);

useEffect(() => {
  const init = async () => {
    await loadTenantData();
    setIsReady(true);
  };
  init();
}, []);

if (!isReady || !tenantId) {
  return <LoadingScreen />;
}

// Ora è sicuro procedere
```

---

## 📊 STATO ATTUALE

| Componente | Stato | Problema |
|------------|-------|----------|
| Signup API | ✅ OK | Rollback automatico funziona |
| Middleware | ⚠️ FRAGILE | Non gestisce tenant mancante |
| UserContext | ⚠️ FRAGILE | Fallisce silenziosamente |
| Step-1 | ✅ FIXATO | Loading check aggiunto |
| Step-2 | ✅ FIXATO | Loading check aggiunto |
| Dashboard | ⚠️ DA TESTARE | Dipende da UserContext |

---

## 🎯 RACCOMANDAZIONI

1. **CRITICO**: Fixare middleware per gestire tenant mancante
2. **CRITICO**: UserContext deve fare logout se tenant manca
3. **IMPORTANTE**: Aggiungere error boundaries
4. **NICE TO HAVE**: Pagina `/tenant-error` con istruzioni supporto
