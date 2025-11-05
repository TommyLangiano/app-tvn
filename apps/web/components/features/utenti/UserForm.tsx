/**
 * UserForm Component
 *
 * Reusable form for creating/editing users
 */

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { ACTIVE_ROLES, ROLE_METADATA, ROLE_PERMISSIONS } from '@/lib/permissions/config';
import { Mail, User, Phone, Briefcase, FileText, Calendar, Upload } from 'lucide-react';
import { useState } from 'react';

const userSchema = z.object({
  email: z.string().email('Email non valida'),
  first_name: z.string().min(2, 'Nome troppo corto'),
  last_name: z.string().min(2, 'Cognome troppo corto'),
  phone: z.string().optional(),
  position: z.string().optional(),
  notes: z.string().optional(),
  role: z.enum(['admin', 'admin_readonly', 'operaio', 'billing_manager']),
  // Campi HR opzionali
  birth_date: z.string().optional(),
  hire_date: z.string().optional(),
  medical_checkup_date: z.string().optional(),
  medical_checkup_expiry: z.string().optional(),
  document_file: z.any().optional(), // File caricato (CV o altro)
});

export type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  defaultValues?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
  isSubmitting?: boolean;
  existingDocument?: string | null;
}

export function UserForm({
  defaultValues = { role: 'operaio' },
  onSubmit,
  onCancel,
  isEdit = false,
  isSubmitting = false,
  existingDocument = null,
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues,
  });

  const role = watch('role');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<string | null>(existingDocument);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Dati Base */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Dati Base</h3>
          <p className="text-sm text-muted-foreground">Informazioni di contatto dell&apos;utente</p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={isEdit}
              className="h-11 border-2 border-border pl-10"
              placeholder="mario.rossi@esempio.it"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="first_name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="first_name"
                {...register('first_name')}
                className="h-11 border-2 border-border pl-10"
                placeholder="Mario"
              />
            </div>
            {errors.first_name && (
              <p className="text-sm text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          {/* Cognome */}
          <div className="space-y-2">
            <Label htmlFor="last_name">
              Cognome <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="last_name"
                {...register('last_name')}
                className="h-11 border-2 border-border pl-10"
                placeholder="Rossi"
              />
            </div>
            {errors.last_name && (
              <p className="text-sm text-destructive">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* Telefono */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefono</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              className="h-11 border-2 border-border pl-10"
              placeholder="+39 123 456 7890"
            />
          </div>
        </div>
      </div>

      {/* Dati Professionali */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Dati Professionali</h3>
          <p className="text-sm text-muted-foreground">Ruolo aziendale e note interne</p>
        </div>

        {/* Posizione */}
        <div className="space-y-2">
          <Label htmlFor="position">Ruolo Aziendale</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="position"
              {...register('position')}
              className="h-11 border-2 border-border pl-10"
              placeholder="es: Tecnico Senior, Contabile"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Ruolo dell&apos;utente all&apos;interno dell&apos;azienda (non correlato ai permessi)
          </p>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="notes">Note Interne</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="notes"
              {...register('notes')}
              className="border-2 border-border pl-10 min-h-[100px]"
              placeholder="Note visibili solo agli amministratori..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Queste note sono visibili solo agli amministratori
          </p>
        </div>
      </div>

      {/* Informazioni Aggiuntive (HR) */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Informazioni Aggiuntive</h3>
          <p className="text-sm text-muted-foreground">Dati HR e documenti (opzionali)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data di Nascita */}
          <div className="space-y-2">
            <Label htmlFor="birth_date">Data di Nascita</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="birth_date"
                type="date"
                {...register('birth_date')}
                className="h-11 border-2 border-border pl-10"
              />
            </div>
          </div>

          {/* Data Assunzione */}
          <div className="space-y-2">
            <Label htmlFor="hire_date">Data Assunzione</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="hire_date"
                type="date"
                {...register('hire_date')}
                className="h-11 border-2 border-border pl-10"
              />
            </div>
          </div>

          {/* Data Visita Medica */}
          <div className="space-y-2">
            <Label htmlFor="medical_checkup_date">Data Visita Medica</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="medical_checkup_date"
                type="date"
                {...register('medical_checkup_date')}
                className="h-11 border-2 border-border pl-10"
              />
            </div>
          </div>

          {/* Data Scadenza Visita Medica */}
          <div className="space-y-2">
            <Label htmlFor="medical_checkup_expiry">Data Scadenza Visita Medica</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="medical_checkup_expiry"
                type="date"
                {...register('medical_checkup_expiry')}
                className="h-11 border-2 border-border pl-10"
              />
            </div>
          </div>
        </div>

        {/* Caricamento Documento */}
        <div className="space-y-2">
          <Label htmlFor="document_file">Documento (CV o altro)</Label>

          {/* Documento esistente */}
          {currentDocument && !uploadedFileName && (
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 flex-1">Documento caricato</span>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const response = await fetch(`/api/users/download-document?path=${encodeURIComponent(currentDocument)}`);
                    if (!response.ok) throw new Error('Errore nel caricamento');
                    const { url } = await response.json();
                    window.open(url, '_blank');
                  } catch {
                    alert('Impossibile aprire il documento');
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                title="Visualizza documento"
              >
                Visualizza
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  if (confirm('Eliminare il documento caricato?')) {
                    setCurrentDocument(null);
                  }
                }}
                className="p-2 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                title="Elimina"
              >
                <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}

          {/* Upload nuovo file */}
          {(!currentDocument || uploadedFileName) && (
            <div className="relative">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="document_file"
                  className="flex-1 h-11 border-2 border-border rounded-md px-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {uploadedFileName || 'Seleziona un file...'}
                  </span>
                </label>
                <input
                  id="document_file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedFileName(file.name);
                      setValue('document_file', file);
                    }
                  }}
                />
                {uploadedFileName && (
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
                      setValue('document_file', undefined);
                      const input = document.getElementById('document_file') as HTMLInputElement;
                      if (input) input.value = '';
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Rimuovi file"
                  >
                    <svg className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Formati supportati: PDF, Word, immagini (max 10MB)
          </p>
        </div>
      </div>

      {/* Permessi Sistema */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Permessi Sistema</h3>
          <p className="text-sm text-muted-foreground">Livello di accesso alla piattaforma</p>
        </div>

        {/* Card Info Ruolo con Select integrato - Full Width in Edit Mode */}
        <div className={`${isEdit ? 'w-full' : 'grid grid-cols-1 lg:grid-cols-2 gap-4'}`}>
          <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
            <Select value={role} onValueChange={(val) => setValue('role', val as 'admin' | 'admin_readonly' | 'operaio' | 'billing_manager')}>
              <SelectTrigger className="h-auto p-4 border-0 border-b rounded-none hover:bg-accent/50 transition-colors [&>svg]:hidden">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm">{ROLE_METADATA[role]?.label || role}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_METADATA[role]?.description || ''}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Clicca per cambiare ruolo
                      </p>
                    </div>
                  </div>
                  <div className="text-muted-foreground ml-2">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-50">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </SelectTrigger>
              <SelectContent>
                {ACTIVE_ROLES.map((roleOption) => {
                  const meta = ROLE_METADATA[roleOption];
                  if (meta.isHiddenFromUI) return null;

                  return (
                    <SelectItem key={roleOption} value={roleOption}>
                      <div className="flex flex-col">
                        <span className="font-medium">{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{meta.description}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Permessi - Non cliccabile */}
            <div className="p-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Permessi Inclusi
              </p>
              <div className={`grid ${isEdit ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-2`}>
                {ROLE_PERMISSIONS[role]?.map((permission, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">✓</span>
                    <span className="text-muted-foreground">{permission}</span>
                  </div>
                )) || <p className="text-xs text-muted-foreground">Nessun permesso disponibile</p>}
              </div>
            </div>
          </div>

          {/* Card Email di invito - solo in creazione */}
          {!isEdit && (
            <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Mail className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Email di invito automatica</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      L&apos;utente riceverà un&apos;email con un link sicuro per impostare la password (valido 24 ore) e le istruzioni per il primo accesso.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Cosa Succede
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600">✓</span>
                    <span className="text-muted-foreground">Email di invito inviata automaticamente</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600">✓</span>
                    <span className="text-muted-foreground">Link sicuro valido per 24 ore</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600">✓</span>
                    <span className="text-muted-foreground">Istruzioni per il primo accesso incluse</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-600">✓</span>
                    <span className="text-muted-foreground">Password impostata dall&apos;utente</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="border-2">
          Annulla
        </Button>
        <Button type="submit" disabled={isSubmitting} className="border-2">
          {isSubmitting
            ? isEdit
              ? 'Salvataggio...'
              : 'Creazione...'
            : isEdit
            ? 'Salva Modifiche'
            : 'Crea Utente'}
        </Button>
      </div>
    </form>
  );
}
