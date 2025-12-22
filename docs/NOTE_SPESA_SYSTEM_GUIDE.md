# Sistema Gestione Note Spesa - Guida Completa

## Indice
1. [Overview](#overview)
2. [Architettura Database](#architettura-database)
3. [Stati e Transizioni](#stati-e-transizioni)
4. [Workflow Completo](#workflow-completo)
5. [Esempi Query TypeScript](#esempi-query-typescript)
6. [API Functions](#api-functions)
7. [Gestione Allegati](#gestione-allegati)
8. [Permessi e Sicurezza](#permessi-e-sicurezza)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Il sistema Note Spesa gestisce le richieste di rimborso spese dei dipendenti con un workflow di approvazione configurabile per commessa.

### Caratteristiche Principali
- Workflow approvazione flessibile (abilitabile/disabilitabile per commessa)
- Audit trail completo di tutte le azioni
- Categorie personalizzabili per tenant
- Upload multipli allegati (scontrini/fatture)
- Integrazione automatica nel riepilogo economico commessa
- Rate limiting anti-spam
- Numerazione progressiva automatica

---

## Architettura Database

### Tabelle Principali

#### 1. `note_spesa`
Tabella core per le note spesa.

**Campi chiave:**
- `stato`: bozza | da_approvare | approvato | rifiutato
- `allegati`: JSONB array di oggetti allegato
- `numero_nota`: Progressivo tenant/anno (es: 2025-0001)
- `approvato_da`, `approvato_il`: Chi e quando ha approvato
- `rifiutato_da`, `rifiutato_il`, `motivo_rifiuto`: Chi, quando e perché ha rifiutato

**Constraints:**
- `importo > 0`
- `data_nota <= CURRENT_DATE` (no date future)
- `motivo_rifiuto` obbligatorio se `stato = 'rifiutato'`
- Approvato/Rifiutato da/il coerenti con stato

#### 2. `note_spesa_azioni`
Audit trail completo.

**Azioni tracciate:**
- `creata`: Nota spesa creata
- `modificata`: Dati modificati
- `sottomessa`: Passaggio a da_approvare
- `approvata`: Approvazione
- `rifiutata`: Rifiuto con motivo
- `eliminata`: Cancellazione

#### 3. `categorie_note_spesa`
Categorie personalizzabili per tenant.

**Categorie default:**
- TRASPORTI (Taxi, carburante, parcheggi)
- VITTO (Ristoranti, pranzi) - limite 50€
- ALLOGGIO (Hotel, B&B)
- MATERIALI (Forniture, attrezzature)
- FORMAZIONE (Corsi, libri)
- COMUNICAZIONE (Telefono, internet) - limite 100€
- RAPPRESENTANZA (Omaggi clienti) - limite 200€
- ALTRO (Non classificate)

**Campi validazione:**
- `importo_massimo`: Limite categoria (opzionale)
- `richiede_allegato`: Se true, allegato obbligatorio

#### 4. `commesse_impostazioni_approvazione`
Configurazione approvazione per commessa (condivisa con rapportini).

**Campi:**
- `tipo_approvazione`: 'presenze' | 'note_spesa'
- `abilitato`: true/false
- `approvatori`: Array UUID dipendenti

---

## Stati e Transizioni

### Diagramma Stati

```
[CREATE]
   │
   ├─→ [BOZZA] ──────────────┐
   │     │                   │
   │     │ (completa)        │ (modifica)
   │     ↓                   │
   │  [Check Config]         │
   │     │                   │
   │     ├─[Disabled]─→ APPROVATO
   │     │
   │     └─[Enabled]─→ DA_APPROVARE
   │                      │
   │                      ├─[Approve]─→ APPROVATO (finale)
   │                      │
   │                      └─[Reject]──→ RIFIUTATO
   │                                        │
   └────────────────────────────────────────┘
```

### Transizioni Permesse

| Da           | A             | Chi può             | Quando                    |
|--------------|---------------|---------------------|---------------------------|
| -            | bozza         | Dipendente          | Creazione incompleta      |
| bozza        | da_approvare  | Dipendente          | Submit con approv. attiva |
| bozza        | approvato     | Sistema             | Submit con approv. off    |
| da_approvare | approvato     | Approvatore/Admin   | Approva                   |
| da_approvare | rifiutato     | Approvatore/Admin   | Rifiuta (con motivo)      |
| rifiutato    | da_approvare  | Dipendente          | Corregge e ri-sottomette  |

**Stati finali:**
- `approvato`: IMMUTABILE, integrato in riepilogo economico

---

## Workflow Completo

### Scenario 1: Approvazione Disabilitata (Auto-Approved)

```typescript
// 1. Dipendente crea nota spesa
const { data: notaSpesa } = await supabase
  .from('note_spesa')
  .insert({
    commessa_id: '...',
    dipendente_id: '...', // Auto dal profilo utente
    data_nota: '2025-02-20',
    importo: 45.50,
    categoria: 'TRASPORTI',
    descrizione: 'Taxi per visita cliente ABC',
    allegati: [
      {
        url: 'note_spesa_allegati/tenant/.../scontrino.jpg',
        tipo: 'scontrino',
        nome: 'taxi_20250220.jpg',
        size: 234567
      }
    ]
    // stato: NON specificato → trigger imposterà 'approvato'
  })
  .select()
  .single();

// Risultato: stato = 'approvato' automaticamente
// ✓ Già disponibile per rimborso
// ✓ Già conteggiato in riepilogo economico
```

### Scenario 2: Approvazione Abilitata (Workflow Completo)

```typescript
// ============================================================
// STEP 1: Dipendente crea nota spesa
// ============================================================
const { data: notaSpesa } = await supabase
  .from('note_spesa')
  .insert({
    commessa_id: 'commessa-uuid',
    dipendente_id: 'dipendente-uuid',
    data_nota: '2025-02-20',
    importo: 125.00,
    categoria: 'VITTO',
    descrizione: 'Pranzo con cliente XYZ',
    allegati: [
      {
        url: 'note_spesa_allegati/.../scontrino.pdf',
        tipo: 'pdf',
        nome: 'ristorante.pdf',
        size: 456789
      }
    ]
  })
  .select()
  .single();

// Risultato: stato = 'da_approvare'
// Trigger automatici:
// - Genera numero_nota: '2025-0001'
// - Crea audit: { azione: 'creata', stato_nuovo: 'da_approvare' }

// ============================================================
// STEP 2: Approvatore visualizza note pending
// ============================================================
const { data: notePending } = await supabase
  .from('note_spesa')
  .select(`
    *,
    dipendenti:dipendente_id (nome, cognome, email),
    commesse:commessa_id (nome_commessa, codice_commessa),
    categorie_note_spesa!inner (colore, icona, importo_massimo)
  `)
  .eq('stato', 'da_approvare')
  .eq('commesse.id', 'commessa-uuid') // Solo commesse dove sono approvatore
  .order('created_at', { ascending: true }); // FIFO

// ============================================================
// STEP 3A: Approvatore APPROVA
// ============================================================
const { data: approved } = await supabase.rpc('approva_nota_spesa', {
  p_nota_spesa_id: notaSpesa.id,
  p_tenant_id: 'tenant-uuid'
});

// Risultato:
// {
//   success: true,
//   data: {
//     id: '...',
//     stato: 'approvato',
//     approvato_il: '2025-02-20T15:30:00Z'
//   }
// }

// Trigger automatici:
// - Update: stato='approvato', approvato_da=user_id, approvato_il=NOW()
// - Audit: { azione: 'approvata', stato_precedente: 'da_approvare', stato_nuovo: 'approvato' }
// - Integrazione riepilogo economico (view aggiornata)

// ============================================================
// STEP 3B: Approvatore RIFIUTA
// ============================================================
const { data: rejected } = await supabase.rpc('rifiuta_nota_spesa', {
  p_nota_spesa_id: notaSpesa.id,
  p_tenant_id: 'tenant-uuid',
  p_motivo: 'Importo troppo elevato. Limite categoria VITTO: 50€. Richiedere approvazione management.'
});

// Risultato: stato = 'rifiutato'
// motivo_rifiuto salvato

// ============================================================
// STEP 4: Dipendente corregge e ri-sottomette
// ============================================================
// Dipendente visualizza motivo rifiuto
const { data: myRejected } = await supabase
  .from('note_spesa')
  .select('*, auth.users!rifiutato_da (email)')
  .eq('dipendente_id', 'my-dipendente-id')
  .eq('stato', 'rifiutato');

// Dipendente modifica
const { data: updated } = await supabase
  .from('note_spesa')
  .update({
    importo: 50.00, // Corregge
    descrizione: 'Pranzo con cliente XYZ (corretta voce)',
    stato: 'da_approvare', // Ri-sottomette
    motivo_rifiuto: null, // Pulisce
    rifiutato_da: null,
    rifiutato_il: null
  })
  .eq('id', notaSpesa.id)
  .eq('stato', 'rifiutato') // Safety check
  .select()
  .single();

// Torna in coda approvazione → STEP 2
```

---

## Esempi Query TypeScript

### Dashboard Dipendente

```typescript
// Tutte le mie note spesa con dettagli
interface NotaSpesaWithDetails {
  id: string;
  numero_nota: string;
  data_nota: string;
  importo: number;
  categoria: string;
  descrizione: string;
  stato: 'bozza' | 'da_approvare' | 'approvato' | 'rifiutato';
  allegati: Array<{
    url: string;
    tipo: string;
    nome: string;
    size: number;
  }>;
  motivo_rifiuto?: string;
  commesse: {
    nome_commessa: string;
    codice_commessa: string;
  };
  categoria_details: {
    nome: string;
    colore: string;
    icona: string;
  };
  gestita_da?: string; // Nome approvatore/rifiutatore
  gestita_il?: string;
}

const { data: myExpenses } = await supabase
  .from('note_spesa')
  .select(`
    *,
    commesse:commessa_id (nome_commessa, codice_commessa),
    categoria_details:categorie_note_spesa!categoria (nome, colore, icona)
  `)
  .eq('dipendente_id', currentDipendenteId)
  .order('data_nota', { ascending: false });

// Statistiche per anno corrente
const { data: stats } = await supabase
  .rpc('get_my_expense_stats', {
    p_dipendente_id: currentDipendenteId,
    p_anno: 2025
  });
```

### Dashboard Approvatore

```typescript
// Note da approvare per le mie commesse
const { data: pendingExpenses } = await supabase
  .from('note_spesa')
  .select(`
    *,
    dipendenti:dipendente_id (nome, cognome, email),
    commesse:commessa_id (nome_commessa, codice_commessa),
    categorie_note_spesa!categoria (nome, colore, icona, importo_massimo, richiede_allegato)
  `)
  .eq('stato', 'da_approvare')
  .in('commessa_id', myApproverCommesseIds)
  .order('created_at', { ascending: true }); // FIFO

// Validazioni client-side
pendingExpenses.forEach(nota => {
  const categoria = nota.categorie_note_spesa;

  // Warning se supera limite
  if (categoria.importo_massimo && nota.importo > categoria.importo_massimo) {
    console.warn(`Nota ${nota.numero_nota} supera limite categoria: ${nota.importo} > ${categoria.importo_massimo}`);
  }

  // Warning se manca allegato
  if (categoria.richiede_allegato && nota.allegati.length === 0) {
    console.warn(`Nota ${nota.numero_nota} richiede allegato obbligatorio`);
  }
});
```

### Report Commessa

```typescript
// Riepilogo economico con note spesa
const { data: economico } = await supabase
  .from('riepilogo_economico_commessa')
  .select('*')
  .eq('commessa_id', commessaId)
  .single();

// Risultato include:
// - ricavi_totali: da fatture_attive
// - costi_fatture_totali: da fatture_passive
// - costi_note_spesa: da note_spesa APPROVATE
// - costi_totali: costi_fatture + costi_note_spesa
// - margine_lordo: ricavi - costi_totali
// - margine_percentuale: (margine_lordo / ricavi) * 100

// Dettaglio note spesa per categoria
const { data: breakdown } = await supabase
  .from('note_spesa')
  .select('categoria, importo')
  .eq('commessa_id', commessaId)
  .eq('stato', 'approvato');

const byCategory = breakdown.reduce((acc, nota) => {
  acc[nota.categoria] = (acc[nota.categoria] || 0) + nota.importo;
  return acc;
}, {} as Record<string, number>);
```

### Audit Trail

```typescript
// Storico azioni su nota spesa
const { data: auditLog } = await supabase
  .from('note_spesa_azioni')
  .select(`
    *,
    auth.users!eseguita_da (email)
  `)
  .eq('nota_spesa_id', notaSpesaId)
  .order('eseguita_il', { ascending: true });

// Timeline eventi:
// [
//   { azione: 'creata', eseguita_da: 'mario.rossi@...', eseguita_il: '...', stato_nuovo: 'da_approvare' },
//   { azione: 'rifiutata', eseguita_da: 'luca.bianchi@...', eseguita_il: '...', motivo: '...' },
//   { azione: 'modificata', eseguita_da: 'mario.rossi@...', eseguita_il: '...', dati_modificati: {...} },
//   { azione: 'approvata', eseguita_da: 'luca.bianchi@...', eseguita_il: '...', stato_nuovo: 'approvato' }
// ]
```

---

## API Functions

### `approva_nota_spesa(p_nota_spesa_id, p_tenant_id)`

**Descrizione:** Approva una nota spesa.

**Autorizzazione:** Solo approvatori configurati per la commessa o Admin/Owner.

**Validazioni:**
- Nota spesa deve esistere
- Stato deve essere 'da_approvare'
- User deve essere approvatore autorizzato

**Ritorna:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "stato": "approvato",
    "approvato_il": "2025-02-20T15:30:00Z"
  }
}
```

**Esempio:**
```typescript
const { data } = await supabase.rpc('approva_nota_spesa', {
  p_nota_spesa_id: 'nota-uuid',
  p_tenant_id: 'tenant-uuid'
});

if (!data.success) {
  console.error(data.error);
}
```

### `rifiuta_nota_spesa(p_nota_spesa_id, p_tenant_id, p_motivo)`

**Descrizione:** Rifiuta una nota spesa con motivazione obbligatoria.

**Autorizzazione:** Solo approvatori configurati per la commessa o Admin/Owner.

**Validazioni:**
- Motivo obbligatorio (non vuoto)
- Nota spesa deve esistere
- Stato deve essere 'da_approvare'
- User deve essere approvatore autorizzato

**Ritorna:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "stato": "rifiutato",
    "rifiutato_il": "2025-02-20T15:35:00Z",
    "motivo_rifiuto": "Importo non giustificato..."
  }
}
```

**Esempio:**
```typescript
const { data } = await supabase.rpc('rifiuta_nota_spesa', {
  p_nota_spesa_id: 'nota-uuid',
  p_tenant_id: 'tenant-uuid',
  p_motivo: 'Importo non conforme al tariffario aziendale. Limite pranzi: 35€'
});
```

### `crea_categorie_default_note_spesa(p_tenant_id, p_created_by)`

**Descrizione:** Crea categorie default per nuovo tenant.

**Chiamata:** Automatica via trigger su `INSERT tenants`.

**Categorie create:**
1. TRASPORTI
2. VITTO (limite 50€)
3. ALLOGGIO
4. MATERIALI
5. FORMAZIONE
6. COMUNICAZIONE (limite 100€)
7. RAPPRESENTANZA (limite 200€)
8. ALTRO

---

## Gestione Allegati

### Storage Bucket: `note_spesa_allegati`

**Configurazione:**
- Privato (no accesso pubblico)
- Max file size: 10MB
- Tipi ammessi: PDF, JPG, JPEG, PNG, WEBP

**Struttura path:**
```
{tenant_id}/{commessa_id}/{nota_spesa_id}/{filename}
```

**Esempio:**
```
abc123.../def456.../ghi789.../scontrino_ristorante.pdf
```

### Upload Allegato

```typescript
// 1. Upload file
const file = event.target.files[0];
const fileName = `${Date.now()}_${file.name}`;
const filePath = `${tenantId}/${commessaId}/${notaSpesaId}/${fileName}`;

const { data: uploadData, error: uploadError } = await supabase.storage
  .from('note_spesa_allegati')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  });

if (uploadError) throw uploadError;

// 2. Get public URL (signed URL for private bucket)
const { data: urlData } = await supabase.storage
  .from('note_spesa_allegati')
  .createSignedUrl(filePath, 3600); // 1h validity

// 3. Update note_spesa.allegati
const allegato = {
  url: filePath, // Store path, not URL (più sicuro)
  tipo: file.type.includes('pdf') ? 'pdf' : 'immagine',
  nome: file.name,
  size: file.size,
  uploaded_at: new Date().toISOString()
};

const { data: nota } = await supabase
  .from('note_spesa')
  .select('allegati')
  .eq('id', notaSpesaId)
  .single();

const allegatiAggiornati = [...(nota.allegati || []), allegato];

await supabase
  .from('note_spesa')
  .update({ allegati: allegatiAggiornati })
  .eq('id', notaSpesaId);
```

### Download Allegato

```typescript
// Get signed URL for download
const { data: signedUrl } = await supabase.storage
  .from('note_spesa_allegati')
  .createSignedUrl(allegato.url, 60); // 1 min validity

// Use signedUrl.signedUrl in <a> or <img>
```

### Rimozione Allegato

```typescript
// 1. Remove from storage
await supabase.storage
  .from('note_spesa_allegati')
  .remove([allegato.url]);

// 2. Update allegati array
const allegatiAggiornati = nota.allegati.filter(a => a.url !== allegato.url);

await supabase
  .from('note_spesa')
  .update({ allegati: allegatiAggiornati })
  .eq('id', notaSpesaId);
```

**Policies:**
- ✓ Users possono vedere allegati del proprio tenant
- ✓ Users possono uploadare allegati per proprie note
- ✓ Users possono modificare/eliminare allegati solo se nota in stato 'bozza', 'da_approvare', 'rifiutato'
- ✗ Non possono modificare allegati di note 'approvate'

---

## Permessi e Sicurezza

### RLS Policies Summary

| Operazione | Dipendente | Approvatore | Admin/Owner |
|------------|-----------|-------------|-------------|
| SELECT proprie | ✓ Sempre | ✓ Sempre | ✓ Sempre |
| SELECT altri | ✗ Mai | ✓ Solo commesse assegnate | ✓ Tutte |
| INSERT | ✓ Solo commesse team | ✓ Solo commesse team | ✓ Sempre |
| UPDATE bozza/rifiutato | ✓ Solo proprie | ✗ Mai | ✓ Tutte |
| UPDATE da_approvare→approvato | ✗ Mai | ✓ Solo commesse assegnate | ✓ Tutte |
| UPDATE da_approvare→rifiutato | ✗ Mai | ✓ Solo commesse assegnate | ✓ Tutte |
| DELETE non approvate | ✓ Solo proprie | ✗ Mai | ✓ Tutte |
| DELETE approvate | ✗ Mai | ✗ Mai | ✓ Tutte |

### Validazioni Business Logic

**Database Constraints:**
- `importo > 0`: No importi negativi o zero
- `data_nota <= CURRENT_DATE`: No date future
- `motivo_rifiuto` obbligatorio se `stato='rifiutato'`
- `approvato_da/il` coerenti con `stato='approvato'`
- `rifiutato_da/il` coerenti con `stato='rifiutato'`
- `allegati` deve essere array JSONB valido

**Application-Level:**
- Rate limiting: max 20 note spesa per dipendente in 24h
- Validazione categoria: deve esistere in `categorie_note_spesa`
- Validazione commessa: dipendente deve appartenere al team
- Validazione approvatore: deve essere in array `approvatori`
- Validazione allegati: se categoria richiede, almeno 1 allegato
- Validazione importo: se categoria ha limite, rispettare

---

## Best Practices

### 1. Creazione Note Spesa

**DO:**
- ✓ Sempre allegare scontrino/fattura (anche se non obbligatorio)
- ✓ Descrizione dettagliata: "Pranzo con cliente XYZ - Trattativa contratto ABC"
- ✓ Categoria corretta per report accurati
- ✓ Creare nota spesa entro 30 giorni dall'evento
- ✓ Verificare limiti categoria prima di sottomettere

**DON'T:**
- ✗ Descrizioni vaghe: "Spesa varia"
- ✗ Categoria ALTRO se esiste categoria specifica
- ✗ Importi arrotondati senza giustificazione
- ✗ Note spesa retroattive > 60 giorni

### 2. Approvazione/Rifiuto

**DO:**
- ✓ Rivedere entro 48h dalla sottomissione
- ✓ Motivo rifiuto chiaro e costruttivo
- ✓ Verificare allegato leggibile e completo
- ✓ Controllare coerenza importo-categoria
- ✓ Approvare in ordine FIFO (first in, first out)

**DON'T:**
- ✗ Approvazioni automatiche senza verifica
- ✗ Motivi rifiuto generici: "Non ok"
- ✗ Rifiutare senza controllare allegato
- ✗ Lasciare note pending > 7 giorni

### 3. Configurazione Sistema

**DO:**
- ✓ Abilitare approvazione per commesse > 50k€
- ✓ Definire limiti categoria chiari
- ✓ Nominare 2+ approvatori (ridondanza)
- ✓ Customizzare categorie per settore aziendale
- ✓ Periodicamente rivedere categorie (semestrale)

**DON'T:**
- ✗ Approvazione obbligatoria per ogni commessa (overhead)
- ✗ Un solo approvatore (single point of failure)
- ✗ Limiti categoria troppo bassi (frustrazione dipendenti)
- ✗ Troppi approvatori (confusione responsabilità)

### 4. Performance

**DO:**
- ✓ Usare filtri su `tenant_id` e `stato` sempre
- ✓ Paginare risultati se > 100 note
- ✓ Caching categorie (cambiano raramente)
- ✓ Lazy loading allegati (solo quando visualizzati)
- ✓ Indici custom se query specifiche lente

**DON'T:**
- ✗ SELECT * senza filtri tenant
- ✗ Load tutti allegati in liste (solo preview)
- ✗ Query senza LIMIT su tabelle grandi
- ✗ Join con troppe tabelle senza necessità

---

## Troubleshooting

### Problema: Nota spesa sempre "bozza" invece di "da_approvare"

**Causa:** Trigger `set_nota_spesa_stato_iniziale` non funziona.

**Soluzione:**
```sql
-- Verifica trigger esiste
SELECT * FROM pg_trigger WHERE tgname = 'trigger_set_nota_spesa_stato_iniziale';

-- Verifica funzione richiede_approvazione
SELECT richiede_approvazione('commessa-uuid', 'note_spesa');

-- Se false, verifica config approvazione
SELECT * FROM commesse_impostazioni_approvazione
WHERE commessa_id = 'commessa-uuid' AND tipo_approvazione = 'note_spesa';
```

### Problema: Approvatore non può approvare

**Causa:** Non è nell'array `approvatori`.

**Soluzione:**
```sql
-- Verifica approvatori
SELECT approvatori FROM commesse_impostazioni_approvazione
WHERE commessa_id = 'commessa-uuid' AND tipo_approvazione = 'note_spesa';

-- Aggiungi approvatore
UPDATE commesse_impostazioni_approvazione
SET approvatori = array_append(approvatori, 'dipendente-uuid')
WHERE commessa_id = 'commessa-uuid' AND tipo_approvazione = 'note_spesa';
```

### Problema: Allegato non visibile

**Causa:** Policy storage o path errato.

**Soluzione:**
```typescript
// 1. Verifica path
console.log(allegato.url); // Deve essere: tenant/commessa/nota/file.pdf

// 2. Usa signed URL
const { data } = await supabase.storage
  .from('note_spesa_allegati')
  .createSignedUrl(allegato.url, 3600);

console.log(data.signedUrl); // Usa questo, non allegato.url diretto
```

### Problema: "Rate limit exceeded"

**Causa:** Creato > 20 note spesa in 24h.

**Soluzione:**
```sql
-- Verifica count
SELECT COUNT(*) FROM note_spesa
WHERE dipendente_id = 'dip-uuid'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Se legittimo, aumenta limite temporaneamente
-- Oppure: disabilita trigger rate_limit per batch import
DROP TRIGGER IF EXISTS trigger_nota_spesa_rate_limit ON note_spesa;
-- ... import ...
-- Riabilita dopo
```

### Problema: Note non appaiono in riepilogo economico

**Causa:** Stato non 'approvato'.

**Soluzione:**
```sql
-- Verifica stato
SELECT id, numero_nota, stato FROM note_spesa
WHERE commessa_id = 'commessa-uuid';

-- View include SOLO stato='approvato'
SELECT * FROM riepilogo_economico_commessa
WHERE commessa_id = 'commessa-uuid';

-- Se mancano note approvate, verifica view
```

---

## Metriche e Monitoring

### KPI Sistema Note Spesa

**Efficienza Approvazione:**
```sql
-- Tempo medio approvazione
SELECT
  AVG(EXTRACT(EPOCH FROM (approvato_il - created_at)) / 3600) as ore_medie_approvazione
FROM note_spesa
WHERE stato = 'approvato'
  AND approvato_il IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days';
```

**Tasso Rifiuto:**
```sql
-- % note rifiutate
SELECT
  COUNT(*) FILTER (WHERE stato = 'rifiutato') * 100.0 / COUNT(*) as tasso_rifiuto_pct
FROM note_spesa
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Top Categorie:**
```sql
-- Categorie più usate
SELECT
  categoria,
  COUNT(*) as numero_note,
  SUM(importo) as totale_importo
FROM note_spesa
WHERE stato = 'approvato'
  AND EXTRACT(YEAR FROM data_nota) = 2025
GROUP BY categoria
ORDER BY totale_importo DESC;
```

---

## Riferimenti

- **Migration principale:** `/supabase/migrations/20250223000001_enhance_note_spesa_system.sql`
- **Storage e categorie:** `/supabase/migrations/20250223000002_note_spesa_storage_and_defaults.sql`
- **Approvazioni base:** `/supabase/migrations/20250222000001_create_approval_system.sql`
- **Riepilogo economico:** View `riepilogo_economico_commessa`

---

**Ultimo aggiornamento:** 2025-02-23
