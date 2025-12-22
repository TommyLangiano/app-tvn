'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Calendar, Euro, Save, FileText, Trash, Tag, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSignedUrl } from '@/lib/utils/storage';
import type { NotaSpesa, CategoriaNotaSpesa, AllegatoNotaSpesa } from '@/types/nota-spesa';

interface EditNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  onClose: () => void;
  onSuccess: () => void;
}

interface FileWithPreview {
  file: File;
  preview: string;
}

export function EditNotaSpesaModal({ notaSpesa, onClose, onSuccess }: EditNotaSpesaModalProps) {
  const [formData, setFormData] = useState({
    data_nota: notaSpesa.data_nota,
    categoria: notaSpesa.categoria,
    importo: notaSpesa.importo.toString(),
    descrizione: notaSpesa.descrizione || '',
  });
  const [existingAllegato, setExistingAllegato] = useState<AllegatoNotaSpesa | null>(
    notaSpesa.allegati && notaSpesa.allegati.length > 0 ? notaSpesa.allegati[0] : null
  );
  const [deleteExistingAllegato, setDeleteExistingAllegato] = useState(false);
  const [newFile, setNewFile] = useState<FileWithPreview | null>(null);
  const [allegatiUrls, setAllegatiUrls] = useState<Map<string, string>>(new Map());
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categorie, setCategorie] = useState<CategoriaNotaSpesa[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategorie();
    loadAllegatiUrls();
  }, []);

  const loadCategorie = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      const { data: categorieData } = await supabase
        .from('categorie_note_spesa')
        .select('*')
        .eq('tenant_id', userTenants.tenant_id)
        .eq('attiva', true)
        .order('ordinamento');

      if (categorieData) {
        setCategorie(categorieData);
      }
    } catch (error) {
      console.error('Error loading categorie:', error);
    }
  };

  const loadAllegatiUrls = async () => {
    if (!existingAllegato) return;

    const urls = new Map<string, string>();
    const url = await getSignedUrl(existingAllegato.file_path);
    if (url) {
      urls.set(existingAllegato.file_path, url);
    }
    setAllegatiUrls(urls);
  };

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

    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} è troppo grande. Massimo 10MB per file`);
      return;
    }

    // Clean up previous new file if exists
    if (newFile) {
      URL.revokeObjectURL(newFile.preview);
    }

    const preview = URL.createObjectURL(file);
    setNewFile({ file, preview });
    setDeleteExistingAllegato(false);
  };

  const removeExistingAllegato = () => {
    setDeleteExistingAllegato(true);
  };

  const restoreExistingAllegato = () => {
    setDeleteExistingAllegato(false);
  };

  const removeNewFile = () => {
    if (newFile) {
      URL.revokeObjectURL(newFile.preview);
      setNewFile(null);
    }
  };

  const formatCurrencyInput = (value: string): string => {
    let cleaned = value.replace(/[^\d,\.]/g, '');
    cleaned = cleaned.replace(',', '.');

    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }

    return cleaned;
  };

  const handleImportoChange = (value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData({ ...formData, importo: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoria || !formData.importo || !formData.data_nota) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    const importoNum = parseFloat(formData.importo);
    if (isNaN(importoNum) || importoNum <= 0) {
      toast.error('Importo non valido');
      return;
    }

    const hasAllegato = (existingAllegato && !deleteExistingAllegato) || newFile;
    const categoriaSelezionata = categorie.find(c => c.id === formData.categoria);
    if (categoriaSelezionata?.richiede_allegato && !hasAllegato) {
      toast.error(`La categoria "${categoriaSelezionata.nome}" richiede un allegato`);
      return;
    }

    if (categoriaSelezionata?.importo_massimo && importoNum > categoriaSelezionata.importo_massimo) {
      toast.error(`L'importo massimo per la categoria "${categoriaSelezionata.nome}" è ${categoriaSelezionata.importo_massimo}€`);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) throw new Error('No tenant found');

      // Gestione allegato
      let finalAllegato = null;

      // Se c'è un nuovo file, caricalo
      if (newFile) {
        const filePath = `${userTenants.tenant_id}/note-spesa/${notaSpesa.commessa_id}/${Date.now()}_${newFile.file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('app-storage')
          .upload(filePath, newFile.file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Errore upload ${newFile.file.name}`);
        }

        finalAllegato = {
          nome_file: newFile.file.name,
          file_path: filePath,
          file_size: newFile.file.size,
          mime_type: newFile.file.type,
        };

        // Elimina il vecchio allegato se esiste
        if (existingAllegato) {
          await supabase.storage
            .from('app-storage')
            .remove([existingAllegato.file_path]);
        }
      } else if (deleteExistingAllegato && existingAllegato) {
        // Elimina l'allegato esistente
        await supabase.storage
          .from('app-storage')
          .remove([existingAllegato.file_path]);
        finalAllegato = null;
      } else if (existingAllegato) {
        // Mantieni l'allegato esistente
        finalAllegato = existingAllegato;
      }

      const finalAllegati = finalAllegato ? [finalAllegato] : [];

      // Update nota spesa
      const { error: updateError } = await supabase
        .from('note_spesa')
        .update({
          data_nota: formData.data_nota,
          importo: importoNum,
          categoria: formData.categoria,
          descrizione: formData.descrizione || null,
          allegati: finalAllegati,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notaSpesa.id);

      if (updateError) throw updateError;

      // Create azione log
      await supabase
        .from('note_spesa_azioni')
        .insert({
          nota_spesa_id: notaSpesa.id,
          tenant_id: userTenants.tenant_id,
          azione: 'modificata',
          eseguita_da: user.id,
        });

      toast.success('Nota spesa aggiornata con successo');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating nota spesa:', error);
      toast.error(error?.message || 'Errore nell\'aggiornamento della nota spesa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (newFile) {
        URL.revokeObjectURL(newFile.preview);
      }
    };
  }, [newFile]);

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-3xl w-full mx-auto max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Modifica Nota Spesa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {notaSpesa.numero_nota}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 border-2"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row: Data e Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Nota */}
            <div>
              <Label htmlFor="data_nota" className="text-foreground font-medium text-sm mb-2 block">
                Data Nota <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  id="data_nota"
                  type="date"
                  value={formData.data_nota}
                  onChange={(e) => setFormData({ ...formData, data_nota: e.target.value })}
                  className="h-11 border-2 border-border bg-background pl-10"
                  required
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <Label htmlFor="categoria" className="text-foreground font-medium text-sm mb-2 block">
                Categoria <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                  <SelectTrigger className="h-11 border-2 border-border bg-background pl-10">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorie.map(categoria => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoria.colore }}
                          />
                          <span>{categoria.nome}</span>
                          {categoria.importo_massimo && (
                            <span className="text-xs text-muted-foreground">
                              (max {categoria.importo_massimo}€)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Importo */}
          <div>
            <Label htmlFor="importo" className="text-foreground font-medium text-sm mb-2 block">
              Importo <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="importo"
                type="text"
                placeholder="0.00"
                value={formData.importo}
                onChange={(e) => handleImportoChange(e.target.value)}
                className="h-11 border-2 border-border bg-background pl-10"
                required
              />
            </div>
            {formData.importo && !isNaN(parseFloat(formData.importo)) && (
              <p className="text-sm text-muted-foreground mt-1">
                Importo: {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(parseFloat(formData.importo))}
              </p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <Label htmlFor="descrizione" className="text-foreground font-medium text-sm mb-2 block">
              Descrizione (opzionale)
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Textarea
                id="descrizione"
                placeholder="Eventuali dettagli sulla spesa..."
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                className="border-2 border-border bg-background pl-10 resize-none min-h-[100px]"
              />
            </div>
          </div>

          {/* Allegato */}
          <div>
            <Label className="text-foreground font-medium text-sm mb-2 block">
              Allegato {categorie.find(c => c.id === formData.categoria)?.richiede_allegato && (
                <span className="text-destructive">*</span>
              )}
            </Label>

            {/* Existing Allegato */}
            {existingAllegato && !newFile && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Allegato corrente:</p>
                <div
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg",
                    deleteExistingAllegato ? 'bg-red-50 opacity-50' : 'bg-muted/30'
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        deleteExistingAllegato && 'line-through text-muted-foreground'
                      )}>
                        {existingAllegato.nome_file}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(existingAllegato.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {deleteExistingAllegato ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={restoreExistingAllegato}
                      className="h-8 gap-1 text-primary hover:text-primary flex-shrink-0"
                    >
                      <XCircle className="h-4 w-4" />
                      Ripristina
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeExistingAllegato}
                      className="h-8 gap-1 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                    >
                      <Trash className="h-4 w-4" />
                      Rimuovi
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* New File Preview */}
            {newFile ? (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {newFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(newFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeNewFile}
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              !existingAllegato || deleteExistingAllegato ? (
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
                    dragActive
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-border hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <div className="text-center">
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-foreground mb-1">
                      Trascina il file qui o <span className="text-primary font-medium">clicca per selezionare</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Sostituisci allegato
                </Button>
              )
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-2 h-11 px-6 font-semibold"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-6 font-semibold gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvataggio in corso...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
