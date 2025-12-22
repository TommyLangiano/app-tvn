# Note Spesa - TypeScript Examples

Esempi pratici di codice TypeScript per implementare le funzionalità Note Spesa nel frontend.

---

## Table of Contents

1. [Type Definitions](#type-definitions)
2. [Queries](#queries)
3. [Mutations](#mutations)
4. [File Upload](#file-upload)
5. [Approval Functions](#approval-functions)
6. [Hooks](#hooks)
7. [Components Examples](#components-examples)

---

## Type Definitions

```typescript
// types/nota-spesa.ts

export type StatoNotaSpesa = 'bozza' | 'da_approvare' | 'approvato' | 'rifiutato';

export type AzioneNotaSpesa =
  | 'creata'
  | 'modificata'
  | 'sottomessa'
  | 'approvata'
  | 'rifiutata'
  | 'eliminata';

export interface AllegatoNotaSpesa {
  url: string;
  tipo: 'pdf' | 'immagine';
  nome: string;
  size: number;
  uploaded_at: string;
}

export interface NotaSpesa {
  id: string;
  tenant_id: string;
  commessa_id: string;
  dipendente_id: string;

  // Core data
  data_nota: string; // ISO date
  importo: number;
  categoria: string;
  descrizione: string | null;
  allegati: AllegatoNotaSpesa[];
  stato: StatoNotaSpesa;
  numero_nota: string | null;

  // Approval tracking
  approvato_da: string | null;
  approvato_il: string | null;
  rifiutato_da: string | null;
  rifiutato_il: string | null;
  motivo_rifiuto: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface NotaSpesaWithRelations extends NotaSpesa {
  commesse: {
    nome_commessa: string;
    codice_commessa: string;
    cliente_commessa: string | null;
  };
  dipendenti: {
    nome: string;
    cognome: string;
    email: string;
  };
  categoria_details: CategoriaNotaSpesa | null;
  approvatore: {
    email: string;
  } | null;
}

export interface CategoriaNotaSpesa {
  id: string;
  tenant_id: string;
  nome: string;
  codice: string;
  descrizione: string | null;
  colore: string | null;
  icona: string | null;
  importo_massimo: number | null;
  richiede_allegato: boolean;
  attiva: boolean;
  ordinamento: number;
}

export interface AzioneNotaSpesa {
  id: string;
  nota_spesa_id: string;
  tenant_id: string;
  azione: AzioneNotaSpesa;
  eseguita_da: string;
  eseguita_il: string;
  stato_precedente: StatoNotaSpesa | null;
  stato_nuovo: StatoNotaSpesa | null;
  motivo: string | null;
  dati_modificati: Record<string, any> | null;
  created_at: string;
}

export interface ImpostazioniApprovazione {
  id: string;
  commessa_id: string;
  tenant_id: string;
  tipo_approvazione: 'presenze' | 'note_spesa';
  abilitato: boolean;
  approvatori: string[]; // dipendente_ids
}
```

---

## Queries

### 1. Fetch Note Spesa (Dipendente)

```typescript
// lib/queries/note-spesa.ts

import { createClient } from '@/lib/supabase/client';
import type { NotaSpesaWithRelations } from '@/types/nota-spesa';

export async function getMyNoteSpeseQuery(dipendenteId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_spesa')
    .select(`
      *,
      commesse:commessa_id (
        nome_commessa,
        codice_commessa,
        cliente_commessa
      ),
      dipendenti:dipendente_id (
        nome,
        cognome,
        email
      ),
      categoria_details:categorie_note_spesa!inner (
        nome,
        codice,
        colore,
        icona,
        importo_massimo,
        richiede_allegato
      )
    `)
    .eq('dipendente_id', dipendenteId)
    .order('data_nota', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NotaSpesaWithRelations[];
}

// Con filtri
export interface NoteSpeseFilters {
  stato?: StatoNotaSpesa | StatoNotaSpesa[];
  commessa_id?: string;
  data_da?: string;
  data_a?: string;
  categoria?: string;
}

export async function getMyNoteSpeseWithFilters(
  dipendenteId: string,
  filters: NoteSpeseFilters = {}
) {
  const supabase = createClient();

  let query = supabase
    .from('note_spesa')
    .select(`
      *,
      commesse:commessa_id (nome_commessa, codice_commessa),
      categoria_details:categorie_note_spesa!inner (nome, colore, icona)
    `)
    .eq('dipendente_id', dipendenteId);

  // Apply filters
  if (filters.stato) {
    if (Array.isArray(filters.stato)) {
      query = query.in('stato', filters.stato);
    } else {
      query = query.eq('stato', filters.stato);
    }
  }

  if (filters.commessa_id) {
    query = query.eq('commessa_id', filters.commessa_id);
  }

  if (filters.data_da) {
    query = query.gte('data_nota', filters.data_da);
  }

  if (filters.data_a) {
    query = query.lte('data_nota', filters.data_a);
  }

  if (filters.categoria) {
    query = query.eq('categoria', filters.categoria);
  }

  const { data, error } = await query
    .order('data_nota', { ascending: false });

  if (error) throw error;
  return data as NotaSpesaWithRelations[];
}
```

### 2. Fetch Note Pending (Approvatore)

```typescript
export async function getNotePendingQuery(tenantId: string, approvatoreId: string) {
  const supabase = createClient();

  // First, get commesse where user is approver
  const { data: commesseApprovatore, error: commesseError } = await supabase
    .from('commesse_impostazioni_approvazione')
    .select('commessa_id')
    .eq('tenant_id', tenantId)
    .eq('tipo_approvazione', 'note_spesa')
    .contains('approvatori', [approvatoreId]);

  if (commesseError) throw commesseError;

  const commessaIds = commesseApprovatore.map(c => c.commessa_id);

  if (commessaIds.length === 0) {
    return [];
  }

  // Fetch pending notes for those commesse
  const { data, error } = await supabase
    .from('note_spesa')
    .select(`
      *,
      dipendenti:dipendente_id (nome, cognome, email),
      commesse:commessa_id (nome_commessa, codice_commessa),
      categoria_details:categorie_note_spesa!inner (
        nome,
        colore,
        icona,
        importo_massimo,
        richiede_allegato
      )
    `)
    .eq('stato', 'da_approvare')
    .in('commessa_id', commessaIds)
    .order('created_at', { ascending: true }); // FIFO

  if (error) throw error;

  // Add validation warnings
  return (data as NotaSpesaWithRelations[]).map(nota => ({
    ...nota,
    warnings: getValidationWarnings(nota),
  }));
}

function getValidationWarnings(nota: NotaSpesaWithRelations): string[] {
  const warnings: string[] = [];
  const categoria = nota.categoria_details;

  if (!categoria) return warnings;

  // Check importo_massimo
  if (categoria.importo_massimo && nota.importo > categoria.importo_massimo) {
    warnings.push(
      `Importo supera limite categoria: €${nota.importo.toFixed(2)} > €${categoria.importo_massimo.toFixed(2)}`
    );
  }

  // Check richiede_allegato
  if (categoria.richiede_allegato && nota.allegati.length === 0) {
    warnings.push('Manca allegato obbligatorio per questa categoria');
  }

  // Check old pending (> 7 days)
  const daysPending = Math.floor(
    (Date.now() - new Date(nota.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysPending > 7) {
    warnings.push(`In attesa da ${daysPending} giorni`);
  }

  return warnings;
}
```

### 3. Fetch Categorie

```typescript
export async function getCategorieNoteSpeseQuery(tenantId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('categorie_note_spesa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('attiva', true)
    .order('ordinamento');

  if (error) throw error;
  return data as CategoriaNotaSpesa[];
}
```

### 4. Fetch Audit Trail

```typescript
export async function getAuditTrailQuery(notaSpesaId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_spesa_azioni')
    .select(`
      *,
      user:auth.users!eseguita_da (email)
    `)
    .eq('nota_spesa_id', notaSpesaId)
    .order('eseguita_il', { ascending: true });

  if (error) throw error;
  return data as (AzioneNotaSpesa & { user: { email: string } })[];
}
```

---

## Mutations

### 1. Create Nota Spesa

```typescript
// lib/mutations/nota-spesa.ts

import { createClient } from '@/lib/supabase/client';
import type { NotaSpesa } from '@/types/nota-spesa';

export interface CreateNotaSpesaInput {
  commessa_id: string;
  dipendente_id: string;
  data_nota: string;
  importo: number;
  categoria: string;
  descrizione?: string;
  allegati?: AllegatoNotaSpesa[];
  stato?: 'bozza' | 'da_approvare'; // Optional: if not set, trigger will decide
}

export async function createNotaSpesaMutation(
  input: CreateNotaSpesaInput
): Promise<NotaSpesa> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_spesa')
    .insert({
      ...input,
      allegati: input.allegati || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as NotaSpesa;
}
```

### 2. Update Nota Spesa

```typescript
export interface UpdateNotaSpesaInput {
  data_nota?: string;
  importo?: number;
  categoria?: string;
  descrizione?: string;
  allegati?: AllegatoNotaSpesa[];
  stato?: StatoNotaSpesa;
}

export async function updateNotaSpesaMutation(
  id: string,
  input: UpdateNotaSpesaInput
): Promise<NotaSpesa> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_spesa')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NotaSpesa;
}

// Re-submit rejected note
export async function resubmitNotaSpesaMutation(
  id: string,
  updates?: UpdateNotaSpesaInput
): Promise<NotaSpesa> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('note_spesa')
    .update({
      ...updates,
      stato: 'da_approvare',
      motivo_rifiuto: null,
      rifiutato_da: null,
      rifiutato_il: null,
    })
    .eq('id', id)
    .eq('stato', 'rifiutato')
    .select()
    .single();

  if (error) throw error;
  return data as NotaSpesa;
}
```

### 3. Delete Nota Spesa

```typescript
export async function deleteNotaSpesaMutation(id: string): Promise<void> {
  const supabase = createClient();

  // First, delete associated files from storage
  const { data: nota } = await supabase
    .from('note_spesa')
    .select('allegati, tenant_id, commessa_id')
    .eq('id', id)
    .single();

  if (nota && nota.allegati.length > 0) {
    const filePaths = nota.allegati.map((a: AllegatoNotaSpesa) => a.url);
    await supabase.storage
      .from('note_spesa_allegati')
      .remove(filePaths);
  }

  // Then delete nota
  const { error } = await supabase
    .from('note_spesa')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

---

## File Upload

### Upload Allegato

```typescript
// lib/storage/nota-spesa-allegati.ts

import { createClient } from '@/lib/supabase/client';
import type { AllegatoNotaSpesa } from '@/types/nota-spesa';

export interface UploadAllegatoOptions {
  tenantId: string;
  commessaId: string;
  notaSpesaId: string;
  file: File;
}

export async function uploadAllegatoMutation(
  options: UploadAllegatoOptions
): Promise<AllegatoNotaSpesa> {
  const { tenantId, commessaId, notaSpesaId, file } = options;
  const supabase = createClient();

  // Validate file
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File troppo grande. Massimo 10MB.');
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo file non supportato. Usa PDF, JPG, PNG o WEBP.');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}_${sanitizedName}`;

  // Construct path: {tenant_id}/{commessa_id}/{nota_spesa_id}/{filename}
  const filePath = `${tenantId}/${commessaId}/${notaSpesaId}/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('note_spesa_allegati')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Create allegato object
  const allegato: AllegatoNotaSpesa = {
    url: filePath,
    tipo: file.type.includes('pdf') ? 'pdf' : 'immagine',
    nome: file.name,
    size: file.size,
    uploaded_at: new Date().toISOString(),
  };

  return allegato;
}

// Add allegato to nota_spesa
export async function addAllegatoToNotaMutation(
  notaSpesaId: string,
  allegato: AllegatoNotaSpesa
): Promise<NotaSpesa> {
  const supabase = createClient();

  // Fetch current allegati
  const { data: nota, error: fetchError } = await supabase
    .from('note_spesa')
    .select('allegati')
    .eq('id', notaSpesaId)
    .single();

  if (fetchError) throw fetchError;

  // Append new allegato
  const allegatiAggiornati = [...(nota.allegati || []), allegato];

  // Update nota
  const { data, error } = await supabase
    .from('note_spesa')
    .update({ allegati: allegatiAggiornati })
    .eq('id', notaSpesaId)
    .select()
    .single();

  if (error) throw error;
  return data as NotaSpesa;
}

// Remove allegato
export async function removeAllegatoMutation(
  notaSpesaId: string,
  allegatoUrl: string
): Promise<NotaSpesa> {
  const supabase = createClient();

  // Fetch current allegati
  const { data: nota, error: fetchError } = await supabase
    .from('note_spesa')
    .select('allegati')
    .eq('id', notaSpesaId)
    .single();

  if (fetchError) throw fetchError;

  // Remove from storage
  await supabase.storage
    .from('note_spesa_allegati')
    .remove([allegatoUrl]);

  // Remove from allegati array
  const allegatiAggiornati = nota.allegati.filter(
    (a: AllegatoNotaSpesa) => a.url !== allegatoUrl
  );

  // Update nota
  const { data, error } = await supabase
    .from('note_spesa')
    .update({ allegati: allegatiAggiornati })
    .eq('id', notaSpesaId)
    .select()
    .single();

  if (error) throw error;
  return data as NotaSpesa;
}

// Get signed URL for download/view
export async function getSignedUrlQuery(
  allegatoUrl: string,
  expiresIn: number = 3600 // 1 hour
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('note_spesa_allegati')
    .createSignedUrl(allegatoUrl, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
```

---

## Approval Functions

### Approva Nota Spesa

```typescript
// lib/mutations/approvazione.ts

import { createClient } from '@/lib/supabase/client';

export async function approvaNotaSpesaMutation(
  notaSpesaId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('approva_nota_spesa', {
    p_nota_spesa_id: notaSpesaId,
    p_tenant_id: tenantId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string; data?: any };
}
```

### Rifiuta Nota Spesa

```typescript
export async function rifiutaNotaSpesaMutation(
  notaSpesaId: string,
  tenantId: string,
  motivo: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = createClient();

  if (!motivo || motivo.trim() === '') {
    return { success: false, error: 'Il motivo del rifiuto è obbligatorio' };
  }

  const { data, error } = await supabase.rpc('rifiuta_nota_spesa', {
    p_nota_spesa_id: notaSpesaId,
    p_tenant_id: tenantId,
    p_motivo: motivo,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string; data?: any };
}
```

---

## Hooks

### useMyNoteSpese

```typescript
// hooks/use-my-note-spese.ts

import { useQuery } from '@tanstack/react-query';
import { getMyNoteSpeseWithFilters, type NoteSpeseFilters } from '@/lib/queries/note-spesa';
import { useCurrentDipendente } from './use-current-dipendente';

export function useMyNoteSpese(filters?: NoteSpeseFilters) {
  const { dipendente } = useCurrentDipendente();

  return useQuery({
    queryKey: ['note-spese', 'my', dipendente?.id, filters],
    queryFn: () => {
      if (!dipendente?.id) throw new Error('Dipendente non trovato');
      return getMyNoteSpeseWithFilters(dipendente.id, filters);
    },
    enabled: !!dipendente?.id,
  });
}
```

### useNotePending

```typescript
export function useNotePending() {
  const { tenant } = useCurrentTenant();
  const { dipendente } = useCurrentDipendente();

  return useQuery({
    queryKey: ['note-spese', 'pending', tenant?.id, dipendente?.id],
    queryFn: () => {
      if (!tenant?.id || !dipendente?.id) throw new Error('Dati mancanti');
      return getNotePendingQuery(tenant.id, dipendente.id);
    },
    enabled: !!tenant?.id && !!dipendente?.id,
    refetchInterval: 30000, // Refetch every 30s
  });
}
```

### useCategorie

```typescript
export function useCategorie() {
  const { tenant } = useCurrentTenant();

  return useQuery({
    queryKey: ['categorie-note-spesa', tenant?.id],
    queryFn: () => {
      if (!tenant?.id) throw new Error('Tenant non trovato');
      return getCategorieNoteSpeseQuery(tenant.id);
    },
    enabled: !!tenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes (categorie change rarely)
  });
}
```

### useCreateNotaSpesa

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createNotaSpesaMutation } from '@/lib/mutations/nota-spesa';
import { toast } from 'sonner';

export function useCreateNotaSpesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNotaSpesaMutation,
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['note-spese'] });

      toast.success(
        data.stato === 'approvato'
          ? 'Nota spesa creata e approvata automaticamente'
          : 'Nota spesa creata. In attesa di approvazione.'
      );
    },
    onError: (error) => {
      toast.error(`Errore creazione: ${error.message}`);
    },
  });
}
```

### useApprovaNotaSpesa

```typescript
export function useApprovaNotaSpesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notaSpesaId, tenantId }: { notaSpesaId: string; tenantId: string }) =>
      approvaNotaSpesaMutation(notaSpesaId, tenantId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['note-spese'] });
        toast.success('Nota spesa approvata');
      } else {
        toast.error(result.error || 'Errore approvazione');
      }
    },
  });
}
```

---

## Components Examples

### NotaSpesaCard

```typescript
// components/nota-spesa-card.tsx

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { NotaSpesaWithRelations } from '@/types/nota-spesa';

export function NotaSpesaCard({ nota }: { nota: NotaSpesaWithRelations }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {nota.numero_nota || 'Bozza'}
        </CardTitle>
        <StatoBadge stato={nota.stato} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {formatCurrency(nota.importo)}
            </span>
            <CategoriaBadge categoria={nota.categoria_details} />
          </div>

          <div className="text-sm text-muted-foreground">
            <div>{nota.commesse.nome_commessa}</div>
            <div>
              {format(new Date(nota.data_nota), 'dd MMMM yyyy', { locale: it })}
            </div>
          </div>

          {nota.descrizione && (
            <p className="text-sm line-clamp-2">{nota.descrizione}</p>
          )}

          {nota.motivo_rifiuto && (
            <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              <strong>Motivo rifiuto:</strong> {nota.motivo_rifiuto}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              {nota.allegati.length > 0 && (
                <Badge variant="outline">
                  {nota.allegati.length} allegat{nota.allegati.length === 1 ? 'o' : 'i'}
                </Badge>
              )}
            </div>

            <NotaSpesaActions nota={nota} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatoBadge({ stato }: { stato: StatoNotaSpesa }) {
  const variants = {
    bozza: 'secondary',
    da_approvare: 'warning',
    approvato: 'success',
    rifiutato: 'destructive',
  } as const;

  const labels = {
    bozza: 'Bozza',
    da_approvare: 'Da approvare',
    approvato: 'Approvata',
    rifiutato: 'Rifiutata',
  };

  return <Badge variant={variants[stato]}>{labels[stato]}</Badge>;
}

function CategoriaBadge({ categoria }: { categoria: CategoriaNotaSpesa | null }) {
  if (!categoria) return null;

  return (
    <Badge
      variant="outline"
      style={{
        borderColor: categoria.colore || undefined,
        color: categoria.colore || undefined,
      }}
    >
      {categoria.nome}
    </Badge>
  );
}
```

### NuovaNotaSpesaForm

```typescript
// components/nuova-nota-spesa-form.tsx

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateNotaSpesa } from '@/hooks/use-create-nota-spesa';
import { useCategorie } from '@/hooks/use-categorie';

const formSchema = z.object({
  commessa_id: z.string().min(1, 'Seleziona una commessa'),
  data_nota: z.string().min(1, 'Inserisci la data'),
  importo: z.coerce.number().positive('Importo deve essere maggiore di 0'),
  categoria: z.string().min(1, 'Seleziona una categoria'),
  descrizione: z.string().optional(),
});

export function NuovaNotaSpesaForm({
  dipendenteId,
  commesseDisponibili,
  onSuccess,
}: {
  dipendenteId: string;
  commesseDisponibili: Array<{ id: string; nome_commessa: string }>;
  onSuccess?: () => void;
}) {
  const { data: categorie } = useCategorie();
  const createMutation = useCreateNotaSpesa();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      commessa_id: '',
      data_nota: new Date().toISOString().split('T')[0],
      importo: 0,
      categoria: '',
      descrizione: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await createMutation.mutateAsync({
      dipendente_id: dipendenteId,
      ...values,
    });

    form.reset();
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="commessa_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commessa</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona commessa" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commesseDisponibili.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_commessa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_nota"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="importo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importo (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categorie?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.codice}>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: cat.colore || '#gray' }}
                        />
                        {cat.nome}
                        {cat.importo_massimo && (
                          <span className="text-xs text-muted-foreground">
                            (max €{cat.importo_massimo})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descrizione"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrivi la spesa (es: Pranzo con cliente XYZ per trattativa contratto ABC)"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creazione...' : 'Crea Nota Spesa'}
        </Button>
      </form>
    </Form>
  );
}
```

---

**Ultimo aggiornamento:** 2025-02-23
