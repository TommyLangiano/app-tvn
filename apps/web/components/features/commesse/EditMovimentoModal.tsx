'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FileText, CloudUpload, Trash2, ExternalLink, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Movimento = {
  id: string;
  tipo: 'ricavo' | 'costo';
  categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
  numero?: string;
  cliente_fornitore: string;
  tipologia: string;
  data_emissione: string;
  data_pagamento?: string;
  importo_imponibile?: number;
  importo_iva?: number;
  percentuale_iva?: number;
  importo_totale: number;
  stato_pagamento?: string;
  modalita_pagamento?: string;
  allegato_url: string | null;
};

type ClienteFornitore = {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore: string;
  aliquota_iva_predefinita?: number;
  modalita_pagamento_preferita?: string;
};

const aliquoteIva = ['0', '4', '5', '10', '22'];

interface EditMovimentoModalProps {
  movimento: Movimento;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMovimentoModal({ movimento, onClose, onSuccess }: EditMovimentoModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordMeta, setRecordMeta] = useState<{ tenant_id: string; commessa_id: string } | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(movimento.allegato_url);
  const initialAllegatoRef = useRef<string | null>(movimento.allegato_url);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Cliente/Fornitore states
  const [clientiFornitori, setClientiFornitori] = useState<ClienteFornitore[]>([]);
  const [openCombo, setOpenCombo] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');

  const [formData, setFormData] = useState({
    numero: movimento.numero || '',
    cliente_fornitore: movimento.cliente_fornitore || '',
    tipologia: movimento.tipologia || '',
    data_emissione: movimento.data_emissione || '',
    data_pagamento: movimento.data_pagamento || '',
    importo_imponibile: movimento.importo_imponibile?.toString() || '',
    percentuale_iva: movimento.percentuale_iva?.toString() || '',
    importo_iva: movimento.importo_iva?.toString() || '',
    importo_totale: movimento.importo_totale?.toString() || '',
    stato_pagamento: movimento.stato_pagamento || '',
    modalita_pagamento: movimento.modalita_pagamento || '',
  });

  useEffect(() => {
    setFormData({
      numero: movimento.numero || '',
      cliente_fornitore: movimento.cliente_fornitore || '',
      tipologia: movimento.tipologia || '',
      data_emissione: movimento.data_emissione || '',
      data_pagamento: movimento.data_pagamento || '',
      importo_imponibile: movimento.importo_imponibile?.toString() || '',
      percentuale_iva: movimento.percentuale_iva?.toString() || '',
      importo_iva: movimento.importo_iva?.toString() || '',
      importo_totale: movimento.importo_totale?.toString() || '',
      stato_pagamento: movimento.stato_pagamento || '',
      modalita_pagamento: movimento.modalita_pagamento || '',
    });
    setSelectedFile(null);
    setCurrentFilePath(movimento.allegato_url);
    initialAllegatoRef.current = movimento.allegato_url;
    setShowRemoveConfirm(false);
    loadClientiFornitori();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimento.id]);

  const loadClientiFornitori = async () => {
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

      const tableName = movimento.tipo === 'ricavo' ? 'clienti' : 'fornitori';
      const { data, error } = await supabase
        .from(tableName)
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore, aliquota_iva_predefinita, modalita_pagamento_preferita')
        .eq('tenant_id', userTenants.tenant_id)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;
      setClientiFornitori(data || []);
    } catch (error) {
      console.error('Error loading clienti/fornitori:', error);
    }
  };

  const getDisplayName = (item: ClienteFornitore) => {
    if (item.forma_giuridica === 'persona_fisica') {
      return `${item.cognome || ''} ${item.nome || ''}`.trim();
    }
    return item.ragione_sociale || '';
  };

  const handleSelectClienteFornitore = (itemId: string) => {
    const item = clientiFornitori.find(c => c.id === itemId);
    console.log('Cliente/Fornitore selezionato:', item);
    if (item) {
      setSelectedId(itemId);
      setFormData(prev => ({
        ...prev,
        cliente_fornitore: getDisplayName(item),
        tipologia: item.tipologia_settore || prev.tipologia,
        percentuale_iva: item.aliquota_iva_predefinita?.toString() || prev.percentuale_iva,
        modalita_pagamento: item.modalita_pagamento_preferita || prev.modalita_pagamento,
      }));
      setOpenCombo(false);
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    switch (categoria) {
      case 'fattura_attiva':
        return 'Fattura Attiva';
      case 'fattura_passiva':
        return 'Fattura Passiva';
      case 'scontrino':
        return 'Scontrino';
      default:
        return categoria;
    }
  };

  const getTableName = () => {
    switch (movimento.categoria) {
      case 'fattura_attiva':
        return 'fatture_attive';
      case 'fattura_passiva':
        return 'fatture_passive';
      case 'scontrino':
        return 'scontrini';
      default:
        throw new Error('Categoria non valida');
    }
  };

  const getStorageFolder = () => {
    switch (movimento.categoria) {
      case 'fattura_attiva':
        return 'fatture/attive';
      case 'fattura_passiva':
        return 'fatture/passive';
      default:
        return 'scontrini';
    }
  };

  const extractStoragePath = (url: string | null) => {
    if (!url) return null;
    if (url.includes('/object/public/')) {
      const [, path] = url.split('/object/public/');
      if (!path) return null;
      return path.replace(/^fatture-documents\//, '');
    }
    return url.replace(/^fatture-documents\//, '');
  };

  const buildPublicUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!baseUrl) return path;
    const normalized = path.replace(/^\/+/, '').replace(/^fatture-documents\//, '');
    return `${baseUrl}/storage/v1/object/public/fatture-documents/${normalized}`;
  };

  const getFileName = (path: string | null) => {
    if (!path) return '';
    const normalized = path.includes('/object/public/')
      ? path.split('/object/public/')[1] ?? path
      : path;
    const clean = normalized.replace(/^fatture-documents\//, '');
    const lastSegment = clean.split('/').pop() ?? clean;
    return lastSegment.split('?')[0];
  };

  useEffect(() => {
    let active = true;

    const fetchMeta = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from(getTableName())
          .select('tenant_id, commessa_id')
          .eq('id', movimento.id)
          .single();

        if (error) throw error;
        if (active) {
          setRecordMeta(data);
        }
      } catch (error) {
        console.error('Error fetching movimento metadata:', error);
      }
    };

    fetchMeta();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movimento.id, movimento.categoria]);

  const validateFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Il file è troppo grande. Massimo 10MB');
      return false;
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo di file non supportato. Usa PDF o immagini');
      return false;
    }

    return true;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (loading || uploadingFile) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (loading || uploadingFile) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    if (loading || uploadingFile) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    if (loading || uploadingFile) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    let meta = recordMeta;

    if (!meta) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from(getTableName())
          .select('tenant_id, commessa_id')
          .eq('id', movimento.id)
          .single();

        if (error) throw error;
        meta = data;
        setRecordMeta(data);
      } catch (error) {
        console.error('Error fetching movimento metadata:', error);
        toast.error('Impossibile recuperare le informazioni della commessa per l\'allegato');
        return null;
      }
    }

    try {
      setUploadingFile(true);
      const supabase = createClient();
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const extension = selectedFile.name.includes('.') ? selectedFile.name.split('.').pop() : '';
      const fileName = extension ? `${timestamp}_${randomSuffix}.${extension}` : `${timestamp}_${randomSuffix}`;
      const filePath = `${meta!.tenant_id}/${getStorageFolder()}/${meta!.commessa_id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('fatture-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return data.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Errore durante il caricamento del file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteStorageFile = async (path: string | null) => {
    const storagePath = extractStoragePath(path);
    if (!storagePath) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.storage.from('fatture-documents').remove([storagePath]);
      if (error) {
        console.error('Error deleting file from storage:', error);
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
    }
  };

  const handleRemoveExistingFile = () => {
    if (loading || uploadingFile) return;
    setCurrentFilePath(null);
    setSelectedFile(null);
    setShowRemoveConfirm(false);
  };

  const palette =
    movimento.tipo === 'ricavo'
      ? {
          idle: 'border-border hover:border-green-300 hover:bg-green-50/50',
          active: 'border-green-500 bg-green-50 dark:bg-green-950/20',
          selected: 'border-green-300 bg-green-50 dark:bg-green-950/10',
          icon: 'text-green-600',
        }
      : {
          idle: 'border-border hover:border-red-300 hover:bg-red-50/50',
          active: 'border-red-500 bg-red-50 dark:bg-red-950/20',
          selected: 'border-red-300 bg-red-50 dark:bg-red-950/10',
          icon: 'text-red-600',
        };

  const dropDisabled = loading || uploadingFile;
  const dropzoneClassName = `relative cursor-pointer rounded-lg border-2 border-dashed transition-all ${
    dropDisabled
      ? 'border-border opacity-60 pointer-events-none'
      : isDragging
        ? palette.active
        : selectedFile
          ? palette.selected
          : palette.idle
  }`;

  const currentFileUrl = buildPublicUrl(currentFilePath);
  const currentFileName = getFileName(currentFilePath);
  const isScontrino = movimento.categoria === 'scontrino';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let uploadedPath: string | null = null;
    let removeAfterUpdate: string | null = null;

    try {
      if (selectedFile) {
        const path = await uploadFile();
        if (!path) {
          return;
        }
        uploadedPath = path;
        removeAfterUpdate = initialAllegatoRef.current;
      } else if (!currentFilePath && initialAllegatoRef.current) {
        removeAfterUpdate = initialAllegatoRef.current;
      }

      const supabase = createClient();
      const dataToUpdate: Record<string, unknown> = {
        tipologia: formData.tipologia,
        data_emissione: formData.data_emissione,
        modalita_pagamento: formData.modalita_pagamento || null,
        allegato_url: selectedFile ? uploadedPath : currentFilePath,
      };

      if (!isScontrino) {
        dataToUpdate.numero_fattura = formData.numero;
        dataToUpdate.importo_imponibile = formData.importo_imponibile ? parseFloat(formData.importo_imponibile) : null;
        dataToUpdate.aliquota_iva = formData.percentuale_iva ? parseFloat(formData.percentuale_iva) : null;
        dataToUpdate.importo_iva = formData.importo_iva ? parseFloat(formData.importo_iva) : null;
        dataToUpdate.stato_pagamento = formData.stato_pagamento;
        dataToUpdate.data_pagamento = formData.data_pagamento || null;
      } else {
        // Per gli scontrini, importo_totale non è generato, quindi lo aggiorniamo
        dataToUpdate.importo_totale = parseFloat(formData.importo_totale);
      }

      if (movimento.categoria === 'fattura_attiva') {
        dataToUpdate.cliente = formData.cliente_fornitore;
      } else {
        dataToUpdate.fornitore = formData.cliente_fornitore;
      }

      const { error } = await supabase
        .from(getTableName())
        .update(dataToUpdate)
        .eq('id', movimento.id);

      if (error) throw error;

      if (uploadedPath) {
        initialAllegatoRef.current = uploadedPath;
      } else if (!currentFilePath) {
        initialAllegatoRef.current = null;
      }

      if (removeAfterUpdate) {
        await deleteStorageFile(removeAfterUpdate);
      }

      toast.success('Movimento aggiornato con successo');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating movimento:', error);
      toast.error('Errore durante l\'aggiornamento del movimento');

      if (uploadedPath) {
        await deleteStorageFile(uploadedPath);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative bg-background rounded-xl border-2 border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                movimento.tipo === 'ricavo' ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <FileText
                className={`h-5 w-5 ${
                  movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                }`}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">Modifica {getCategoriaLabel(movimento.categoria)}</h2>
              <p className="text-sm text-muted-foreground">Aggiorna i dettagli del movimento</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="icon"
            className="border-2 border-border bg-white text-foreground hover:bg-white/90"
            disabled={loading || uploadingFile}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <section className="space-y-4 rounded-xl border-2 border-border bg-background p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Informazioni documento
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {!isScontrino && (
                <div className="space-y-2">
                  <Label htmlFor="numero">Numero Fattura</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    className="border-2 border-border"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="cliente_fornitore">
                  {movimento.tipo === 'ricavo' ? 'Cliente' : 'Fornitore'}
                </Label>
                <Popover open={openCombo} onOpenChange={setOpenCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombo}
                      className="w-full justify-between h-11 border-2 border-border font-normal"
                    >
                      {formData.cliente_fornitore || `Seleziona ${movimento.tipo === 'ricavo' ? 'cliente' : 'fornitore'} o scrivi...`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                    <Command>
                      <CommandInput
                        placeholder={`Cerca ${movimento.tipo === 'ricavo' ? 'cliente' : 'fornitore'} o scrivi...`}
                        value={formData.cliente_fornitore}
                        onValueChange={(value) => {
                          setFormData({ ...formData, cliente_fornitore: value });
                          setSelectedId('');
                        }}
                      />
                      <CommandEmpty>
                        <div className="p-2 text-sm text-muted-foreground">
                          Nessun {movimento.tipo === 'ricavo' ? 'cliente' : 'fornitore'} trovato. Scrivi per inserire manualmente.
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-auto">
                        {clientiFornitori.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={getDisplayName(item)}
                            onSelect={() => handleSelectClienteFornitore(item.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedId === item.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{getDisplayName(item)}</span>
                              <span className="text-xs text-muted-foreground">{item.tipologia_settore}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipologia">Tipologia</Label>
                <Input
                  id="tipologia"
                  value={formData.tipologia}
                  onChange={(e) => setFormData({ ...formData, tipologia: e.target.value })}
                  className="border-2 border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_emissione">Data Emissione</Label>
                <Input
                  id="data_emissione"
                  type="date"
                  value={formData.data_emissione}
                  onChange={(e) => setFormData({ ...formData, data_emissione: e.target.value })}
                  className="border-2 border-border"
                  required
                />
              </div>
              {!isScontrino && (
                <div className="space-y-2">
                  <Label htmlFor="data_pagamento">Data Pagamento</Label>
                  <Input
                    id="data_pagamento"
                    type="date"
                    value={formData.data_pagamento}
                    onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                    className="border-2 border-border"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border-2 border-border bg-background p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Importi e stato
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {!isScontrino && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="importo_imponibile">Imponibile (€)</Label>
                    <Input
                      id="importo_imponibile"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={formData.importo_imponibile}
                      onChange={(e) => setFormData({ ...formData, importo_imponibile: e.target.value })}
                      className="border-2 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentuale_iva">% IVA</Label>
                    <Select
                      value={formData.percentuale_iva}
                      onValueChange={(value) => setFormData({ ...formData, percentuale_iva: value })}
                    >
                      <SelectTrigger className="h-10 border-2 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {aliquoteIva.map((aliquota) => (
                          <SelectItem key={aliquota} value={aliquota}>
                            {aliquota}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="importo_iva">IVA (€)</Label>
                    <Input
                      id="importo_iva"
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={formData.importo_iva}
                      onChange={(e) => setFormData({ ...formData, importo_iva: e.target.value })}
                      className="border-2 border-border"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="importo_totale">Totale (€)</Label>
                <Input
                  id="importo_totale"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={formData.importo_totale}
                  onChange={(e) => setFormData({ ...formData, importo_totale: e.target.value })}
                  className="border-2 border-border"
                  required
                />
              </div>
              {isScontrino ? (
                <div className="space-y-2">
                  <Label htmlFor="modalita_pagamento">Modalità di Pagamento</Label>
                  <Input
                    id="modalita_pagamento"
                    value={formData.modalita_pagamento}
                    onChange={(e) => setFormData({ ...formData, modalita_pagamento: e.target.value })}
                    className="border-2 border-border"
                    placeholder="Es. Bonifico bancario"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="modalita_pagamento">Modalità di Pagamento</Label>
                    <Input
                      id="modalita_pagamento"
                      value={formData.modalita_pagamento}
                      onChange={(e) => setFormData({ ...formData, modalita_pagamento: e.target.value })}
                      className="border-2 border-border"
                      placeholder="Es. Bonifico bancario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stato_pagamento">Stato Pagamento</Label>
                    <select
                      id="stato_pagamento"
                      value={formData.stato_pagamento}
                      onChange={(e) => setFormData({ ...formData, stato_pagamento: e.target.value })}
                      className="h-10 w-full rounded-lg border-2 border-border bg-background px-3 text-sm"
                    >
                      <option value="">Seleziona stato</option>
                      <option value="Pagato">Pagato</option>
                      <option value="Da Pagare">Da Pagare</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-xl border-2 border-border bg-background p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Documentazione
                </h3>
                <p className="text-xs text-muted-foreground">
                  Gestisci l&apos;allegato associato al movimento.
                </p>
              </div>
              {currentFilePath && currentFileUrl && (
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-2 border-border bg-white text-foreground hover:bg-white/90"
                >
                  <a href={currentFileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Apri allegato
                  </a>
                </Button>
              )}
            </div>

            {currentFilePath && (
              <div className="flex flex-col gap-3 rounded-lg border-2 border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <FileText className={`h-8 w-8 ${palette.icon}`} />
                  <div>
                    <p className="break-all text-sm font-semibold">{currentFileName || 'Documento allegato'}</p>
                    <p className="text-xs text-muted-foreground">Allegato attuale</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRemoveConfirm(true)}
                    disabled={loading || uploadingFile}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Rimuovi
                  </Button>
                </div>
              </div>
            )}
            {(!currentFilePath || selectedFile) && (
              <div className="space-y-2">
                <Label>Allegato (PDF o Immagine)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div
                  className={dropzoneClassName}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (dropDisabled) return;
                    fileInputRef.current?.click();
                  }}
                >
                  <div className="p-6 text-center">
                    {selectedFile ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center">
                          <FileText className={`h-10 w-10 ${palette.icon}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedFile(null);
                          }}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Rimuovi file
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center">
                          <CloudUpload className={`h-10 w-10 ${palette.icon}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {isDragging
                              ? 'Rilascia il file qui'
                              : 'Trascina qui il file da allegare'}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            oppure clicca per selezionarlo dal dispositivo
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PDF, JPG, PNG, WEBP, HEIC (max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t-2 border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploadingFile}
              className="border-2 border-border bg-white text-foreground hover:bg-white/90"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={loading || uploadingFile}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {uploadingFile ? 'Caricamento file...' : loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </div>
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (loading || uploadingFile) return;
            setShowRemoveConfirm(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border-2 border-border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Rimuovere l&apos;allegato?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Eliminando l&apos;allegato dovrai caricarne uno nuovo prima di salvare se desideri sostituirlo.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={loading || uploadingFile}
                className="border-2 border-border bg-white text-foreground hover:bg-white/90"
              >
                Annulla
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemoveExistingFile}
                disabled={loading || uploadingFile}
              >
                Rimuovi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
