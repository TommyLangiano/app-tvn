'use client';

import { useState, useEffect, useRef } from 'react';
import { X, FileText, CloudUpload, RotateCcw, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FatturaAttivaFormProps {
  commessaId: string;
  commessaNome?: string;
  clientePrecompilato?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type Cliente = {
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

export function FatturaAttivaForm({
  commessaId,
  commessaNome,
  onSuccess,
  onCancel
}: FatturaAttivaFormProps) {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cliente states
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [openClienteCombo, setOpenClienteCombo] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');

  const [formData, setFormData] = useState({
    numero_fattura: '',
    cliente: '',
    tipologia: '',
    data_emissione: new Date().toISOString().split('T')[0],
    data_pagamento: '',
    importo_imponibile: '',
    aliquota_iva: '22',
    importo_totale: '',
    modalita_pagamento: '',
    stato_pagamento: 'Non Pagato' as 'Pagato' | 'Non Pagato',
  });

  useEffect(() => {
    loadTenantId();
    // Blocca lo scroll del body quando il modal è aperto
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTenantId = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenants) {
        setTenantId(userTenants.tenant_id);
        // Load clienti after getting tenant
        loadClienti(userTenants.tenant_id);
      }
    } catch {

    }
  };

  const loadClienti = async (tenant_id: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clienti')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore, aliquota_iva_predefinita, modalita_pagamento_preferita')
        .eq('tenant_id', tenant_id)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;
      setClienti(data || []);
    } catch {

    }
  };

  const getClienteDisplayName = (cliente: Cliente) => {
    if (cliente.forma_giuridica === 'persona_fisica') {
      return `${cliente.cognome || ''} ${cliente.nome || ''}`.trim();
    }
    return cliente.ragione_sociale || '';
  };

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clienti.find(c => c.id === clienteId);

    if (cliente) {
      setSelectedClienteId(clienteId);
      setFormData(prev => ({
        ...prev,
        cliente: getClienteDisplayName(cliente),
        tipologia: cliente.tipologia_settore || prev.tipologia,
        aliquota_iva: cliente.aliquota_iva_predefinita?.toString() || prev.aliquota_iva,
        modalita_pagamento: cliente.modalita_pagamento_preferita || prev.modalita_pagamento,
      }));
      // Ricalcola totale con nuova aliquota IVA se c'è un imponibile
      if (formData.importo_imponibile) {
        const imponibileNum = parseFloat(formData.importo_imponibile);
        const aliquota = parseFloat(cliente.aliquota_iva_predefinita?.toString() || formData.aliquota_iva);
        const iva = (imponibileNum * aliquota) / 100;
        const totale = imponibileNum + iva;
        setFormData(prev => ({
          ...prev,
          cliente: getClienteDisplayName(cliente),
          tipologia: cliente.tipologia_settore || prev.tipologia,
          aliquota_iva: cliente.aliquota_iva_predefinita?.toString() || prev.aliquota_iva,
          modalita_pagamento: cliente.modalita_pagamento_preferita || prev.modalita_pagamento,
          importo_totale: totale > 0 ? totale.toFixed(2) : prev.importo_totale,
        }));
      }
      setOpenClienteCombo(false);
    }
  };

  const calcolaIva = () => {
    const imponibile = parseFloat(formData.importo_imponibile) || 0;
    const aliquota = parseFloat(formData.aliquota_iva) || 0;
    return (imponibile * aliquota) / 100;
  };

  // Removed unused calcolaTotale function - totale is calculated in handleImponibileChange

  // Calcolo da Totale a Imponibile
  const handleTotaleChange = (totale: string) => {
    const totaleNum = parseFloat(totale) || 0;
    const aliquota = parseFloat(formData.aliquota_iva) || 0;

    // Formula: imponibile = totale / (1 + aliquota/100)
    const imponibile = totaleNum / (1 + aliquota / 100);

    setFormData({
      ...formData,
      importo_totale: totale,
      importo_imponibile: imponibile > 0 ? imponibile.toFixed(2) : '',
    });
  };

  // Calcolo da Imponibile a Totale
  const handleImponibileChange = (imponibile: string) => {
    const imponibileNum = parseFloat(imponibile) || 0;
    const aliquota = parseFloat(formData.aliquota_iva) || 0;
    const iva = (imponibileNum * aliquota) / 100;
    const totale = imponibileNum + iva;

    setFormData({
      ...formData,
      importo_imponibile: imponibile,
      importo_totale: totale > 0 ? totale.toFixed(2) : '',
    });
  };

  const validateFile = (file: File): boolean => {
    // Check file size (10MB max)
    if (file.size > 10485760) {
      toast.error('Il file è troppo grande. Massimo 10MB');
      return false;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo di file non supportato. Usa PDF o immagini');
      return false;
    }

    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile || !tenantId) return null;

    try {
      setUploadingFile(true);
      const supabase = createClient();

      // Generate unique filename with organized folder structure
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${tenantId}/fatture/attive/${commessaId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('app-storage')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return data.path;
    } catch {

      toast.error('Errore durante il caricamento del file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleReset = () => {
    setFormData({
      numero_fattura: '',
      cliente: '',
      tipologia: '',
      data_emissione: new Date().toISOString().split('T')[0],
      data_pagamento: '',
      importo_imponibile: '',
      aliquota_iva: '22',
      importo_totale: '',
      modalita_pagamento: '',
      stato_pagamento: 'Non Pagato' as 'Pagato' | 'Non Pagato',
    });
    setSelectedFile(null);
    setSelectedClienteId('');
    setOpenClienteCombo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      // Upload file if present
      let allegato_url = null;
      if (selectedFile) {
        allegato_url = await uploadFile();
        if (!allegato_url && selectedFile) {
          // Upload failed but file was selected
          return;
        }
      }

      const importo_imponibile = parseFloat(formData.importo_imponibile);
      const aliquota_iva = parseFloat(formData.aliquota_iva);
      const importo_iva = calcolaIva();

      const dataToInsert = {
        commessa_id: commessaId || null,
        tenant_id: tenantId,
        numero_fattura: formData.numero_fattura,
        cliente: formData.cliente,
        tipologia: formData.tipologia,
        data_emissione: formData.data_emissione,
        data_pagamento: formData.data_pagamento || null,
        importo_imponibile,
        aliquota_iva,
        importo_iva,
        modalita_pagamento: formData.modalita_pagamento || null,
        stato_pagamento: formData.stato_pagamento,
        allegato_url,
        created_by: user.id,
      };

      const { error } = await supabase.from('fatture_attive').insert(dataToInsert);

      if (error) throw error;

      toast.success('Fattura aggiunta con successo!');
      handleReset();
      onSuccess();
    } catch (err) {
      console.error('Supabase error:', err);
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        toast.error(`Il numero fattura "${formData.numero_fattura}" esiste già. Usa un numero diverso.`);
      } else {
        toast.error('Errore nell\'aggiunta della fattura');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onCancel}>
      <div className="w-full max-w-4xl mx-auto max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card p-6 shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">
              Nuova Fattura Attiva
              {commessaNome && (
                <> - {commessaNome}</>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={loading || uploadingFile}
              className="h-8 border-2 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-xs">Reset Dati</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 border-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Riga 1: N. Fattura, Cliente, Tipologia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_fattura">
                N. Fattura <span className="text-destructive">*</span>
              </Label>
              <Input
                id="numero_fattura"
                value={formData.numero_fattura}
                onChange={(e) => setFormData({ ...formData, numero_fattura: e.target.value })}
                placeholder="Es. 2024/001"
                required
                className="h-11 border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">
                Cliente <span className="text-destructive">*</span>
              </Label>
              <Popover open={openClienteCombo} onOpenChange={setOpenClienteCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClienteCombo}
                    className="w-full justify-between h-11 border-2 border-border font-normal"
                  >
                    {formData.cliente || "Seleziona cliente o scrivi..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                  <Command>
                    <CommandInput
                      placeholder="Cerca cliente o scrivi..."
                      value={formData.cliente}
                      onValueChange={(value) => {
                        setFormData({ ...formData, cliente: value });
                        setSelectedClienteId('');
                      }}
                    />
                    <CommandEmpty>
                      <div className="p-2 text-sm text-muted-foreground">
                        Nessun cliente trovato. Scrivi per inserire manualmente.
                      </div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-[200px] overflow-auto">
                      {clienti.map((cliente) => (
                        <CommandItem
                          key={cliente.id}
                          value={getClienteDisplayName(cliente)}
                          onSelect={() => handleSelectCliente(cliente.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedClienteId === cliente.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{getClienteDisplayName(cliente)}</span>
                            <span className="text-xs text-muted-foreground">{cliente.tipologia_settore}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipologia">
                Tipologia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tipologia"
                value={formData.tipologia}
                onChange={(e) => setFormData({ ...formData, tipologia: e.target.value })}
                placeholder="Es. Acconto, SAL, Saldo"
                required
                className="h-11 border-2 border-border"
              />
            </div>
          </div>

          {/* Riga 2: Data Emissione, Data Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="data_emissione">
                Data Emissione <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_emissione"
                type="date"
                value={formData.data_emissione}
                onChange={(e) => setFormData({ ...formData, data_emissione: e.target.value })}
                required
                className="h-11 border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data Pagamento</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                className="h-11 border-2 border-border"
              />
            </div>
          </div>

          {/* Riga 3: Importo Imponibile, Aliquota IVA, Importo Totale */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="importo_imponibile">
                Imponibile (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="importo_imponibile"
                type="number"
                step="0.01"
                min="0"
                value={formData.importo_imponibile}
                onChange={(e) => handleImponibileChange(e.target.value)}
                placeholder="0.00"
                className="h-11 border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliquota_iva">
                IVA % <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.aliquota_iva}
                onValueChange={(value) => {
                  setFormData({ ...formData, aliquota_iva: value });
                  // Ricalcola se c'è un imponibile
                  if (formData.importo_imponibile) {
                    handleImponibileChange(formData.importo_imponibile);
                  }
                }}
              >
                <SelectTrigger className="h-11 border-2 border-border">
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
              <Label htmlFor="importo_totale">
                Totale (€) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="importo_totale"
                type="number"
                step="0.01"
                min="0"
                value={formData.importo_totale}
                onChange={(e) => handleTotaleChange(e.target.value)}
                placeholder="0.00"
                className="h-11 border-2 border-border"
              />
            </div>
          </div>

          {/* IVA Calcolata */}
          <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">IVA Calcolata:</span>
              <span className="font-semibold">€{calcolaIva().toFixed(2)}</span>
            </div>
          </div>

          {/* Riga 4: Modalità Pagamento, Stato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="modalita_pagamento">Modalità di Pagamento</Label>
              <Input
                id="modalita_pagamento"
                value={formData.modalita_pagamento}
                onChange={(e) => setFormData({ ...formData, modalita_pagamento: e.target.value })}
                placeholder="Es. Bonifico bancario"
                className="h-11 border-2 border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stato_pagamento">
                Stato <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.stato_pagamento}
                onValueChange={(value: 'Pagato' | 'Non Pagato') =>
                  setFormData({ ...formData, stato_pagamento: value })
                }
              >
                <SelectTrigger className="h-11 border-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non Pagato">Non Pagato</SelectItem>
                  <SelectItem value="Pagato">Pagato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload File - Drag & Drop */}
          <div className="space-y-2">
            <Label>Allegato (PDF o Immagine)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-lg border-2 border-dashed transition-all ${
                isDragging
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : selectedFile
                  ? 'border-green-300 bg-green-50 dark:bg-green-950/10'
                  : 'border-border hover:border-green-300 hover:bg-green-50/50'
              }`}
            >
              <div className="p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <FileText className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="mt-2"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rimuovi
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <CloudUpload className={`h-10 w-10 ${isDragging ? 'text-green-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {isDragging ? 'Rilascia il file qui' : 'Trascina il file qui'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        oppure clicca per selezionare
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG, WEBP (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading || uploadingFile}
              className="border-2"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Campi
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading || uploadingFile}
                className="border-2"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={loading || uploadingFile}
                className="font-semibold bg-green-600 hover:bg-green-700"
              >
                {loading ? (uploadingFile ? 'Caricamento file...' : 'Salvataggio...') : 'Aggiungi Fattura'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
