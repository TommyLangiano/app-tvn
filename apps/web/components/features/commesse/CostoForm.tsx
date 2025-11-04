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

interface CostoFormProps {
  commessaId: string;
  commessaNome?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type Fornitore = {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore: string;
  aliquota_iva_predefinita?: number;
  modalita_pagamento_preferita?: string;
};

type TipoCosto = 'fattura' | 'scontrino';
const aliquoteIva = ['0', '4', '5', '10', '22'];

export function CostoForm({ commessaId, commessaNome, onSuccess, onCancel }: CostoFormProps) {
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [tipoCosto, setTipoCosto] = useState<TipoCosto>('fattura');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fornitore states
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [openFornitoreComboFattura, setOpenFornitoreComboFattura] = useState(false);
  const [openFornitoreComboScontrino, setOpenFornitoreComboScontrino] = useState(false);
  const [selectedFornitoreIdFattura, setSelectedFornitoreIdFattura] = useState<string>('');
  const [selectedFornitoreIdScontrino, setSelectedFornitoreIdScontrino] = useState<string>('');

  // Form data per Fattura
  const [fatturaData, setFatturaData] = useState({
    numero_fattura: '',
    fornitore: '',
    tipologia: '',
    data_emissione: new Date().toISOString().split('T')[0],
    data_pagamento: '',
    importo_imponibile: '',
    aliquota_iva: '22',
    importo_totale: '',
    modalita_pagamento: '',
    banca_emissione: '',
    numero_conto: '',
    stato_pagamento: 'Non Pagato' as 'Pagato' | 'Non Pagato',
  });

  // Form data per Scontrino
  const [scontrinoData, setScontrinoData] = useState({
    fornitore: '',
    tipologia: '',
    data_emissione: new Date().toISOString().split('T')[0],
    importo_totale: '',
    modalita_pagamento: '',
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
        // Load fornitori after getting tenant
        loadFornitori(userTenants.tenant_id);
      }
    } catch (error) {

    }
  };

  const loadFornitori = async (tenant_id: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fornitori')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore, aliquota_iva_predefinita, modalita_pagamento_preferita')
        .eq('tenant_id', tenant_id)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;

      setFornitori(data || []);
    } catch (error) {

    }
  };

  const getFornitoreDisplayName = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      return `${fornitore.cognome || ''} ${fornitore.nome || ''}`.trim();
    }
    return fornitore.ragione_sociale || '';
  };

  const handleSelectFornitoreFattura = (fornitoreId: string) => {
    const fornitore = fornitori.find(f => f.id === fornitoreId);

    if (fornitore) {
      setSelectedFornitoreIdFattura(fornitoreId);
      setFatturaData(prev => ({
        ...prev,
        fornitore: getFornitoreDisplayName(fornitore),
        tipologia: fornitore.tipologia_settore || prev.tipologia,
        aliquota_iva: fornitore.aliquota_iva_predefinita?.toString() || prev.aliquota_iva,
        modalita_pagamento: fornitore.modalita_pagamento_preferita || prev.modalita_pagamento,
      }));
      // Ricalcola totale con nuova aliquota IVA se c'è un imponibile
      if (fatturaData.importo_imponibile) {
        handleImponibileChange(fatturaData.importo_imponibile);
      }
      setOpenFornitoreComboFattura(false);
    }
  };

  const handleSelectFornitoreScontrino = (fornitoreId: string) => {
    const fornitore = fornitori.find(f => f.id === fornitoreId);

    if (fornitore) {
      setSelectedFornitoreIdScontrino(fornitoreId);
      setScontrinoData(prev => ({
        ...prev,
        fornitore: getFornitoreDisplayName(fornitore),
        tipologia: fornitore.tipologia_settore || prev.tipologia,
        modalita_pagamento: fornitore.modalita_pagamento_preferita || prev.modalita_pagamento,
      }));
      setOpenFornitoreComboScontrino(false);
    }
  };

  const handleImponibileChange = (imponibile: string) => {
    const imponibileNum = parseFloat(imponibile) || 0;
    const aliquota = parseFloat(fatturaData.aliquota_iva) || 0;
    const iva = (imponibileNum * aliquota) / 100;
    const totale = imponibileNum + iva;

    setFatturaData({
      ...fatturaData,
      importo_imponibile: imponibile,
      importo_totale: totale > 0 ? totale.toFixed(2) : '',
    });
  };

  const handleTotaleChange = (totale: string) => {
    const totaleNum = parseFloat(totale) || 0;
    const aliquota = parseFloat(fatturaData.aliquota_iva) || 0;
    const imponibile = totaleNum / (1 + aliquota / 100);

    setFatturaData({
      ...fatturaData,
      importo_totale: totale,
      importo_imponibile: imponibile > 0 ? imponibile.toFixed(2) : '',
    });
  };

  const calcolaIva = () => {
    if (tipoCosto !== 'fattura') return 0;
    const imponibile = parseFloat(fatturaData.importo_imponibile) || 0;
    const aliquota = parseFloat(fatturaData.aliquota_iva) || 0;
    return (imponibile * aliquota) / 100;
  };

  const calcolaTotale = () => {
    if (tipoCosto === 'scontrino') {
      return parseFloat(scontrinoData.importo_totale) || 0;
    }
    const imponibile = parseFloat(fatturaData.importo_imponibile) || 0;
    const iva = calcolaIva();
    return imponibile + iva;
  };

  const validateFile = (file: File): boolean => {
    if (file.size > 10485760) {
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

      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Different paths based on tipo di costo
      const folderType = tipoCosto === 'fattura' ? 'fatture/passive' : 'scontrini';
      const filePath = `${tenantId}/${folderType}/${commessaId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('fatture-documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;
      return data.path;
    } catch (error) {

      toast.error('Errore durante il caricamento del file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleReset = () => {
    setFatturaData({
      numero_fattura: '',
      fornitore: '',
      tipologia: '',
      data_emissione: new Date().toISOString().split('T')[0],
      data_pagamento: '',
      importo_imponibile: '',
      aliquota_iva: '22',
      importo_totale: '',
      modalita_pagamento: '',
      banca_emissione: '',
      numero_conto: '',
      stato_pagamento: 'Non Pagato' as 'Pagato' | 'Non Pagato',
    });
    setScontrinoData({
      fornitore: '',
      tipologia: '',
      data_emissione: new Date().toISOString().split('T')[0],
      importo_totale: '',
      modalita_pagamento: '',
    });
    setSelectedFile(null);
    setTipoCosto('fattura');
    setSelectedFornitoreIdFattura('');
    setSelectedFornitoreIdScontrino('');
    setOpenFornitoreComboFattura(false);
    setOpenFornitoreComboScontrino(false);
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
          return;
        }
      }

      if (tipoCosto === 'fattura') {
        // Insert Fattura Passiva
        const importo_imponibile = parseFloat(fatturaData.importo_imponibile);
        const aliquota_iva = parseFloat(fatturaData.aliquota_iva);
        const importo_iva = calcolaIva();

        const dataToInsert = {
          commessa_id: commessaId,
          tenant_id: tenantId,
          numero_fattura: fatturaData.numero_fattura,
          fornitore: fatturaData.fornitore,
          tipologia: fatturaData.tipologia,
          data_emissione: fatturaData.data_emissione,
          data_pagamento: fatturaData.data_pagamento || null,
          importo_imponibile,
          aliquota_iva,
          importo_iva,
          modalita_pagamento: fatturaData.modalita_pagamento || null,
          banca_emissione: fatturaData.banca_emissione || null,
          numero_conto: fatturaData.numero_conto || null,
          stato_pagamento: fatturaData.stato_pagamento,
          allegato_url,
          created_by: user.id,
        };

        const { error } = await supabase.from('fatture_passive').insert(dataToInsert);
        if (error) throw error;

        toast.success('Fattura passiva aggiunta con successo!');
      } else {
        // Insert Scontrino
        const importo_totale = parseFloat(scontrinoData.importo_totale);

        const dataToInsert = {
          commessa_id: commessaId,
          tenant_id: tenantId,
          fornitore: scontrinoData.fornitore,
          tipologia: scontrinoData.tipologia,
          data_emissione: scontrinoData.data_emissione,
          importo_totale,
          modalita_pagamento: scontrinoData.modalita_pagamento || null,
          stato_pagamento: 'Pagato',
          allegato_url,
          created_by: user.id,
        };

        const { error } = await supabase.from('scontrini').insert(dataToInsert);
        if (error) throw error;

        toast.success('Scontrino aggiunto con successo!');
      }

      onSuccess();
    } catch (error) {

      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        toast.error('Numero fattura già esistente');
      } else {
        toast.error('Errore nell\'aggiunta del costo');
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
              Nuovo Costo
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
            <Button variant="outline" size="icon" onClick={onCancel} className="h-8 w-8 border-2">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Selector Tipo Costo */}
          <div className="space-y-2">
            <Label>Tipo di Costo <span className="text-destructive">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoCosto('fattura')}
                className={`p-2.5 rounded-lg border-2 transition-all ${
                  tipoCosto === 'fattura'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-border hover:border-red-200'
                }`}
              >
                <p className="font-semibold text-sm">Fattura</p>
                <p className="text-[11px] text-muted-foreground">Con IVA e dettagli</p>
              </button>
              <button
                type="button"
                onClick={() => setTipoCosto('scontrino')}
                className={`p-2.5 rounded-lg border-2 transition-all ${
                  tipoCosto === 'scontrino'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-border hover:border-red-200'
                }`}
              >
                <p className="font-semibold text-sm">Scontrino</p>
                <p className="text-[11px] text-muted-foreground">Sempre pagato</p>
              </button>
            </div>
          </div>

          {/* Campi condizionali per FATTURA */}
          {tipoCosto === 'fattura' && (
            <>
              {/* Riga 1: N. Fattura, Fornitore, Tipologia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_fattura">
                    N. Fattura <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="numero_fattura"
                    value={fatturaData.numero_fattura}
                    onChange={(e) => setFatturaData({ ...fatturaData, numero_fattura: e.target.value })}
                    placeholder="Es. 2024/001"
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fornitore">
                    Fornitore <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={openFornitoreComboFattura} onOpenChange={setOpenFornitoreComboFattura}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openFornitoreComboFattura}
                        className="w-full justify-between h-11 border-2 border-border font-normal"
                      >
                        {fatturaData.fornitore || "Seleziona fornitore o scrivi..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput
                          placeholder="Cerca fornitore o scrivi..."
                          value={fatturaData.fornitore}
                          onValueChange={(value) => {
                            setFatturaData({ ...fatturaData, fornitore: value });
                            setSelectedFornitoreIdFattura('');
                          }}
                        />
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            Nessun fornitore trovato. Scrivi per inserire manualmente.
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {fornitori.map((fornitore) => (
                            <CommandItem
                              key={fornitore.id}
                              value={getFornitoreDisplayName(fornitore)}
                              onSelect={() => handleSelectFornitoreFattura(fornitore.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedFornitoreIdFattura === fornitore.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{getFornitoreDisplayName(fornitore)}</span>
                                <span className="text-xs text-muted-foreground">{fornitore.tipologia_settore}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipologia_fattura">
                    Tipologia <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tipologia_fattura"
                    value={fatturaData.tipologia}
                    onChange={(e) => setFatturaData({ ...fatturaData, tipologia: e.target.value })}
                    placeholder="Es. Materiali, Servizi"
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>
              </div>

              {/* Riga 2: Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_emissione_fattura">
                    Data Emissione <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="data_emissione_fattura"
                    type="date"
                    value={fatturaData.data_emissione}
                    onChange={(e) => setFatturaData({ ...fatturaData, data_emissione: e.target.value })}
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_pagamento_fattura">Data Pagamento</Label>
                  <Input
                    id="data_pagamento_fattura"
                    type="date"
                    value={fatturaData.data_pagamento}
                    onChange={(e) => setFatturaData({ ...fatturaData, data_pagamento: e.target.value })}
                    className="h-11 border-2 border-border"
                  />
                </div>
              </div>

              {/* Riga 3: Importo, IVA%, Totale */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="importo_imponibile_fattura">
                    Imponibile (€) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="importo_imponibile_fattura"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fatturaData.importo_imponibile}
                    onChange={(e) => handleImponibileChange(e.target.value)}
                    placeholder="0.00"
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aliquota_iva_fattura">
                    IVA % <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={fatturaData.aliquota_iva}
                    onValueChange={(value) => {
                      setFatturaData({ ...fatturaData, aliquota_iva: value });
                      if (fatturaData.importo_imponibile) {
                        handleImponibileChange(fatturaData.importo_imponibile);
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
                  <Label htmlFor="importo_totale_fattura">
                    Totale (€) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="importo_totale_fattura"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fatturaData.importo_totale}
                    onChange={(e) => handleTotaleChange(e.target.value)}
                    placeholder="0.00"
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>
              </div>

              {/* IVA calcolata */}
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">IVA Calcolata:</span>
                  <span className="font-semibold">€{calcolaIva().toFixed(2)}</span>
                </div>
              </div>

              {/* Riga 4: Modalità Pagamento, Stato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modalita_pagamento_fattura">Modalità di Pagamento</Label>
                  <Input
                    id="modalita_pagamento_fattura"
                    value={fatturaData.modalita_pagamento}
                    onChange={(e) => setFatturaData({ ...fatturaData, modalita_pagamento: e.target.value })}
                    placeholder="Es. Bonifico bancario"
                    className="h-11 border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stato_pagamento_fattura">
                    Stato <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={fatturaData.stato_pagamento}
                    onValueChange={(value: 'Pagato' | 'Non Pagato') =>
                      setFatturaData({ ...fatturaData, stato_pagamento: value })
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

              {/* Riga 5: Banca, Numero Conto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="banca_emissione">Banca di Emissione</Label>
                  <Input
                    id="banca_emissione"
                    value={fatturaData.banca_emissione}
                    onChange={(e) => setFatturaData({ ...fatturaData, banca_emissione: e.target.value })}
                    placeholder="Es. Intesa Sanpaolo"
                    className="h-11 border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_conto">Numero di Conto</Label>
                  <Input
                    id="numero_conto"
                    value={fatturaData.numero_conto}
                    onChange={(e) => setFatturaData({ ...fatturaData, numero_conto: e.target.value })}
                    placeholder="IT00X0000000000000000000000"
                    className="h-11 border-2 border-border"
                  />
                </div>
              </div>
            </>
          )}

          {/* Campi condizionali per SCONTRINO */}
          {tipoCosto === 'scontrino' && (
            <>
              {/* Riga 1: Fornitore, Tipologia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fornitore_scontrino">
                    Fornitore <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={openFornitoreComboScontrino} onOpenChange={setOpenFornitoreComboScontrino}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openFornitoreComboScontrino}
                        className="w-full justify-between h-11 border-2 border-border font-normal"
                      >
                        {scontrinoData.fornitore || "Seleziona fornitore o scrivi..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput
                          placeholder="Cerca fornitore o scrivi..."
                          value={scontrinoData.fornitore}
                          onValueChange={(value) => {
                            setScontrinoData({ ...scontrinoData, fornitore: value });
                            setSelectedFornitoreIdScontrino('');
                          }}
                        />
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            Nessun fornitore trovato. Scrivi per inserire manualmente.
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {fornitori.map((fornitore) => (
                            <CommandItem
                              key={fornitore.id}
                              value={getFornitoreDisplayName(fornitore)}
                              onSelect={() => handleSelectFornitoreScontrino(fornitore.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedFornitoreIdScontrino === fornitore.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{getFornitoreDisplayName(fornitore)}</span>
                                <span className="text-xs text-muted-foreground">{fornitore.tipologia_settore}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipologia_scontrino">
                    Tipologia <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="tipologia_scontrino"
                    value={scontrinoData.tipologia}
                    onChange={(e) => setScontrinoData({ ...scontrinoData, tipologia: e.target.value })}
                    placeholder="Es. Materiali vari"
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>
              </div>

              {/* Riga 2: Data, Importo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_emissione_scontrino">
                    Data Emissione <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="data_emissione_scontrino"
                    type="date"
                    value={scontrinoData.data_emissione}
                    onChange={(e) => setScontrinoData({ ...scontrinoData, data_emissione: e.target.value })}
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importo_totale_scontrino">
                    Importo (€) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="importo_totale_scontrino"
                    type="number"
                    step="0.01"
                    min="0"
                    value={scontrinoData.importo_totale}
                    onChange={(e) => setScontrinoData({ ...scontrinoData, importo_totale: e.target.value })}
                    placeholder="0.00"
                    required
                    className="h-11 border-2 border-border"
                  />
                </div>
              </div>

              {/* Totale scontrino */}
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-base">Importo Totale:</span>
                  <span className="font-bold text-red-600 text-base">€{calcolaTotale().toFixed(2)}</span>
                </div>
              </div>

              {/* Modalità Pagamento */}
              <div className="space-y-2">
                <Label htmlFor="modalita_pagamento_scontrino">Modalità di Pagamento</Label>
                <Input
                  id="modalita_pagamento_scontrino"
                  value={scontrinoData.modalita_pagamento}
                  onChange={(e) => setScontrinoData({ ...scontrinoData, modalita_pagamento: e.target.value })}
                  placeholder="Es. Contanti, Carta"
                  className="h-11 border-2 border-border"
                />
              </div>

              {/* Stato sempre Pagato */}
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-3">
                <p className="text-sm text-green-700">
                  <strong>Stato:</strong> Pagato (gli scontrini sono sempre considerati pagati)
                </p>
              </div>
            </>
          )}

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
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                  : selectedFile
                  ? 'border-red-300 bg-red-50 dark:bg-red-950/10'
                  : 'border-border hover:border-red-300 hover:bg-red-50/50'
              }`}
            >
              <div className="p-6 text-center">
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <FileText className="h-10 w-10 text-red-600" />
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
                      <CloudUpload className={`h-10 w-10 ${isDragging ? 'text-red-600' : 'text-muted-foreground'}`} />
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
                className="font-semibold bg-red-600 hover:bg-red-700"
              >
                {loading ? (uploadingFile ? 'Caricamento file...' : 'Salvataggio...') : `Aggiungi ${tipoCosto === 'fattura' ? 'Fattura' : 'Scontrino'}`}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
