'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, CloudUpload, RotateCcw, Check, ChevronsUpDown, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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

const aliquoteIva = ['0', '4', '5', '10', '22'];

export default function NuovaRicevutaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fornitore states
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [openFornitoreCombo, setOpenFornitoreCombo] = useState(false);
  const [selectedFornitoreId, setSelectedFornitoreId] = useState<string>('');

  // Commessa states
  const [commesse, setCommesse] = useState<any[]>([]);
  const [openCommessaCombo, setOpenCommessaCombo] = useState(false);
  const [selectedCommessaId, setSelectedCommessaId] = useState<string>('');
  const [collegaCommessa, setCollegaCommessa] = useState(false);

  const [formData, setFormData] = useState({
    numero_fattura: '',
    fornitore: '',
    fornitore_id: '',
    categoria: '',
    data_fattura: new Date().toISOString().split('T')[0],
    scadenza_pagamento: '',
    importo_imponibile: '',
    aliquota_iva: '22',
    importo_totale: '',
    modalita_pagamento: '',
    banca_emissione: '',
    numero_conto: '',
    stato_pagamento: 'Non Pagato' as 'Pagato' | 'Non Pagato',
    data_pagamento: '',
    note: '',
    commessa_id: '',
  });

  useEffect(() => {
    loadTenantId();
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
        loadFornitori(userTenants.tenant_id);
        loadCommesse(userTenants.tenant_id);
      }
    } catch {
      // Error handling
    }
  };

  const loadFornitori = async (tenant_id: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('fornitori')
        .select('*')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });

      if (data) {
        setFornitori(data);
      }
    } catch {
      // Error handling
    }
  };

  const loadCommesse = async (tenant_id: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('commesse')
        .select('id, codice_commessa, nome_commessa')
        .eq('tenant_id', tenant_id)
        .order('created_at', { ascending: false });

      if (data) {
        setCommesse(data);
      }
    } catch {
      // Error handling
    }
  };

  const handleFornitoreSelect = (fornitoreId: string) => {
    setSelectedFornitoreId(fornitoreId);
    const fornitore = fornitori.find(f => f.id === fornitoreId);

    if (fornitore) {
      const nomeCompleto = fornitore.forma_giuridica === 'persona_fisica'
        ? `${fornitore.cognome} ${fornitore.nome}`
        : fornitore.ragione_sociale || '';

      setFormData(prev => ({
        ...prev,
        fornitore: nomeCompleto,
        fornitore_id: fornitoreId,
        categoria: fornitore.tipologia_settore || '',
        aliquota_iva: fornitore.aliquota_iva_predefinita?.toString() || '22',
        modalita_pagamento: fornitore.modalita_pagamento_preferita || '',
      }));
    }
    setOpenFornitoreCombo(false);
  };

  const handleCommessaSelect = (commessaId: string) => {
    setSelectedCommessaId(commessaId);
    setFormData({ ...formData, commessa_id: commessaId });
    setOpenCommessaCombo(false);
  };

  const calcolaIva = () => {
    const imponibile = parseFloat(formData.importo_imponibile);
    const aliquota = parseFloat(formData.aliquota_iva);
    if (!isNaN(imponibile) && !isNaN(aliquota)) {
      return (imponibile * aliquota / 100).toFixed(2);
    }
    return '0.00';
  };

  const calcolaTotale = () => {
    const imponibile = parseFloat(formData.importo_imponibile);
    const iva = parseFloat(calcolaIva());
    if (!isNaN(imponibile) && !isNaN(iva)) {
      return (imponibile + iva).toFixed(2);
    }
    return '0.00';
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      importo_totale: calcolaTotale()
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.importo_imponibile, formData.aliquota_iva]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const uploadFile = async (fatturaId: string): Promise<string | null> => {
    if (!selectedFile) return null;

    try {
      setUploadingFile(true);
      const supabase = createClient();

      // Mantieni il nome originale del file
      const originalFileName = selectedFile.name;
      const filePath = `${tenantId}/fatture/passive/${fatturaId}/${originalFileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('app-storage')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true, // Sovrascrivi se esiste già
        });

      if (uploadError) throw uploadError;

      // Ritorna solo il path, non l'URL pubblico
      return data.path;
    } catch (error) {
      toast.error('Errore nel caricamento del file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numero_fattura || !formData.fornitore || !formData.importo_imponibile) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const importo_imponibile = parseFloat(formData.importo_imponibile);
      const aliquota_iva = parseFloat(formData.aliquota_iva);
      const importo_iva = parseFloat(calcolaIva());

      // Prima crea la fattura senza allegato
      const dataToInsert = {
        commessa_id: formData.commessa_id || null,
        tenant_id: tenantId,
        numero_fattura: formData.numero_fattura,
        fornitore: formData.fornitore,
        categoria: formData.categoria,
        data_fattura: formData.data_fattura,
        scadenza_pagamento: formData.scadenza_pagamento || null,
        importo_imponibile,
        aliquota_iva,
        importo_iva,
        modalita_pagamento: formData.modalita_pagamento || null,
        banca_emissione: formData.banca_emissione || null,
        numero_conto: formData.numero_conto || null,
        stato_pagamento: formData.stato_pagamento,
        data_pagamento: formData.data_pagamento || null,
        note: formData.note || null,
        created_by: user.id,
      };

      const { data: newFattura, error: insertError } = await supabase
        .from('fatture_passive')
        .insert([dataToInsert])
        .select()
        .single();

      if (insertError) throw insertError;

      // Poi carica il file con l'ID della fattura
      let allegato_url = null;
      if (selectedFile && newFattura) {
        allegato_url = await uploadFile(newFattura.id);

        // Aggiorna la fattura con l'URL dell'allegato
        if (allegato_url) {
          const { error: updateError } = await supabase
            .from('fatture_passive')
            .update({ allegato_url })
            .eq('id', newFattura.id);

          if (updateError) {
            console.error('Error updating allegato_url:', updateError);
          }
        }
      }

      toast.success('Fattura ricevuta creata con successo');
      router.push('/fatture');
    } catch (error) {
      toast.error('Errore nella creazione della fattura');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 border-2 border-border"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nuova Fattura Ricevuta</h1>
          </div>
        </div>
      </div>

      {/* Descrizione */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Le fatture registrate hanno solo finalità gestionali e non sostituiscono la fatturazione elettronica.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 [&_label]:text-foreground [&_label]:font-medium [&_label]:text-sm [&_input]:h-11 [&_input]:bg-background [&_input]:border-2 [&_input]:border-border [&_input]:rounded-lg [&_input]:px-4 [&_input]:text-base [&_input:focus]:border-primary [&_textarea]:bg-background [&_textarea]:border-2 [&_textarea]:border-border [&_textarea]:rounded-lg [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-base [&_textarea:focus]:border-primary [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:bg-background [&_button[role=combobox]]:border-2 [&_button[role=combobox]]:border-border [&_button[role=combobox]]:rounded-lg [&_button[role=combobox]]:px-4 [&_button[role=combobox]]:text-base [&_button[role=combobox]:focus]:border-primary">
        {/* Dati Fattura */}
        <div className="space-y-6 p-6 rounded-xl bg-card">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
            <h3 className="text-lg font-semibold">Dati Fattura</h3>
            <p className="text-sm text-muted-foreground">
              Informazioni principali della fattura ricevuta
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="numero_fattura">Numero Fattura *</Label>
              <Input
                id="numero_fattura"
                value={formData.numero_fattura}
                onChange={(e) => setFormData({ ...formData, numero_fattura: e.target.value })}
                placeholder="es. 2024/001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_fattura">Data Fattura *</Label>
              <Input
                id="data_fattura"
                type="date"
                value={formData.data_fattura}
                onChange={(e) => setFormData({ ...formData, data_fattura: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Fornitore *</Label>
              <Popover open={openFornitoreCombo} onOpenChange={setOpenFornitoreCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openFornitoreCombo}
                    className="w-full justify-between"
                  >
                    {selectedFornitoreId
                      ? fornitori.find((f) => f.id === selectedFornitoreId)?.forma_giuridica === 'persona_fisica'
                        ? `${fornitori.find((f) => f.id === selectedFornitoreId)?.cognome} ${fornitori.find((f) => f.id === selectedFornitoreId)?.nome}`
                        : fornitori.find((f) => f.id === selectedFornitoreId)?.ragione_sociale
                      : "Seleziona fornitore..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca fornitore..." />
                    <CommandEmpty>Nessun fornitore trovato.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {fornitori.map((fornitore) => {
                        const displayName = fornitore.forma_giuridica === 'persona_fisica'
                          ? `${fornitore.cognome} ${fornitore.nome}`
                          : fornitore.ragione_sociale;
                        return (
                          <CommandItem
                            key={fornitore.id}
                            value={displayName}
                            onSelect={() => handleFornitoreSelect(fornitore.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedFornitoreId === fornitore.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {displayName}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="es. Prestazione di servizi"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="importo_imponibile">Importo Imponibile (€) *</Label>
              <Input
                id="importo_imponibile"
                type="number"
                step="0.01"
                min="0"
                value={formData.importo_imponibile}
                onChange={(e) => setFormData({ ...formData, importo_imponibile: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliquota_iva">Aliquota IVA (%) *</Label>
              <Select
                value={formData.aliquota_iva}
                onValueChange={(value) => setFormData({ ...formData, aliquota_iva: value })}
              >
                <SelectTrigger id="aliquota_iva">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aliquoteIva.map(aliquota => (
                    <SelectItem key={aliquota} value={aliquota}>
                      {aliquota}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>IVA (€)</Label>
              <Input
                value={calcolaIva()}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Totale (€)</Label>
              <Input
                value={calcolaTotale()}
                disabled
                className="bg-gray-50 font-semibold"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="scadenza_pagamento">Scadenza Pagamento</Label>
              <div className="relative">
                <Input
                  id="scadenza_pagamento"
                  type="date"
                  value={formData.scadenza_pagamento}
                  onChange={(e) => setFormData({ ...formData, scadenza_pagamento: e.target.value })}
                  className="pr-10"
                />
                {formData.scadenza_pagamento && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scadenza_pagamento: '' })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collegamento Aziendale */}
        <div className="space-y-6 p-6 rounded-xl bg-card">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Collegamento Aziendale</h3>
              <p className="text-sm text-muted-foreground">
                Associa la fattura ad una commessa
              </p>
            </div>
            <Switch
              id="collega-commessa"
              checked={collegaCommessa}
              onCheckedChange={(checked) => {
                setCollegaCommessa(checked);
                if (!checked) {
                  setSelectedCommessaId('');
                  setFormData({ ...formData, commessa_id: '' });
                }
              }}
              size="lg"
              animation="smooth"
            />
          </div>
          {collegaCommessa && (
            <div className="space-y-2">
              <Label>Commessa</Label>
              <Popover open={openCommessaCombo} onOpenChange={setOpenCommessaCombo}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCommessaCombo}
                    className="w-full justify-between"
                  >
                    {selectedCommessaId
                      ? (() => {
                          const commessa = commesse.find((c) => c.id === selectedCommessaId);
                          return commessa ? `${commessa.codice_commessa} - ${commessa.nome_commessa}` : "Seleziona commessa...";
                        })()
                      : "Seleziona commessa..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca commessa..." />
                    <CommandEmpty>Nessuna commessa trovata.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {commesse.map((commessa) => (
                        <CommandItem
                          key={commessa.id}
                          value={commessa.id}
                          onSelect={() => handleCommessaSelect(commessa.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedCommessaId === commessa.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {commessa.codice_commessa} - {commessa.nome_commessa}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Stato Pagamento */}
        <div className="space-y-6 p-6 rounded-xl bg-card">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
            <h3 className="text-lg font-semibold">Stato Pagamento</h3>
            <p className="text-sm text-muted-foreground">
              Informazioni su modalità e stato del pagamento
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="modalita_pagamento">Modalità di Pagamento</Label>
              <Input
                id="modalita_pagamento"
                value={formData.modalita_pagamento}
                onChange={(e) => setFormData({ ...formData, modalita_pagamento: e.target.value })}
                placeholder="es. Bonifico bancario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stato_pagamento">Stato Pagamento *</Label>
              <Select
                value={formData.stato_pagamento}
                onValueChange={(value: 'Pagato' | 'Non Pagato') =>
                  setFormData({
                    ...formData,
                    stato_pagamento: value,
                    // Elimina data pagamento se si cambia a Non Pagato
                    data_pagamento: value === 'Non Pagato' ? '' : formData.data_pagamento
                  })
                }
              >
                <SelectTrigger id="stato_pagamento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non Pagato">Non Pagato</SelectItem>
                  <SelectItem value="Pagato">Pagato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.stato_pagamento === 'Pagato' && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="data_pagamento">Data Pagamento</Label>
                <div className="relative">
                  <Input
                    id="data_pagamento"
                    type="date"
                    value={formData.data_pagamento}
                    onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                    className="pr-10"
                  />
                  {formData.data_pagamento && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, data_pagamento: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dati Bancari */}
        <div className="space-y-6 p-6 rounded-xl bg-card">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
            <h3 className="text-lg font-semibold">Dati Bancari</h3>
            <p className="text-sm text-muted-foreground">
              Informazioni bancarie del fornitore
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="banca_emissione">Banca Emissione</Label>
              <Input
                id="banca_emissione"
                value={formData.banca_emissione}
                onChange={(e) => setFormData({ ...formData, banca_emissione: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_conto">Numero Conto</Label>
              <Input
                id="numero_conto"
                value={formData.numero_conto}
                onChange={(e) => setFormData({ ...formData, numero_conto: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Note Interne */}
        <div className="space-y-6 p-6 rounded-xl bg-card">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
            <h3 className="text-lg font-semibold">Note Interne</h3>
            <p className="text-sm text-muted-foreground">
              Annotazioni e dettagli aggiuntivi
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Inserisci eventuali note..."
              rows={4}
            />
          </div>
        </div>

        {/* Upload Documento */}
        <div className="space-y-6 p-6 rounded-xl bg-card">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
            <h3 className="text-lg font-semibold">Documento</h3>
            <p className="text-sm text-muted-foreground">
              Carica il documento della fattura
            </p>
          </div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-sm p-8 text-center transition-colors",
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
            )}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <FileText className="h-12 w-12 mx-auto text-blue-500" />
                <p className="font-medium">{selectedFile.name}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Cambia file
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <CloudUpload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Trascina qui il documento o
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Seleziona file
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/fatture')}
            disabled={loading || uploadingFile}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={loading || uploadingFile}
          >
            {loading ? 'Salvataggio...' : 'Crea Fattura Ricevuta'}
          </Button>
        </div>
      </form>
    </div>
  );
}
