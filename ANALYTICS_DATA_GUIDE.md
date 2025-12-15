# 📊 Guida Completa: Come Inserire Dati per Analytics Corretti

## 🎯 OBIETTIVO
Avere grafici che **parlano** e **aiutano a prendere decisioni**, non numeri fini a se stessi.

---

## 1️⃣ **CREARE UNA NUOVA COMMESSA**

### Dati Obbligatori Minimi
```javascript
{
  titolo: "Edificio Residenziale Via Roma",
  cliente_id: "uuid-del-cliente",
  stato: "in_corso",  // in_attesa | in_corso | completata | annullata

  // Date
  data_inizio: "2025-01-15",
  data_fine_prevista: "2025-06-30",

  // BUDGET (FONDAMENTALE!)
  budget_preventivo: 150000,      // Budget totale stimato
  budget_materiali: 60000,        // 40% materiali
  budget_manodopera: 75000,       // 50% manodopera
  budget_altro: 15000,            // 10% altro (noleggi, trasporti)
  margine_percentuale_target: 20  // Margine obiettivo 20%
}
```

### ✅ Cosa Abilita
- **Budget vs Actual**: confronto preventivo vs consuntivo in tempo reale
- **Cash Flow Forecast**: previsione uscite basata su budget residuo
- **Project Timeline**: visualizzazione Gantt con date e stato
- **Alert**: "Commessa ha sforato budget del 15%"

---

## 2️⃣ **EMETTERE FATTURA ATTIVA (Incasso)**

### Dati Completi
```javascript
{
  commessa_id: "uuid-commessa",
  cliente_id: "uuid-cliente",  // ⚠️ IMPORTANTE: collegare sempre al cliente

  numero_fattura: "FAT001/2025",
  data_emissione: "2025-02-01",
  data_scadenza: "2025-03-03",  // ⚠️ FONDAMENTALE per Aging Report

  importo_totale: 45000,

  // Stato pagamento
  stato: "da_pagare",  // pagato | da_pagare | scaduto (auto-calcolato)
  data_pagamento: null,  // compilare quando pagato

  // SAL (per commesse a rate)
  percentuale_sal: 30  // 30% = prima rata di acconto
}
```

### ✅ Cosa Abilita
- **Aging Report**: fatture scadute raggruppate per giorni (0-30, 31-60, 61-90, 90+)
- **DSO (Days Sales Outstanding)**: media giorni per incassare
- **Cash Flow Forecast**: previsione incassi futuri per scadenza
- **Working Capital**: crediti commerciali aperti
- **Alert**: "Cliente X ha €50k scaduti da 75 giorni"

### 📝 Esempio Workflow SAL
Per commessa da €150k con 3 rate:
```javascript
// Fattura 1 - Acconto 30%
{ percentuale_sal: 30, importo: 45000, data_emissione: "2025-02-01" }

// Fattura 2 - SAL 50%
{ percentuale_sal: 50, importo: 75000, data_emissione: "2025-04-01" }

// Fattura 3 - Saldo 20%
{ percentuale_sal: 20, importo: 30000, data_emissione: "2025-06-01" }
```

---

## 3️⃣ **REGISTRARE COSTI (Fatture Passive + Scontrini)**

### Fattura Passiva
```javascript
{
  commessa_id: "uuid-commessa",

  fornitore: "Ferramenta Rossi SRL",
  data_emissione: "2025-02-05",
  data_scadenza: "2025-03-07",  // ⚠️ Per DPO (Days Payable Outstanding)

  importo_totale: 15000,
  categoria: "materiali",  // materiali | subappalto | noleggio | altro

  stato: "da_pagare",  // pagato | da_pagare
  data_pagamento: null
}
```

### Scontrino
```javascript
{
  commessa_id: "uuid-commessa",

  data_emissione: "2025-02-10",
  importo_totale: 250,
  categoria: "carburante",  // carburante | utensili | altro
  descrizione: "Gasolio per escavatore"
}
```

### ✅ Cosa Abilita
- **Budget vs Actual**: `costi_reali = fatture_passive + scontrini + costo_rapportini`
- **Costs Breakdown**: distribuzione costi per categoria
- **Working Capital**: debiti commerciali aperti
- **DPO**: media giorni pagamento fornitori (migliore = più liquidità)
- **Profitability**: margine reale = fatturato - costi

---

## 4️⃣ **COMPILARE RAPPORTINI (Ore Lavorate)**

### Rapportino Giornaliero
```javascript
{
  commessa_id: "uuid-commessa",
  dipendente_id: "uuid-dipendente",

  data: "2025-02-15",
  ore_lavorate: 8,
  tempo_pausa: 30,  // minuti

  // Costo dipendente
  costo_orario: 28.50,  // ⚠️ FONDAMENTALE per calcolare margine reale
  costo_totale: 228.00  // 8h * €28.50 (auto-calcolato)
}
```

### ✅ Cosa Abilita
- **Margine Reale Commessa**: `margine = fatturato - (materiali + costo_manodopera + altro)`
- **Resource Utilization**: `utilizzo_dipendente = ore_lavorate / 160h_mese * 100%`
- **Employee Hours**: distribuzione ore per dipendente
- **Budget Manodopera**: confronto ore previste vs effettive
- **Alert**: "Commessa X ha consumato 120% del budget manodopera"

### 📊 Esempio Calcolo Margine Commessa
```
Commessa "Edificio Via Roma"
├─ Fatturato:           €150.000
├─ Costi Materiali:     € 62.000 (fatture passive categoria "materiali")
├─ Costi Manodopera:    € 45.000 (SUM rapportini.costo_totale)
├─ Altri Costi:         € 18.000 (noleggi, trasporti, scontrini)
└─ MARGINE REALE:       € 25.000 (16.7%)

⚠️ Budget Target: 20% → Sotto obiettivo!
```

---

## 5️⃣ **GESTIRE CLIENTI**

### Profilo Cliente Completo
```javascript
{
  ragione_sociale: "Costruzioni Bianchi SPA",

  // Condizioni pagamento
  giorni_pagamento_standard: 60,  // Concordato contrattualmente

  // Affidabilità (auto-calcolata o manuale)
  affidabilita: "medio"  // buono | medio | problematico
}
```

### 🤖 Auto-Calcolo Affidabilità (da implementare)
```javascript
// Media giorni pagamento reale
media_ritardo = AVG(data_pagamento - data_scadenza) per cliente

if (media_ritardo <= 5gg)  → affidabilita = "buono"
if (media_ritardo <= 15gg) → affidabilita = "medio"
if (media_ritardo > 15gg)  → affidabilita = "problematico"
```

### ✅ Cosa Abilita
- **Aging Report**: top clienti morosi
- **Cash Flow Forecast**: stima incasso reale basata su storico cliente
- **Top Clients**: fatturato totale + numero commesse
- **Alert**: "Cliente problematico ha €80k di fatture aperte"

---

## 6️⃣ **WORKFLOW COMPLETO: Esempio Pratico**

### Scenario: Costruzione Edificio Residenziale

#### **Step 1: Creazione Commessa**
```sql
INSERT INTO commesse (titolo, cliente_id, stato, data_inizio, data_fine_prevista,
  budget_preventivo, budget_materiali, budget_manodopera, budget_altro, margine_percentuale_target)
VALUES (
  'Edificio Via Roma 10',
  'cliente-uuid',
  'in_corso',
  '2025-01-15',
  '2025-07-31',
  200000,  -- Budget totale
  80000,   -- 40% materiali
  100000,  -- 50% manodopera
  20000,   -- 10% altro
  18       -- Margine target 18%
);
```

#### **Step 2: Fattura Acconto (30%)**
```sql
INSERT INTO fatture_attive (commessa_id, cliente_id, numero_fattura, data_emissione, data_scadenza,
  importo_totale, stato, percentuale_sal)
VALUES (
  'commessa-uuid',
  'cliente-uuid',
  'FAT001/2025',
  '2025-02-01',
  '2025-03-03',  -- 30gg netti
  60000,         -- 30% di 200k
  'da_pagare',
  30
);
```

#### **Step 3: Acquisto Materiali**
```sql
-- Fattura passiva da fornitore
INSERT INTO fatture_passive (commessa_id, fornitore, data_emissione, data_scadenza,
  importo_totale, categoria, stato)
VALUES (
  'commessa-uuid',
  'Ferramenta Rossi SRL',
  '2025-02-10',
  '2025-03-12',  -- 30gg
  25000,
  'materiali',
  'da_pagare'
);
```

#### **Step 4: Rapportini Dipendenti (Febbraio)**
```sql
-- Geometra (20 giorni x 8h)
INSERT INTO rapportini (commessa_id, dipendente_id, data, ore_lavorate, costo_orario)
VALUES ('commessa-uuid', 'geometra-uuid', '2025-02-01', 8, 35.00);
-- ... ripeti per ogni giorno

-- Operaio 1 (20 giorni x 8h)
INSERT INTO rapportini (commessa_id, dipendente_id, data, ore_lavorate, costo_orario)
VALUES ('commessa-uuid', 'operaio1-uuid', '2025-02-01', 8, 22.00);
-- ... etc
```

#### **Step 5: Verifica Dashboard (Fine Febbraio)**

**Budget vs Actual:**
```
Commessa "Edificio Via Roma 10"
├─ Budget Preventivo:    €200.000
├─ Speso (1 mese):       € 45.000
│  ├─ Materiali:         € 25.000
│  ├─ Manodopera:        € 18.000 (geometra + 2 operai x 20gg)
│  └─ Altro:             €  2.000
└─ Proiezione 6 mesi:    €270.000 ⚠️ +35% vs budget!
```

**Alert Generato:**
> 🔴 **Commessa in sovra-budget**: Edificio Via Roma 10 ha già consumato 22.5% del budget totale in 1 mese (su 6 previsti). Proiezione finale: +€70k vs preventivo.
>
> **Azioni suggerite:**
> - Rivedere costi materiali con fornitore
> - Valutare riduzione ore geometra
> - Rinegoziare budget con cliente

---

## 7️⃣ **METRICHE CHIAVE & INTERPRETAZIONE**

### **DSO (Days Sales Outstanding)**
```
DSO = (Crediti Commerciali / Fatturato ultimi 90gg) * 90

Esempi:
- DSO = 30gg → Ottimo (incassi veloci)
- DSO = 60gg → Nella media
- DSO = 90gg → Problematico (troppo tempo per incassare)
```

### **DPO (Days Payable Outstanding)**
```
DPO = (Debiti Commerciali / Costi ultimi 90gg) * 90

Esempi:
- DPO = 60gg → Buono (paghi fornitori dopo 60gg → più liquidità)
- DPO = 30gg → Paghi troppo presto → meno cassa disponibile
```

### **Cash Conversion Cycle**
```
CCC = DSO - DPO

Esempi:
- CCC = -10gg → Eccellente (incassi prima di pagare)
- CCC = +30gg → Problematico (devi anticipare 30gg di cassa)
```

### **Current Ratio**
```
Current Ratio = (Crediti + Liquidità) / Debiti

Esempi:
- CR >= 2.0 → Ottima solidità
- CR >= 1.5 → Buona
- CR < 1.0 → Rischio liquidità!
```

---

## 8️⃣ **CHECKLIST: Dati Minimi per Analytics Funzionanti**

### ✅ Per ogni COMMESSA:
- [ ] Budget preventivo compilato
- [ ] Budget suddiviso (materiali, manodopera, altro)
- [ ] Date inizio e fine prevista
- [ ] Stato aggiornato (in_corso, completata, etc)
- [ ] Cliente collegato

### ✅ Per ogni FATTURA ATTIVA:
- [ ] Data scadenza compilata
- [ ] Cliente collegato (cliente_id)
- [ ] Stato aggiornato (pagato/da_pagare)
- [ ] Data pagamento quando pagata
- [ ] Percentuale SAL per commesse a rate

### ✅ Per ogni FATTURA PASSIVA:
- [ ] Data scadenza compilata
- [ ] Categoria assegnata (materiali, subappalto, etc)
- [ ] Stato aggiornato
- [ ] Data pagamento quando pagata

### ✅ Per ogni RAPPORTINO:
- [ ] Costo orario dipendente compilato
- [ ] Ore lavorate corrette
- [ ] Collegato alla commessa giusta

### ✅ Per ogni CLIENTE:
- [ ] Giorni pagamento standard (30, 60, 90)
- [ ] Affidabilità monitorata

---

## 9️⃣ **ERRORI COMUNI DA EVITARE**

### ❌ Budget preventivo = 0 o NULL
**Problema**: Budget vs Actual non funziona
**Soluzione**: Stimare sempre un budget, anche approssimativo

### ❌ Data scadenza fattura = NULL
**Problema**: Aging Report vuoto, DSO sbagliato
**Soluzione**: data_scadenza = data_emissione + giorni_pagamento_cliente

### ❌ Rapportini senza costo_orario
**Problema**: Margine reale commessa sbagliato
**Soluzione**: Definire costo standard per ogni dipendente (€20-€40/h)

### ❌ Fatture non collegate a cliente_id
**Problema**: Top Clients vuoto, Aging Report incompleto
**Soluzione**: Sempre collegare fattura al cliente, non solo nome testuale

### ❌ Categorie costi generiche ("Altro" per tutto)
**Problema**: Costs Breakdown inutile
**Soluzione**: Categorizzare correttamente (materiali, manodopera, noleggi, etc)

---

## 🎯 **RISULTATO FINALE**

Con questi dati compilati correttamente, i grafici diventeranno:

✅ **Cash Flow Forecast**: "Tra 30gg incasserai €45k da 3 fatture in scadenza, ma dovrai pagare €60k ai fornitori → saldo -€15k"

✅ **Budget vs Actual**: "Commessa X ha speso €180k su €150k budget (-20%) → azione richiesta!"

✅ **Aging Report**: "Cliente Rossi ha €80k scaduti da 75 giorni → sollecito urgente"

✅ **Resource Utilization**: "Geometra Bianchi è al 140% di utilizzo → assumere supporto"

✅ **Profitability Trends**: "Margine medio ultimi 6 mesi = 12% (era 18% l'anno scorso) → costi in aumento"

✅ **Working Capital**: "DSO = 65gg, DPO = 35gg → CCC = +30gg → servono €200k di cassa operativa"

---

**BOTTOM LINE**: I grafici sono utili solo se i dati sono **completi, corretti e collegati tra loro**. Non basta inserire fatture - serve la **storia completa** di ogni commessa.
