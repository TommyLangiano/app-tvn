# Configurazione Inviti Utente

## 📋 Panoramica del Flusso

Quando un admin invita un nuovo utente:

1. **Admin crea invito** → API `/api/users/create`
2. **Sistema crea utente** → `auth.users` (stato: `INVITED`)
3. **Trigger automatico** → Crea record in `user_profiles`
4. **API aggiunge utente al tenant** → Record in `user_tenants` con tenant e ruolo
5. **Supabase invia email** → Con link personalizzato
6. **Utente clicca link** → Va su `/auth/accept-invite`
7. **Utente imposta password** → Prima volta
8. **Sistema conferma account** → Stato diventa `CONFIRMED`
9. **Redirect automatico** → `/dashboard`

## 🔧 Configurazione Supabase Dashboard

### 1. Redirect URLs (Authentication → URL Configuration)

Vai su: `https://supabase.com/dashboard/project/[PROJECT_ID]/auth/url-configuration`

**Aggiungi questi URL:**

**Per sviluppo locale:**
```
http://localhost:3000/auth/accept-invite
http://localhost:3000/auth/callback
```

**Per produzione:**
```
https://app-tvn-ftv2.vercel.app/auth/accept-invite
https://app-tvn-ftv2.vercel.app/auth/callback
https://app-tvn-ftv2.vercel.app/**
```

**Site URL:**
- Sviluppo: `http://localhost:3000`
- Produzione: `https://app-tvn-ftv2.vercel.app`

---

### 2. Email Templates (Authentication → Email Templates)

Vai su: `https://supabase.com/dashboard/project/[PROJECT_ID]/auth/templates`

#### **Template: Invite User**

**Subject:**
```
Sei stato invitato su {{.SiteName}}
```

**Body HTML:**
```html
<h2>Benvenuto!</h2>

<p>Sei stato invitato a unirti alla piattaforma <strong>{{.SiteName}}</strong>.</p>

<p>Clicca sul pulsante qui sotto per accettare l'invito e impostare la tua password:</p>

<p>
  <a href="{{ .SiteURL }}/auth/accept-invite?token={{ .TokenHash }}&type=invite"
     style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
    Accetta l'invito
  </a>
</p>

<p>Oppure copia e incolla questo link nel tuo browser:</p>
<p style="font-size: 12px; color: #666; word-break: break-all;">
  {{ .SiteURL }}/auth/accept-invite?token={{ .TokenHash }}&type=invite
</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;">

<p style="font-size: 12px; color: #666;">
  Questo link scadrà tra 24 ore. Se non hai richiesto questo invito, ignora questa email.
</p>
```

---

### 3. Variabili Ambiente Vercel

Vai su: `https://vercel.com/[USERNAME]/app-tvn/settings/environment-variables`

**Aggiungi/Verifica:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://clwfrwgmqwfofraqqmms.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[la tua anon key]
SUPABASE_SERVICE_ROLE_KEY=[la tua service role key]

# Site URL per email
NEXT_PUBLIC_SITE_URL=https://app-tvn-ftv2.vercel.app
```

**IMPORTANTE:** Dopo aver aggiunto/modificato variabili, fai un **Redeploy** del progetto su Vercel!

---

## 🔄 Cosa Succede nel Database

### Al momento dell'invito (API create):

**1. `auth.users`** (creato da Supabase)
```sql
id: [uuid generato]
email: "nuovo.utente@example.com"
email_confirmed_at: NULL
last_sign_in_at: NULL
raw_user_meta_data: {
  "first_name": "Mario",
  "last_name": "Rossi",
  "full_name": "Mario Rossi"
}
```

**2. `user_profiles`** (creato automaticamente dal trigger)
```sql
user_id: [uuid dell'utente]
email: "nuovo.utente@example.com"
full_name: "Mario Rossi"
first_name: "Mario"
last_name: "Rossi"
email_confirmed_at: NULL
last_sign_in_at: NULL
```

**3. `user_tenants`** (creato dall'API)
```sql
user_id: [uuid dell'utente]
tenant_id: [uuid del tenant dell'admin]
role: "operaio" (o quello scelto)
created_by: [uuid dell'admin che ha creato l'invito]
is_active: true
```

### Al primo login (dopo accept-invite):

**Aggiornamenti automatici:**

**1. `auth.users`**
```sql
email_confirmed_at: NOW()
last_sign_in_at: NOW()
encrypted_password: [hash della password]
```

**2. `user_profiles`** (aggiornato dal trigger)
```sql
email_confirmed_at: NOW()
last_sign_in_at: NOW()
```

**3. `user_tenants`** → Nessuna modifica (è già tutto pronto!)

---

## 🧪 Test del Flusso

### Test in locale:

1. Avvia il server: `npm run dev`
2. Accedi come admin
3. Vai su Gestione Utenti → Nuovo Utente
4. Inserisci email, nome, cognome, ruolo
5. Clicca "Crea Utente e Invia Invito"
6. Controlla la console di Supabase per il link di invito (in sviluppo, le email non vengono inviate)
7. Apri il link manualmente
8. Imposta password
9. Verifica redirect a `/dashboard`

### Test in produzione:

1. Configura tutto come sopra
2. Admin crea invito
3. Email viene inviata automaticamente
4. Utente clicca sul link nell'email
5. Imposta password
6. Accede alla dashboard

---

## ❗ Problemi Comuni

### "Link di invito non valido"
- Verifica che il token sia presente nell'URL (`?token=xxx&type=invite`)
- I link scadono dopo 24 ore
- Rigenera l'invito se necessario

### "Email non arriva"
- Verifica che SMTP sia configurato su Supabase (per default usa servizio Supabase)
- Controlla spam/posta indesiderata
- In sviluppo, le email non vengono inviate - usa i log di Supabase

### "Redirect loop"
- Verifica che le Redirect URLs siano configurate correttamente
- Controlla che `NEXT_PUBLIC_SITE_URL` sia impostato correttamente

### "Utente creato ma non nel tenant"
- Verifica che `SUPABASE_SERVICE_ROLE_KEY` sia configurata su Vercel
- Controlla i log dell'API per errori

---

## 📝 Note Importanti

1. **Il tenant è assegnato subito** al momento della creazione, NON al primo login
2. **Non serve creare nuovi tenant** - l'utente viene aggiunto al tenant dell'admin che lo invita
3. **I trigger gestiscono automaticamente** la sincronizzazione tra `auth.users` e `user_profiles`
4. **Gli utenti invitati non possono accedere** finché non impostano una password
5. **I link di invito scadono** dopo 24 ore (configurabile su Supabase)

---

## 🔐 Sicurezza

- ✅ Le password vengono hashate da Supabase (bcrypt)
- ✅ I link di invito sono usa-e-getta (token hash)
- ✅ RLS policies proteggono l'accesso ai dati
- ✅ Service role key usata solo lato server
- ✅ Admin possono invitare solo nel proprio tenant
