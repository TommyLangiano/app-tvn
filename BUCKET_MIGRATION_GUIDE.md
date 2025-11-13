# 🔄 Guida Migrazione Bucket: `fatture-documents` → `app-storage`

## 📋 Panoramica

Questa guida ti aiuta a migrare tutti i file esistenti dal vecchio bucket `fatture-documents` al nuovo bucket `app-storage` senza perdita di dati.

---

## ✅ Pre-requisiti

- [x] Codice aggiornato (tutto punta già ad `app-storage`)
- [ ] Nuovo bucket `app-storage` creato in Supabase
- [ ] File esistenti in `fatture-documents` da migrare
- [ ] Accesso al Supabase Service Role Key

---

## 🚀 Procedura di Migrazione

### **Step 1: Applicare Migrazione Database**

Crea il nuovo bucket `app-storage` con le policies:

```bash
cd /Users/tommylangiano/Desktop/app.tvn.com
npx supabase db push
```

Questo applica la migrazione `20250113000005_create_app_storage_bucket.sql` che:
- ✅ Crea il bucket `app-storage`
- ✅ Configura tutte le RLS policies
- ✅ Mantiene il bucket `fatture-documents` intatto (per ora)

---

### **Step 2: Installare Dipendenze Script**

```bash
cd /Users/tommylangiano/Desktop/app.tvn.com/scripts
npm install
```

---

### **Step 3: Eseguire Script di Migrazione**

```bash
cd /Users/tommylangiano/Desktop/app.tvn.com/scripts
npm run migrate
```

Lo script:
1. 📋 Lista tutti i file in `fatture-documents`
2. 📦 Copia ogni file in `app-storage` mantenendo la struttura
3. ✅ Verifica la copia
4. 📊 Stampa report finale

**Esempio Output:**
```
🚀 Starting bucket migration: fatture-documents → app-storage

📦 Found 3 top-level items to migrate

📄 Migrating: abc123/fatture/attive/comm1/fattura.pdf
   ✅ Copied successfully
📄 Migrating: abc123/logos/logo.png
   ✅ Copied successfully
📄 Migrating: def456/rapportini/rapp1/photo.jpg
   ✅ Copied successfully

============================================================
📊 MIGRATION REPORT
============================================================
Total files:   150
Copied:        150 ✅
Skipped:       0 ⏭️
Failed:        0 ❌
============================================================

✅ Migration completed successfully!

⚠️  NEXT STEPS:
1. Verify files in Supabase Dashboard (Storage → app-storage)
2. Update your code to use app-storage (already done ✅)
3. Test the application thoroughly
4. Once confirmed, manually delete fatture-documents bucket
```

---

### **Step 4: Verificare la Migrazione**

#### **Via Supabase Dashboard**

1. Vai su **Supabase Dashboard** → **Storage**
2. Apri bucket `app-storage`
3. Verifica che la struttura delle cartelle sia identica:
   ```
   app-storage/
     ├── {tenant_id}/
     │   ├── fatture/
     │   ├── logos/
     │   ├── documenti/
     │   └── rapportini/
   ```
4. Confronta numero di file con `fatture-documents`

#### **Via Query SQL**

```sql
-- Conta file in fatture-documents
SELECT COUNT(*) as old_bucket_files
FROM storage.objects
WHERE bucket_id = 'fatture-documents';

-- Conta file in app-storage
SELECT COUNT(*) as new_bucket_files
FROM storage.objects
WHERE bucket_id = 'app-storage';

-- I numeri devono essere uguali
```

---

### **Step 5: Testare l'Applicazione**

Verifica che tutto funzioni con il nuovo bucket:

1. **Test Upload**
   - Vai su una commessa
   - Carica una fattura → Deve salvare in `app-storage`

2. **Test Download**
   - Apri una fattura esistente → Deve caricare correttamente
   - Controlla network tab: URL deve contenere `app-storage`

3. **Test Delete**
   - Elimina un file → Deve eliminare da `app-storage`

4. **Test Rapportini**
   - Crea nuovo rapportino con foto
   - Verifica upload in `app-storage/{tenant_id}/rapportini/`

---

### **Step 6: Cleanup (Solo dopo verifica completa!)**

⚠️ **ATTENZIONE:** Fai questo SOLO dopo aver verificato che tutto funziona!

#### **Opzione A: Eliminare via Dashboard**
1. Supabase Dashboard → Storage
2. Seleziona bucket `fatture-documents`
3. Clicca "Delete bucket"
4. Conferma eliminazione

#### **Opzione B: Eliminare via SQL**
```sql
-- ⚠️ IRREVERSIBILE! Backup prima!
DELETE FROM storage.objects WHERE bucket_id = 'fatture-documents';
DELETE FROM storage.buckets WHERE id = 'fatture-documents';
```

---

## 🆘 Troubleshooting

### **Script fallisce con errore autenticazione**

```
❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
```

**Soluzione:**
- Verifica che `.env.local` contenga:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
  ```
- Verifica path in `migrate-bucket.ts` (riga 13)

---

### **Alcuni file falliscono la migrazione**

```
📊 MIGRATION REPORT
Failed:        5 ❌
```

**Soluzione:**
1. Controlla i log sopra per vedere quali file
2. Verifica permessi RLS
3. Riprova lo script (skipperà i file già copiati)
4. Copia manualmente i file mancanti via Dashboard

---

### **File già esistono in app-storage**

```
⏭️  Already exists, skipping
```

**Soluzione:**
- È normale! Lo script skippa file già copiati
- Puoi rieseguirlo più volte senza problemi

---

### **App continua a usare fatture-documents**

**Causa:** Codice non aggiornato

**Soluzione:**
```bash
# Verifica che tutti i file usino app-storage
grep -r "fatture-documents" apps/web --include="*.ts" --include="*.tsx"

# Se trova file, significa che il replace non ha funzionato
```

---

## 📊 Checklist Finale

Prima di eliminare `fatture-documents`:

- [ ] Migrazione completata senza errori (0 failed)
- [ ] Stesso numero di file in entrambi i bucket
- [ ] Upload funziona correttamente
- [ ] Download funziona correttamente
- [ ] Delete funziona correttamente
- [ ] Testato su tutti i moduli (fatture, rapportini, documenti)
- [ ] Testato con utenti di tenant diversi (RLS funziona)
- [ ] Backup creato (opzionale ma consigliato)

---

## 🔙 Rollback Plan

Se qualcosa va storto:

### **Piano A: Codice rollback temporaneo**
```bash
# Ripristina codice a usare fatture-documents
git stash
# Testa che tutto funzioni
```

### **Piano B: Rimigrare da fatture-documents**
1. Elimina bucket `app-storage`
2. Ricrea da zero
3. Ri-esegui script migrazione

### **Piano C: Mantenere entrambi i bucket**
- Codice usa `app-storage`
- Mantieni `fatture-documents` come backup "read-only"
- Elimina dopo 30 giorni

---

## 📞 Supporto

Se incontri problemi:
1. Controlla i log dello script
2. Verifica policies RLS in Supabase
3. Testa con Service Role Key direttamente
4. Controlla bucket permissions

---

**Data creazione:** 2025-01-13
**Versione:** 1.0.0
**Status:** ✅ Ready for Production Migration
