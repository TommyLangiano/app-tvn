# Approval System - Architecture Overview

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Core Tables"
        T[tenants]
        C[commesse]
        D[dipendenti]
        U[auth.users]
    end

    subgraph "Approval Configuration"
        CIA[commesse_impostazioni_approvazione]
        CIA --> C
        CIA --> T
        CIA --> U
    end

    subgraph "Approvable Entities"
        R[rapportini<br/>Presenze/Timesheets]
        NS[note_spesa<br/>Expense Notes]
    end

    subgraph "Relationships"
        R --> C
        R --> D
        R --> T
        R --> U

        NS --> C
        NS --> D
        NS --> T
        NS --> U

        CIA -.->|controls approval for| R
        CIA -.->|controls approval for| NS
    end

    subgraph "Helper Objects"
        F[richiede_approvazione<br/>function]
        V[v_commesse_approvazioni<br/>view]
    end

    F -.->|queries| CIA
    V -.->|joins| CIA
    V -.->|joins| C

    style CIA fill:#e1f5ff
    style R fill:#fff4e6
    style NS fill:#fff4e6
    style F fill:#e8f5e9
    style V fill:#e8f5e9
```

## Entity Relationship Diagram

```mermaid
erDiagram
    TENANTS ||--o{ COMMESSE : has
    TENANTS ||--o{ DIPENDENTI : employs
    TENANTS ||--o{ RAPPORTINI : owns
    TENANTS ||--o{ NOTE_SPESA : owns
    TENANTS ||--o{ COMMESSE_IMPOSTAZIONI_APPROVAZIONE : configures

    COMMESSE ||--o{ RAPPORTINI : tracks
    COMMESSE ||--o{ NOTE_SPESA : tracks
    COMMESSE ||--o{ COMMESSE_IMPOSTAZIONI_APPROVAZIONE : "has settings"

    DIPENDENTI ||--o{ RAPPORTINI : submits
    DIPENDENTI ||--o{ NOTE_SPESA : submits

    USERS ||--o{ RAPPORTINI : creates
    USERS ||--o{ NOTE_SPESA : creates
    USERS ||--o{ COMMESSE_IMPOSTAZIONI_APPROVAZIONE : creates

    COMMESSE_IMPOSTAZIONI_APPROVAZIONE {
        uuid id PK
        uuid commessa_id FK
        uuid tenant_id FK
        text tipo_approvazione "presenze | note_spesa"
        boolean abilitato
        uuid_array approvatori "FK to dipendenti[]"
        timestamptz created_at
        timestamptz updated_at
    }

    RAPPORTINI {
        uuid id PK
        uuid tenant_id FK
        uuid commessa_id FK
        uuid dipendente_id FK
        date data_rapportino
        decimal ore_lavorate
        text stato "approvato | da_approvare | rifiutato"
        text note
        text allegato_url
    }

    NOTE_SPESA {
        uuid id PK
        uuid tenant_id FK
        uuid commessa_id FK
        uuid dipendente_id FK
        date data_nota
        numeric importo
        text categoria
        text stato "approvato | da_approvare | rifiutato"
        text descrizione
        text allegato_url
    }
```

## Data Flow: Approval Workflow

```mermaid
sequenceDiagram
    participant User as Dipendente/User
    participant App as Application
    participant DB as Database
    participant Approver as Approvatore

    Note over User,Approver: 1. CONFIGURATION PHASE
    User->>App: Opens Commessa Settings
    App->>DB: SELECT from v_commesse_approvazioni
    DB-->>App: Return approval settings
    App->>User: Display toggles + approver selectors

    User->>App: Enable "Approvazione Presenze"<br/>Select approvers
    App->>DB: UPSERT into commesse_impostazioni_approvazione
    DB-->>App: Settings saved
    App->>User: Confirmation

    Note over User,Approver: 2. SUBMISSION PHASE
    User->>App: Submit new rapportino
    App->>DB: richiede_approvazione(commessa_id, 'presenze')
    DB-->>App: Returns true
    App->>DB: INSERT rapportino with stato='da_approvare'
    DB-->>App: Rapportino created
    App->>User: "Submitted for approval"

    Note over User,Approver: 3. APPROVAL PHASE
    Approver->>App: View pending approvals
    App->>DB: SELECT rapportini<br/>WHERE stato='da_approvare'<br/>AND approver IN approvatori
    DB-->>App: List of pending items
    App->>Approver: Display approval queue

    Approver->>App: Approve/Reject rapportino
    App->>DB: UPDATE rapportini<br/>SET stato='approvato'
    DB-->>App: Updated
    App->>Approver: Confirmation
    App->>User: Notification (optional)
```

## State Machine: Approval States

```mermaid
stateDiagram-v2
    [*] --> approvato: Approval disabled<br/>or auto-approved
    [*] --> da_approvare: Approval enabled

    da_approvare --> approvato: Approver accepts
    da_approvare --> rifiutato: Approver rejects
    da_approvare --> da_approvare: Edit & resubmit

    rifiutato --> da_approvare: Resubmit after fix
    rifiutato --> [*]: Delete

    approvato --> [*]: Final state
```

## Database Schema Layers

```
┌─────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                   │
│  - Next.js Pages                                     │
│  - React Components                                  │
│  - API Routes                                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│               SUPABASE CLIENT LAYER                  │
│  - supabase.from('table').select()                   │
│  - supabase.rpc('function')                          │
│  - Real-time subscriptions                           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                   VIEW LAYER                         │
│  - v_commesse_approvazioni (denormalized)            │
│  - v_pending_approvals (future)                      │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                 FUNCTION LAYER                       │
│  - richiede_approvazione(commessa_id, tipo)          │
│  - get_pending_approvals_count(dipendente_id)        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                   TABLE LAYER                        │
│  Core Tables:                                        │
│    - tenants                                         │
│    - commesse                                        │
│    - dipendenti                                      │
│    - auth.users                                      │
│                                                      │
│  Approval Tables:                                    │
│    - commesse_impostazioni_approvazione              │
│    - rapportini (with stato)                         │
│    - note_spesa (new, with stato)                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                  SECURITY LAYER                      │
│  - Row Level Security (RLS) Policies                 │
│  - tenant_id isolation                               │
│  - created_by validation                             │
└─────────────────────────────────────────────────────┘
```

## Approval Configuration Patterns

### Pattern 1: Simple Single Approver
```
Commessa: "Cantiere Milano"
  ├─ Approvazione Presenze: ✓ Enabled
  │   └─ Approvatori: [Mario Rossi (Capocantiere)]
  └─ Approvazione Note Spesa: ✓ Enabled
      └─ Approvatori: [Maria Bianchi (HR)]
```

### Pattern 2: Multiple Approvers (Any Can Approve)
```
Commessa: "Progetto Roma"
  ├─ Approvazione Presenze: ✓ Enabled
  │   └─ Approvatori: [
  │         Giuseppe Verdi (Capo),
  │         Laura Neri (Project Manager),
  │         Franco Blu (HR)
  │       ]
  └─ Approvazione Note Spesa: ✗ Disabled
```

### Pattern 3: Mixed Configuration
```
Tenant: ABC Costruzioni
  ├─ Commessa A: Both approvals enabled
  ├─ Commessa B: Only presenze approval
  ├─ Commessa C: Only note_spesa approval
  └─ Commessa D: No approvals (auto-approve)
```

## Query Performance Strategy

### Index Usage by Query Type

| Query Type | Index Used | Performance |
|------------|------------|-------------|
| Get commessa settings | `idx_approvazione_commessa` | O(log n) |
| List tenant approvals | `idx_approvazione_tenant` | O(log n) |
| Filter by approval type | `idx_approvazione_tipo` | O(log n) |
| Check if user is approver | `idx_approvazione_approvatori` (GIN) | O(1) |
| Pending presenze | `idx_rapportini_stato` + `idx_rapportini_tenant` | O(log n) |
| Pending note_spesa | `idx_note_spesa_stato` + `idx_note_spesa_tenant` | O(log n) |
| Date range queries | `idx_note_spesa_tenant_data` (composite) | O(log n) |

### Caching Strategy

**Application Level:**
- Cache approval settings per commessa (TTL: 5 minutes)
- Invalidate on settings update
- Use React Query or SWR for client-side caching

**Database Level:**
- PostgreSQL query plan caching (automatic)
- Materialized views for complex aggregations (if needed)

## Scalability Considerations

### Current Design Supports:

| Metric | Capacity | Notes |
|--------|----------|-------|
| Tenants | 10,000+ | RLS ensures isolation |
| Commesse per tenant | 10,000+ | Indexed queries remain fast |
| Approvers per commessa | 50 | Array-based, GIN indexed |
| Rapportini per month | 1M+ | Partitioning recommended at 10M+ |
| Note spesa per month | 500K+ | Same as rapportini |

### When to Optimize Further:

1. **Approvers > 100**: Create `commesse_approvatori` join table
2. **Records > 10M**: Implement table partitioning by date
3. **Real-time needs**: Add PostgreSQL NOTIFY/LISTEN for instant updates
4. **Audit requirements**: Add `approvazioni_log` table for history

## Security Boundaries

```
┌─────────────────────────────────────────────────────┐
│                   TENANT ISOLATION                   │
│  Every query filtered by tenant_id via RLS           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                 ROLE-BASED ACCESS                    │
│  - created_by must match auth.uid() on INSERT        │
│  - Admin role can UPDATE/DELETE all tenant data      │
│  - Regular users can UPDATE own submissions          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│               APPROVAL AUTHORIZATION                 │
│  Only dipendenti in approvatori[] can approve        │
│  Application enforces this via UI + API logic        │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | PostgreSQL 15+ | Core data storage |
| Auth | Supabase Auth | User authentication |
| RLS | PostgreSQL RLS | Row-level security |
| ORM | Supabase Client | Type-safe queries |
| Frontend | Next.js + React | UI framework |
| State Management | React Query / SWR | Client-side caching |

## Integration Points

### 1. Commessa Detail Page - Impostazioni Tab

```typescript
// components/commessa/ImpostazioniTab.tsx
interface ApprovalSettings {
  presenze: {
    enabled: boolean;
    approvers: string[]; // dipendente UUIDs
  };
  note_spesa: {
    enabled: boolean;
    approvers: string[];
  };
}

// Fetch settings
const { data: settings } = useQuery(['approval-settings', commessaId], () =>
  supabase
    .from('commesse_impostazioni_approvazione')
    .select('*')
    .eq('commessa_id', commessaId)
);

// Update settings
const mutation = useMutation((settings: ApprovalSettings) =>
  // Upsert both configs
  Promise.all([
    supabase.from('commesse_impostazioni_approvazione').upsert({
      commessa_id: commessaId,
      tipo_approvazione: 'presenze',
      abilitato: settings.presenze.enabled,
      approvatori: settings.presenze.approvers
    }),
    // ... same for note_spesa
  ])
);
```

### 2. Rapportini/Note Spesa Creation

```typescript
// Before insert, check if approval required
const { data: requiresApproval } = await supabase.rpc(
  'richiede_approvazione',
  { p_commessa_id: commessaId, p_tipo_approvazione: 'presenze' }
);

const stato = requiresApproval ? 'da_approvare' : 'approvato';
```

### 3. Approval Dashboard

```typescript
// Get pending approvals for current user
const { data: pendingPresenze } = useQuery(['pending-presenze'], () =>
  supabase
    .from('rapportini')
    .select(`
      *,
      dipendente:dipendenti(*),
      commessa:commesse(*)
    `)
    .eq('stato', 'da_approvare')
    .in('commessa_id', myApprovalCommessaIds)
);
```

## Future Enhancements

1. **Approval History Tracking**
   - Who approved/rejected
   - When action was taken
   - Rejection reasons

2. **Email Notifications**
   - Notify approvers of pending items
   - Notify submitter of approval/rejection

3. **Escalation Rules**
   - Auto-approve after X days
   - Escalate to secondary approver

4. **Approval Analytics**
   - Average approval time
   - Rejection rate by category
   - Approver workload metrics

5. **Batch Approvals**
   - Approve multiple items at once
   - Bulk actions UI

6. **Mobile App Support**
   - Push notifications
   - Quick approve/reject actions
