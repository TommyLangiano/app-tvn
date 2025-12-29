'use client';

import { useState, useRef } from 'react';
import { X, Upload, Trash, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadDocumentoSempliceProps {
  onClose: () => void;
  onSuccess: () => void;
  dipendenteId: string;
}

interface FileWithPreview {
  file: File;
  preview: string;
}

export function UploadDocumentoSemplice({ onClose, onSuccess, dipendenteId }: UploadDocumentoSempliceProps) {
  const [nomeDocumento, setNomeDocumento] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files).slice(0, 1));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files).slice(0, 1));
    }
  };

  const handleFiles = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} è troppo grande. Massimo 10MB per file`);
      return;
    }

    // Clean up previous file if exists
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview);
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setSelectedFile({ file, preview });

    // Auto-fill nome documento if empty
    if (!nomeDocumento) {
      setNomeDocumento(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const removeFile = () => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile.preview);
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nomeDocumento.trim()) {
      toast.error('Inserisci un nome per il documento');
      return;
    }

    if (!selectedFile) {
      toast.error('Carica un file');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non autenticato');

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) throw new Error('Tenant non trovato');

      // Upload file to storage with secure path
      const filePath = `${userTenants.tenant_id}/dipendenti/${dipendenteId}/documenti/${Date.now()}_${selectedFile.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('app-storage')
        .upload(filePath, selectedFile.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Errore upload ${selectedFile.file.name}`);
      }

      // Insert document record - tipo_documento sempre "altro" per file generici
      const { error: insertError } = await supabase
        .from('documenti_dipendenti')
        .insert({
          tenant_id: userTenants.tenant_id,
          dipendente_id: dipendenteId,
          tipo_documento: 'altro',
          nome_documento: nomeDocumento.trim(),
          descrizione: descrizione.trim() || null,
          file_path: filePath,
          file_name: selectedFile.file.name,
          file_size: selectedFile.file.size,
          mime_type: selectedFile.file.type,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('Documento caricato con successo');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error?.message || 'Errore nel caricamento del documento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Carica Documento</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Carica qualsiasi file (PDF, Word, immagini, ecc.)
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome Documento */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Documento <span className="text-destructive">*</span></Label>
            <Input
              id="nome"
              value={nomeDocumento}
              onChange={(e) => setNomeDocumento(e.target.value)}
              className="bg-white border border-input"
              placeholder="es. Contratto di lavoro"
            />
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="descrizione">Descrizione (opzionale)</Label>
            <Textarea
              id="descrizione"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="bg-white border border-input min-h-[80px]"
              placeholder="Aggiungi dettagli aggiuntivi..."
            />
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>File <span className="text-destructive">*</span></Label>
            <div
              className={cn(
                "relative border-2 border-dashed rounded-lg p-8 transition-all",
                dragActive
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-border bg-card hover:border-emerald-400"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />

              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="p-4 rounded-full bg-emerald-100">
                    <Upload className="h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Trascina il file qui o{' '}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-emerald-600 hover:text-emerald-700 underline"
                      >
                        seleziona
                      </button>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Qualsiasi formato (max 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 p-2 rounded bg-white">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeFile}
                    className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedFile || !nomeDocumento.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? 'Caricamento...' : 'Carica Documento'}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
