# Approval System - API Implementation Guide

## REST API Endpoints Design

This guide provides recommended API endpoint designs for implementing the approval system.

## Base URLs

```
/api/commesse/{commessaId}/approval-settings
/api/commesse/{commessaId}/presenze/pending
/api/commesse/{commessaId}/note-spesa/pending
/api/rapportini/{rapportinoId}/approve
/api/note-spesa/{notaSpesaId}/approve
```

---

## 1. Approval Settings Management

### GET `/api/commesse/{commessaId}/approval-settings`

Get approval configuration for a commessa.

**Request:**
```typescript
GET /api/commesse/550e8400-e29b-41d4-a716-446655440000/approval-settings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "presenze": {
    "enabled": true,
    "approvers": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "nome": "Mario",
        "cognome": "Rossi",
        "ruolo": "Capocantiere"
      }
    ]
  },
  "note_spesa": {
    "enabled": false,
    "approvers": []
  }
}
```

**Implementation:**
```typescript
// app/api/commesse/[id]/approval-settings/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const commessaId = params.id;

  // Get approval settings
  const { data: settings, error } = await supabase
    .from('commesse_impostazioni_approvazione')
    .select(`
      tipo_approvazione,
      abilitato,
      approvatori
    `)
    .eq('commessa_id', commessaId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get approver details
  const allApproverIds = settings?.flatMap(s => s.approvatori || []) || [];
  const { data: approvers } = await supabase
    .from('dipendenti')
    .select('id, nome, cognome, ruolo')
    .in('id', allApproverIds);

  // Format response
  const response = {
    presenze: {
      enabled: settings?.find(s => s.tipo_approvazione === 'presenze')?.abilitato || false,
      approvers: approvers?.filter(a =>
        settings?.find(s => s.tipo_approvazione === 'presenze')?.approvatori?.includes(a.id)
      ) || []
    },
    note_spesa: {
      enabled: settings?.find(s => s.tipo_approvazione === 'note_spesa')?.abilitato || false,
      approvers: approvers?.filter(a =>
        settings?.find(s => s.tipo_approvazione === 'note_spesa')?.approvatori?.includes(a.id)
      ) || []
    }
  };

  return NextResponse.json(response);
}
```

---

### PUT `/api/commesse/{commessaId}/approval-settings`

Update approval configuration for a commessa.

**Request:**
```json
PUT /api/commesse/550e8400-e29b-41d4-a716-446655440000/approval-settings
Content-Type: application/json
Authorization: Bearer <token>

{
  "presenze": {
    "enabled": true,
    "approverIds": [
      "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "8d0e7780-8536-51ef-b827-f18gd2g01bf8"
    ]
  },
  "note_spesa": {
    "enabled": true,
    "approverIds": [
      "9e1f8891-9647-62fg-c938-g29he3h12cg9"
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Approval settings updated successfully"
}
```

**Implementation:**
```typescript
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const commessaId = params.id;
  const body = await request.json();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get tenant_id
  const { data: commessa } = await supabase
    .from('commesse')
    .select('tenant_id')
    .eq('id', commessaId)
    .single();

  if (!commessa) {
    return NextResponse.json({ error: 'Commessa not found' }, { status: 404 });
  }

  // Upsert settings for presenze
  const { error: presenzeError } = await supabase
    .from('commesse_impostazioni_approvazione')
    .upsert({
      commessa_id: commessaId,
      tenant_id: commessa.tenant_id,
      tipo_approvazione: 'presenze',
      abilitato: body.presenze.enabled,
      approvatori: body.presenze.approverIds,
      created_by: user.id
    }, {
      onConflict: 'commessa_id,tipo_approvazione'
    });

  // Upsert settings for note_spesa
  const { error: noteSpesaError } = await supabase
    .from('commesse_impostazioni_approvazione')
    .upsert({
      commessa_id: commessaId,
      tenant_id: commessa.tenant_id,
      tipo_approvazione: 'note_spesa',
      abilitato: body.note_spesa.enabled,
      approvatori: body.note_spesa.approverIds,
      created_by: user.id
    }, {
      onConflict: 'commessa_id,tipo_approvazione'
    });

  if (presenzeError || noteSpesaError) {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Approval settings updated successfully'
  });
}
```

---

## 2. Pending Approvals (For Approvers)

### GET `/api/approvals/pending`

Get all pending approvals for the current user (across all commesse where they are an approver).

**Request:**
```typescript
GET /api/approvals/pending?type=presenze
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (optional): Filter by 'presenze' or 'note_spesa'
- `commessaId` (optional): Filter by specific commessa

**Response:**
```json
{
  "presenze": [
    {
      "id": "abc123",
      "data_rapportino": "2025-02-22",
      "ore_lavorate": 8.0,
      "note": "Lavoro su cantiere",
      "dipendente": {
        "id": "dep123",
        "nome": "Giovanni",
        "cognome": "Verdi"
      },
      "commessa": {
        "id": "comm123",
        "nome_commessa": "Cantiere Milano",
        "codice_commessa": "CM-2025-001"
      },
      "created_at": "2025-02-22T10:00:00Z"
    }
  ],
  "note_spesa": [
    {
      "id": "ns456",
      "data_nota": "2025-02-21",
      "importo": 150.50,
      "categoria": "Trasporto",
      "descrizione": "Taxi per cantiere",
      "allegato_url": "https://...",
      "dipendente": {
        "id": "dep456",
        "nome": "Laura",
        "cognome": "Bianchi"
      },
      "commessa": {
        "id": "comm123",
        "nome_commessa": "Cantiere Milano",
        "codice_commessa": "CM-2025-001"
      },
      "created_at": "2025-02-21T15:30:00Z"
    }
  ],
  "meta": {
    "total_presenze": 5,
    "total_note_spesa": 3
  }
}
```

**Implementation:**
```typescript
// app/api/approvals/pending/route.ts
export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const commessaId = searchParams.get('commessaId');

  // Get current user's dipendente_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get dipendente_id for current user
  const { data: dipendente } = await supabase
    .from('dipendenti')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!dipendente) {
    return NextResponse.json({ error: 'Dipendente not found' }, { status: 404 });
  }

  const response: any = { meta: {} };

  // Get pending presenze if requested
  if (!type || type === 'presenze') {
    const { data: presenze, count } = await supabase
      .from('rapportini')
      .select(`
        *,
        dipendente:dipendenti!dipendente_id(id, nome, cognome),
        commessa:commesse(id, nome_commessa, codice_commessa)
      `, { count: 'exact' })
      .eq('stato', 'da_approvare')
      .in('commessa_id',
        // Subquery: get commesse where current user is an approver
        supabase
          .from('commesse_impostazioni_approvazione')
          .select('commessa_id')
          .eq('tipo_approvazione', 'presenze')
          .eq('abilitato', true)
          .contains('approvatori', [dipendente.id])
      )
      .order('created_at', { ascending: false });

    response.presenze = presenze || [];
    response.meta.total_presenze = count || 0;
  }

  // Get pending note_spesa if requested
  if (!type || type === 'note_spesa') {
    const { data: noteSpesa, count } = await supabase
      .from('note_spesa')
      .select(`
        *,
        dipendente:dipendenti!dipendente_id(id, nome, cognome),
        commessa:commesse(id, nome_commessa, codice_commessa)
      `, { count: 'exact' })
      .eq('stato', 'da_approvare')
      .in('commessa_id',
        supabase
          .from('commesse_impostazioni_approvazione')
          .select('commessa_id')
          .eq('tipo_approvazione', 'note_spesa')
          .eq('abilitato', true)
          .contains('approvatori', [dipendente.id])
      )
      .order('created_at', { ascending: false });

    response.note_spesa = noteSpesa || [];
    response.meta.total_note_spesa = count || 0;
  }

  return NextResponse.json(response);
}
```

---

## 3. Approve/Reject Actions

### POST `/api/rapportini/{rapportinoId}/approve`

Approve or reject a rapportino.

**Request:**
```json
POST /api/rapportini/abc123/approve
Content-Type: application/json
Authorization: Bearer <token>

{
  "action": "approve",
  "note": "Optional rejection reason or approval comment"
}
```

**Parameters:**
- `action`: "approve" | "reject"
- `note` (optional): Comment or rejection reason

**Response:**
```json
{
  "success": true,
  "message": "Rapportino approved successfully",
  "rapportino": {
    "id": "abc123",
    "stato": "approvato",
    "updated_at": "2025-02-22T12:00:00Z"
  }
}
```

**Implementation:**
```typescript
// app/api/rapportini/[id]/approve/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const rapportinoId = params.id;
  const body = await request.json();

  // Validate action
  if (!['approve', 'reject'].includes(body.action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Get current user's dipendente_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dipendente } = await supabase
    .from('dipendenti')
    .select('id')
    .eq('user_id', user.id)
    .single();

  // Get rapportino details
  const { data: rapportino } = await supabase
    .from('rapportini')
    .select('commessa_id, stato')
    .eq('id', rapportinoId)
    .single();

  if (!rapportino) {
    return NextResponse.json({ error: 'Rapportino not found' }, { status: 404 });
  }

  if (rapportino.stato !== 'da_approvare') {
    return NextResponse.json(
      { error: 'Rapportino is not pending approval' },
      { status: 400 }
    );
  }

  // Check if user is an approver for this commessa
  const { data: settings } = await supabase
    .from('commesse_impostazioni_approvazione')
    .select('approvatori')
    .eq('commessa_id', rapportino.commessa_id)
    .eq('tipo_approvazione', 'presenze')
    .single();

  if (!settings || !settings.approvatori?.includes(dipendente.id)) {
    return NextResponse.json(
      { error: 'You are not authorized to approve this rapportino' },
      { status: 403 }
    );
  }

  // Update rapportino status
  const newStato = body.action === 'approve' ? 'approvato' : 'rifiutato';
  const { data: updatedRapportino, error } = await supabase
    .from('rapportini')
    .update({
      stato: newStato,
      updated_at: new Date().toISOString()
    })
    .eq('id', rapportinoId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // TODO: Log approval action to audit table (future enhancement)
  // TODO: Send notification to submitter (future enhancement)

  return NextResponse.json({
    success: true,
    message: `Rapportino ${newStato} successfully`,
    rapportino: updatedRapportino
  });
}
```

---

### POST `/api/note-spesa/{notaSpesaId}/approve`

Same as rapportini, but for note_spesa. Implementation is nearly identical, just replace:
- Table: `note_spesa`
- Type: `'note_spesa'`

---

## 4. Rapportino/Note Spesa Creation (With Auto-Approval Logic)

### POST `/api/rapportini`

Create a new rapportino with automatic stato determination.

**Request:**
```json
POST /api/rapportini
Content-Type: application/json
Authorization: Bearer <token>

{
  "commessa_id": "550e8400-e29b-41d4-a716-446655440000",
  "dipendente_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "data_rapportino": "2025-02-22",
  "ore_lavorate": 8.0,
  "note": "Lavoro ordinario"
}
```

**Response:**
```json
{
  "success": true,
  "rapportino": {
    "id": "abc123",
    "stato": "da_approvare",
    "message": "Rapportino submitted for approval"
  }
}
```

**Implementation:**
```typescript
// app/api/rapportini/route.ts
export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if approval is required using the function
  const { data: requiresApproval, error: rpcError } = await supabase
    .rpc('richiede_approvazione', {
      p_commessa_id: body.commessa_id,
      p_tipo_approvazione: 'presenze'
    });

  if (rpcError) {
    console.error('RPC error:', rpcError);
  }

  // Determine stato
  const stato = requiresApproval ? 'da_approvare' : 'approvato';

  // Insert rapportino
  const { data: rapportino, error } = await supabase
    .from('rapportini')
    .insert({
      ...body,
      stato: stato,
      created_by: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    rapportino: {
      ...rapportino,
      message: requiresApproval
        ? 'Rapportino submitted for approval'
        : 'Rapportino created and auto-approved'
    }
  });
}
```

---

## 5. Statistics & Dashboard

### GET `/api/approvals/stats`

Get approval statistics for dashboards.

**Response:**
```json
{
  "pending": {
    "presenze": 12,
    "note_spesa": 5
  },
  "approved_today": {
    "presenze": 8,
    "note_spesa": 3
  },
  "rejected_today": {
    "presenze": 1,
    "note_spesa": 0
  },
  "avg_approval_time_hours": 4.2,
  "oldest_pending": {
    "type": "presenze",
    "days_old": 3,
    "id": "abc123"
  }
}
```

---

## React Component Examples

### 1. Approval Settings Toggle Component

```typescript
// components/commessa/ApprovalSettingsToggle.tsx
'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';

interface ApprovalSettingsToggleProps {
  commessaId: string;
  tipo: 'presenze' | 'note_spesa';
  initialEnabled: boolean;
  initialApprovers: string[];
  availableApprovers: Array<{
    id: string;
    nome: string;
    cognome: string;
  }>;
}

export function ApprovalSettingsToggle({
  commessaId,
  tipo,
  initialEnabled,
  initialApprovers,
  availableApprovers
}: ApprovalSettingsToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [selectedApprovers, setSelectedApprovers] = useState(initialApprovers);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/commesse/${commessaId}/approval-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [tipo]: {
            enabled,
            approverIds: selectedApprovers
          }
        })
      });

      if (!response.ok) throw new Error('Failed to save');
      // Show success toast
    } catch (error) {
      // Show error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            {tipo === 'presenze' ? 'Approvazione Presenze' : 'Approvazione Note Spesa'}
          </h3>
          <p className="text-sm text-gray-500">
            Richiedi approvazione per {tipo === 'presenze' ? 'i rapportini' : 'le note spesa'}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {enabled && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Seleziona Approvatori
          </label>
          <MultiSelect
            options={availableApprovers.map(a => ({
              value: a.id,
              label: `${a.nome} ${a.cognome}`
            }))}
            value={selectedApprovers}
            onChange={setSelectedApprovers}
            placeholder="Seleziona uno o più approvatori"
          />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || (enabled && selectedApprovers.length === 0)}
        className="btn btn-primary w-full"
      >
        {saving ? 'Salvataggio...' : 'Salva Impostazioni'}
      </button>
    </div>
  );
}
```

### 2. Pending Approvals List Component

```typescript
// components/approvals/PendingApprovalsList.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function PendingApprovalsList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const res = await fetch('/api/approvals/pending');
      return res.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, type, action }: {
      id: string;
      type: 'presenze' | 'note_spesa';
      action: 'approve' | 'reject'
    }) => {
      const endpoint = type === 'presenze'
        ? `/api/rapportini/${id}/approve`
        : `/api/note-spesa/${id}/approve`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      // Show success toast
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Presenze Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Presenze da Approvare ({data?.meta.total_presenze || 0})
        </h2>
        <div className="space-y-2">
          {data?.presenze?.map((item: any) => (
            <div key={item.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {item.dipendente.nome} {item.dipendente.cognome}
                  </p>
                  <p className="text-sm text-gray-600">
                    {item.commessa.nome_commessa}
                  </p>
                  <p className="text-sm">
                    {new Date(item.data_rapportino).toLocaleDateString()} - {item.ore_lavorate}h
                  </p>
                  {item.note && <p className="text-sm text-gray-500">{item.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate({
                      id: item.id,
                      type: 'presenze',
                      action: 'approve'
                    })}
                    className="btn btn-success btn-sm"
                  >
                    Approva
                  </button>
                  <button
                    onClick={() => approveMutation.mutate({
                      id: item.id,
                      type: 'presenze',
                      action: 'reject'
                    })}
                    className="btn btn-danger btn-sm"
                  >
                    Rifiuta
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Note Spesa Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">
          Note Spesa da Approvare ({data?.meta.total_note_spesa || 0})
        </h2>
        <div className="space-y-2">
          {data?.note_spesa?.map((item: any) => (
            <div key={item.id} className="border p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    {item.dipendente.nome} {item.dipendente.cognome}
                  </p>
                  <p className="text-sm text-gray-600">
                    {item.commessa.nome_commessa}
                  </p>
                  <p className="text-sm">
                    {new Date(item.data_nota).toLocaleDateString()} - €{item.importo}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{item.categoria}</span>
                    {item.descrizione && ` - ${item.descrizione}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate({
                      id: item.id,
                      type: 'note_spesa',
                      action: 'approve'
                    })}
                    className="btn btn-success btn-sm"
                  >
                    Approva
                  </button>
                  <button
                    onClick={() => approveMutation.mutate({
                      id: item.id,
                      type: 'note_spesa',
                      action: 'reject'
                    })}
                    className="btn btn-danger btn-sm"
                  >
                    Rifiuta
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

---

## Testing Checklist

### Unit Tests
- [ ] `richiede_approvazione()` function returns correct boolean
- [ ] Approval settings UPSERT works with conflict resolution
- [ ] Array operations on `approvatori` field

### Integration Tests
- [ ] Create rapportino → auto-set stato based on settings
- [ ] Enable approval → existing records unaffected, new ones require approval
- [ ] Approve/reject → stato updates correctly
- [ ] Multi-tenant isolation → users can't approve other tenants' items

### API Tests
```bash
# Test approval settings
curl -X GET http://localhost:3000/api/commesse/{id}/approval-settings \
  -H "Authorization: Bearer {token}"

# Test pending approvals
curl -X GET http://localhost:3000/api/approvals/pending \
  -H "Authorization: Bearer {token}"

# Test approve action
curl -X POST http://localhost:3000/api/rapportini/{id}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"action":"approve"}'
```

---

## Error Handling

### Common Error Scenarios

| Error | HTTP Code | Message | Solution |
|-------|-----------|---------|----------|
| Not an approver | 403 | "You are not authorized to approve" | Check user is in approvatori array |
| Already approved | 400 | "Item is not pending approval" | Check stato === 'da_approvare' |
| No approvers set | 400 | "No approvers configured" | Require at least one approver when enabled |
| Invalid approval type | 400 | "Invalid tipo_approvazione" | Use 'presenze' or 'note_spesa' only |

---

## Performance Optimization

### Caching Strategy

```typescript
// Use React Query with stale-while-revalidate
const { data } = useQuery({
  queryKey: ['approval-settings', commessaId],
  queryFn: fetchApprovalSettings,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### Database Query Optimization

```sql
-- Use prepared statements for repeated queries
PREPARE get_pending_presenze(uuid) AS
SELECT r.*, d.nome, d.cognome, c.nome_commessa
FROM rapportini r
JOIN dipendenti d ON d.id = r.dipendente_id
JOIN commesse c ON c.id = r.commessa_id
WHERE r.stato = 'da_approvare'
  AND r.commessa_id IN (
    SELECT commessa_id FROM commesse_impostazioni_approvazione
    WHERE tipo_approvazione = 'presenze'
      AND abilitato = true
      AND $1 = ANY(approvatori)
  );

EXECUTE get_pending_presenze('dipendente-uuid');
```

---

This API guide provides a complete implementation reference for building the approval system frontend and backend. All endpoints follow RESTful conventions and include proper error handling, authorization checks, and performance considerations.
