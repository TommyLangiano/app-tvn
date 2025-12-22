'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, FileText, X, Edit, Trash2, Save, XCircle, ChevronsUpDown, Check, CloudUpload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FatturaAttiva {
  id: string;
  numero_fattura: string;
  cliente: string;
  cliente_id?: string;
  categoria: string;
  data_fattura: string;
  scadenza_pagamento: string | null;
  data_pagamento: string | null;
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;
  modalita_pagamento: string | null;
  stato_pagamento: string;
  note: string | null;
  allegato_url: string | null;
  commessa_id?: string | null;
  commesse?: {
    nome_commessa: string;
  };
}

interface FatturaPassiva {
  id: string;
  numero_fattura: string;
  fornitore: string;
  fornitore_id?: string;
  categoria: string;
  data_fattura: string;
  scadenza_pagamento: string | null;
  data_pagamento: string | null;
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;
  modalita_pagamento: string | null;
  banca_emissione: string | null;
  numero_conto: string | null;
  stato_pagamento: string;
  note: string | null;
  allegato_url: string | null;
  commessa_id?: string | null;
  commesse?: {
    nome_commessa: string;
  };
}

interface Cliente {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore?: string;
  aliquota_iva_predefinita?: number;
  modalita_pagamento_preferita?: string;
}

interface Fornitore {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore?: string;
}

interface Commessa {
  id: string;
  nome_commessa: string;
  codice_commessa?: string;
}

interface FatturaDetailSheetProps {
  fattura: FatturaAttiva | FatturaPassiva;
  onClose: () => void;
  onOpenFile?: (path: string) => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

export function FatturaDetailSheet({ fattura, onClose, onOpenFile, onDelete, onUpdate }: FatturaDetailSheetProps) {
  const isEmessa = 'cliente' in fattura;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<FatturaAttiva | FatturaPassiva>>(fattura);

  // Dati per dropdown
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [openClienteCombo, setOpenClienteCombo] = useState(false);
  const [openFornitoreCombo, setOpenFornitoreCombo] = useState(false);
  const [openCommessaCombo, setOpenCommessaCombo] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [selectedFornitoreId, setSelectedFornitoreId] = useState<string>('');
  const [selectedCommessaId, setSelectedCommessaId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');

  // Gestione file
  const [newFile, setNewFile] = useState<File | null>(null);
  const [deleteCurrentFile, setDeleteCurrentFile] = useState(false);

  // Carica tenant ID
  useEffect(() => {
    const loadTenantId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();
        if (userTenant) {
          setTenantId(userTenant.tenant_id);
        }
      }
    };
    loadTenantId();
  }, []);

  // Inizializza selezioni
  useEffect(() => {
    setEditedData(fattura);
    setSelectedClienteId('cliente_id' in fattura ? fattura.cliente_id || '' : '');
    setSelectedFornitoreId('fornitore_id' in fattura ? fattura.fornitore_id || '' : '');
    setSelectedCommessaId(fattura.commessa_id || '');
  }, [fattura]);

  const loadClienti = async (tid?: string) => {
    const tenant = tid || tenantId;
    if (!tenant) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clienti')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore, aliquota_iva_predefinita, modalita_pagamento_preferita')
        .eq('tenant_id', tenant)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;
      setClienti(data || []);
    } catch (error) {
      console.error('Error loading clienti:', error);
    }
  };

  const loadFornitori = async (tid?: string) => {
    const tenant = tid || tenantId;
    if (!tenant) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fornitori')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore')
        .eq('tenant_id', tenant)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;
      setFornitori(data || []);
    } catch (error) {
      console.error('Error loading fornitori:', error);
    }
  };

  const loadCommesse = async (tid?: string) => {
    const tenant = tid || tenantId;
    if (!tenant) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('commesse')
        .select('id, nome_commessa, codice_commessa')
        .eq('tenant_id', tenant)
        .order('nome_commessa');

      if (error) throw error;
      setCommesse(data || []);
    } catch (error) {
      console.error('Error loading commesse:', error);
    }
  };

  const getClienteDisplayName = (cliente: Cliente) => {
    if (cliente.forma_giuridica === 'persona_fisica') {
      return `${cliente.cognome || ''} ${cliente.nome || ''}`.trim();
    }
    return cliente.ragione_sociale || '';
  };

  const getFornitoreDisplayName = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      return `${fornitore.cognome || ''} ${fornitore.nome || ''}`.trim();
    }
    return fornitore.ragione_sociale || '';
  };

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clienti.find(c => c.id === clienteId);
    if (cliente) {
      setSelectedClienteId(clienteId);
      setEditedData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente: getClienteDisplayName(cliente),
        aliquota_iva: cliente.aliquota_iva_predefinita || prev.aliquota_iva,
        modalita_pagamento: cliente.modalita_pagamento_preferita || prev.modalita_pagamento,
        categoria: cliente.tipologia_settore || prev.categoria,
      }));
      setOpenClienteCombo(false);
    }
  };

  const handleSelectFornitore = (fornitoreId: string) => {
    const fornitore = fornitori.find(f => f.id === fornitoreId);
    if (fornitore) {
      setSelectedFornitoreId(fornitoreId);
      setEditedData(prev => ({
        ...prev,
        fornitore_id: fornitoreId,
        fornitore: getFornitoreDisplayName(fornitore),
        categoria: fornitore.tipologia_settore || prev.categoria,
      }));
      setOpenFornitoreCombo(false);
    }
  };

  const handleSelectCommessa = (commessaId: string) => {
    const commessa = commesse.find(c => c.id === commessaId);
    if (commessa) {
      setSelectedCommessaId(commessaId);
      setEditedData(prev => ({
        ...prev,
        commessa_id: commessaId,
      }));
      setOpenCommessaCombo(false);
    }
  };

  const handleEdit = async () => {
    setIsEditing(true);

    // Se tenantId non è ancora caricato, caricalo ora
    let currentTenantId = tenantId;
    if (!currentTenantId) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userTenant } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();
        if (userTenant) {
          currentTenantId = userTenant.tenant_id;
          setTenantId(currentTenantId);
        }
      }
    }

    // Carica i dati per i dropdown, passando il tenantId
    if (currentTenantId) {
      await Promise.all([
        loadClienti(currentTenantId),
        loadFornitori(currentTenantId),
        loadCommesse(currentTenantId),
      ]);
    }
  };

  const handleCancelEdit = () => {
    setEditedData(fattura);
    setIsEditing(false);
    setNewFile(null);
    setDeleteCurrentFile(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10485760) {
        toast.error('Il file è troppo grande. Massimo 10MB');
        return;
      }
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo di file non supportato');
        return;
      }
      setNewFile(file);
      setDeleteCurrentFile(false);
    }
  };

  const uploadFile = async (fatturaId: string): Promise<string | null> => {
    if (!newFile) return null;

    const supabase = createClient();
    const fileExt = newFile.name.split('.').pop();
    const fileName = `${fatturaId}_${Date.now()}.${fileExt}`;
    const filePath = `fatture/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('app-storage')
      .upload(filePath, newFile);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      toast.error('Errore nel caricamento del file');
      return null;
    }

    return filePath;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const tableName = isEmessa ? 'fatture_attive' : 'fatture_passive';

      // Gestione allegato
      let allegato_url = fattura.allegato_url;

      // Se c'è un nuovo file, caricalo
      if (newFile) {
        const uploadedPath = await uploadFile(fattura.id);
        if (uploadedPath) {
          // Elimina il vecchio file se esiste
          if (fattura.allegato_url) {
            try {
              await supabase.storage
                .from('app-storage')
                .remove([fattura.allegato_url]);
            } catch (error) {
              console.error('Error deleting old file:', error);
            }
          }
          allegato_url = uploadedPath;
        }
      } else if (deleteCurrentFile && fattura.allegato_url) {
        // Elimina il file esistente
        try {
          await supabase.storage
            .from('app-storage')
            .remove([fattura.allegato_url]);
          allegato_url = null;
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }

      // Calcola IVA e totale
      const importo_imponibile = parseFloat(editedData.importo_imponibile?.toString() || '0');
      const aliquota_iva = parseFloat(editedData.aliquota_iva?.toString() || '0');
      const importo_iva = importo_imponibile * (aliquota_iva / 100);
      const importo_totale = importo_imponibile + importo_iva;

      // Prepara i dati da aggiornare
      // NON includere importo_totale perché è una colonna generata
      const updateData: any = {
        numero_fattura: editedData.numero_fattura,
        categoria: editedData.categoria,
        data_fattura: editedData.data_fattura,
        scadenza_pagamento: editedData.scadenza_pagamento,
        importo_imponibile,
        aliquota_iva,
        importo_iva,
        modalita_pagamento: editedData.modalita_pagamento,
        stato_pagamento: editedData.stato_pagamento,
        // Se lo stato non è "Pagato", imposta data_pagamento a null
        data_pagamento: editedData.stato_pagamento === 'Pagato' ? editedData.data_pagamento : null,
        note: editedData.note,
        allegato_url,
        commessa_id: selectedCommessaId || null,
      };

      if (isEmessa) {
        // Se selectedClienteId è una stringa vuota, usa null invece
        updateData.cliente_id = selectedClienteId || null;
        const cliente = clienti.find(c => c.id === selectedClienteId);
        updateData.cliente = cliente ? getClienteDisplayName(cliente) : ((editedData as Partial<FatturaAttiva>).cliente || '');
      } else {
        // Se selectedFornitoreId è una stringa vuota, usa null invece
        updateData.fornitore_id = selectedFornitoreId || null;
        const fornitore = fornitori.find(f => f.id === selectedFornitoreId);
        updateData.fornitore = fornitore ? getFornitoreDisplayName(fornitore) : ((editedData as Partial<FatturaPassiva>).fornitore || '');
        updateData.banca_emissione = (editedData as Partial<FatturaPassiva>).banca_emissione;
        updateData.numero_conto = (editedData as Partial<FatturaPassiva>).numero_conto;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', fattura.id);

      if (error) {
        console.error('Error updating fattura:', error);
        toast.error('Errore nell\'aggiornamento della fattura');
        return;
      }

      toast.success('Fattura aggiornata con successo');
      setIsEditing(false);
      setNewFile(null);
      setDeleteCurrentFile(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating fattura:', error);
      toast.error('Errore nell\'aggiornamento della fattura');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Header fisso */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isEmessa ? (
              <>
                <ArrowUpCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <SheetTitle className="text-2xl font-bold truncate">
                  Dettagli Fattura Emessa
                </SheetTitle>
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                <SheetTitle className="text-2xl font-bold truncate">
                  Dettagli Fattura Ricevuta
                </SheetTitle>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing ? (
              <>
                {onDelete && (
                  <Button
                    onClick={() => {
                      onClose();
                      setTimeout(() => onDelete(), 200);
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina
                  </Button>
                )}
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Modifica
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isSaving}
                >
                  <XCircle className="h-4 w-4" />
                  Annulla
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="gap-2"
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Salvataggio...' : 'Salva'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
        <div className="space-y-6">
          {/* Dati Fattura */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Dati Fattura</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Numero Fattura</p>
                {isEditing ? (
                  <Input
                    value={editedData.numero_fattura || ''}
                    onChange={(e) => setEditedData({...editedData, numero_fattura: e.target.value})}
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="font-bold">{fattura.numero_fattura}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {isEmessa ? 'Cliente' : 'Fornitore'}
                </p>
                {isEditing ? (
                  isEmessa ? (
                    <Popover open={openClienteCombo} onOpenChange={setOpenClienteCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openClienteCombo}
                          className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                        >
                          {'cliente' in editedData ? editedData.cliente || "Seleziona cliente..." : "Seleziona cliente..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                        <Command>
                          <CommandInput
                            placeholder="Cerca cliente..."
                            value={'cliente' in editedData ? editedData.cliente || '' : ''}
                            onValueChange={(value) => {
                              if ('cliente' in editedData) {
                                setEditedData({ ...editedData, cliente: value });
                              }
                              setSelectedClienteId('');
                            }}
                          />
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">
                              Nessun cliente trovato
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
                                  {cliente.tipologia_settore && (
                                    <span className="text-xs text-muted-foreground">{cliente.tipologia_settore}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Popover open={openFornitoreCombo} onOpenChange={setOpenFornitoreCombo}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openFornitoreCombo}
                          className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                        >
                          {(editedData as FatturaPassiva).fornitore || "Seleziona fornitore..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                        <Command>
                          <CommandInput
                            placeholder="Cerca fornitore..."
                            value={(editedData as FatturaPassiva).fornitore || ''}
                            onValueChange={(value) => {
                              setEditedData({ ...editedData, fornitore: value });
                              setSelectedFornitoreId('');
                            }}
                          />
                          <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground">
                              Nessun fornitore trovato
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {fornitori.map((fornitore) => (
                              <CommandItem
                                key={fornitore.id}
                                value={getFornitoreDisplayName(fornitore)}
                                onSelect={() => handleSelectFornitore(fornitore.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedFornitoreId === fornitore.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{getFornitoreDisplayName(fornitore)}</span>
                                  {fornitore.tipologia_settore && (
                                    <span className="text-xs text-muted-foreground">{fornitore.tipologia_settore}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )
                ) : (
                  <p className="font-medium">
                    {isEmessa ? fattura.cliente : (fattura as FatturaPassiva).fornitore}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Categoria</p>
                {isEditing ? (
                  <Input
                    value={editedData.categoria || ''}
                    onChange={(e) => setEditedData({...editedData, categoria: e.target.value})}
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="font-medium">{fattura.categoria || '-'}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Fattura</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedData.data_fattura || ''}
                    onChange={(e) => setEditedData({...editedData, data_fattura: e.target.value})}
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="font-medium">
                    {formatDate(fattura.data_fattura)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Scadenza Pagamento</p>
                {isEditing ? (
                  <div className="relative">
                    <Input
                      type="date"
                      value={editedData.scadenza_pagamento || ''}
                      onChange={(e) => setEditedData({...editedData, scadenza_pagamento: e.target.value})}
                      className="h-11 border-2 border-border bg-white pr-10"
                    />
                    {editedData.scadenza_pagamento && (
                      <button
                        type="button"
                        onClick={() => setEditedData({...editedData, scadenza_pagamento: null})}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className={`font-medium ${
                    fattura.scadenza_pagamento &&
                    new Date(fattura.scadenza_pagamento) < new Date() &&
                    fattura.stato_pagamento !== 'Pagato'
                      ? 'text-red-600'
                      : ''
                  }`}>
                    {fattura.scadenza_pagamento
                      ? formatDate(fattura.scadenza_pagamento)
                      : '-'}
                  </p>
                )}
              </div>
            </div>

            {/* Importi integrati */}
            <div className="bg-primary/5 p-6 rounded-lg mt-4">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Importo Imponibile</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={editedData.importo_imponibile || ''}
                      onChange={(e) => setEditedData({...editedData, importo_imponibile: parseFloat(e.target.value)})}
                      className="h-11 border-2 border-border bg-white"
                    />
                  ) : (
                    <p className="text-xl font-bold text-foreground">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(fattura.importo_imponibile)}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    IVA {isEditing ? '' : `(${fattura.aliquota_iva}%)`}
                  </p>
                  {isEditing ? (
                    <Select
                      value={editedData.aliquota_iva?.toString() || '22'}
                      onValueChange={(value) => setEditedData({...editedData, aliquota_iva: parseFloat(value)})}
                    >
                      <SelectTrigger className="h-11 border-2 border-border bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="4">4%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="22">22%</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xl font-bold text-foreground">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(fattura.importo_iva)}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Totale</p>
                  <p className="text-xl font-bold text-foreground">
                    {new Intl.NumberFormat('it-IT', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(
                      isEditing
                        ? (parseFloat(editedData.importo_imponibile?.toString() || '0') * (1 + parseFloat(editedData.aliquota_iva?.toString() || '0') / 100))
                        : fattura.importo_totale
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stato Pagamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Stato Pagamento</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Modalità di Pagamento</p>
                {isEditing ? (
                  <Input
                    value={editedData.modalita_pagamento || ''}
                    onChange={(e) => setEditedData({...editedData, modalita_pagamento: e.target.value})}
                    placeholder="es. Bonifico bancario"
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="font-medium">{fattura.modalita_pagamento || '-'}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Stato Pagamento</p>
                {isEditing ? (
                  <Select
                    value={editedData.stato_pagamento || fattura.stato_pagamento}
                    onValueChange={(value) => {
                      setEditedData({
                        ...editedData,
                        stato_pagamento: value,
                        // Cancella data_pagamento se lo stato non è "Pagato"
                        data_pagamento: value === 'Pagato' ? editedData.data_pagamento : null
                      });
                    }}
                  >
                    <SelectTrigger className="h-11 border-2 border-border bg-white">
                      <SelectValue>
                        {(editedData.stato_pagamento || fattura.stato_pagamento) === 'Pagato'
                          ? 'Pagato'
                          : (isEmessa ? 'Da Incassare' : 'Non Pagato')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {isEmessa ? (
                        <>
                          <SelectItem value="Da Incassare">Da Incassare</SelectItem>
                          <SelectItem value="Pagato">Pagato</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Non Pagato">Non Pagato</SelectItem>
                          <SelectItem value="Pagato">Pagato</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    fattura.stato_pagamento === 'Pagato'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {fattura.stato_pagamento === 'Pagato'
                      ? 'Pagato'
                      : (isEmessa ? 'Da Incassare' : 'Non Pagato')}
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Pagamento</p>
                {isEditing ? (
                  <div className="relative">
                    <Input
                      type="date"
                      value={editedData.data_pagamento || ''}
                      onChange={(e) => setEditedData({...editedData, data_pagamento: e.target.value})}
                      disabled={editedData.stato_pagamento !== 'Pagato'}
                      className={`h-11 border-2 border-border pr-10 ${
                        editedData.stato_pagamento !== 'Pagato'
                          ? 'bg-gray-100 cursor-not-allowed'
                          : 'bg-white'
                      }`}
                    />
                    {editedData.data_pagamento && editedData.stato_pagamento === 'Pagato' && (
                      <button
                        type="button"
                        onClick={() => setEditedData({...editedData, data_pagamento: null})}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="font-medium">
                    {fattura.data_pagamento
                      ? formatDate(fattura.data_pagamento)
                      : '-'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dati Bancari (solo per fatture passive) */}
          {'banca_emissione' in fattura && (fattura.banca_emissione || fattura.numero_conto || isEditing) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Dati Bancari</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Banca Emissione</p>
                  {isEditing ? (
                    <Input
                      value={(editedData as FatturaPassiva).banca_emissione || ''}
                      onChange={(e) => setEditedData({...editedData, banca_emissione: e.target.value})}
                      placeholder="es. Intesa Sanpaolo"
                      className="h-11 border-2 border-border bg-white"
                    />
                  ) : (
                    <p className="font-medium">{fattura.banca_emissione || '-'}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Numero Conto</p>
                  {isEditing ? (
                    <Input
                      value={(editedData as FatturaPassiva).numero_conto || ''}
                      onChange={(e) => setEditedData({...editedData, numero_conto: e.target.value})}
                      placeholder="es. IT60X0542811101000000123456"
                      className="h-11 border-2 border-border bg-white"
                    />
                  ) : (
                    <p className="font-medium">{fattura.numero_conto || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Commessa Collegata */}
          {(fattura.commesse?.nome_commessa || isEditing) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Collegamento Aziendale</h3>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Commessa</p>
                {isEditing ? (
                  <Popover open={openCommessaCombo} onOpenChange={setOpenCommessaCombo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCommessaCombo}
                        className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                      >
                        {commesse.find(c => c.id === selectedCommessaId)?.nome_commessa || fattura.commesse?.nome_commessa || "Seleziona commessa..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Cerca commessa..." />
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            Nessuna commessa trovata
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          <CommandItem
                            value="nessuna-commessa"
                            onSelect={() => {
                              setSelectedCommessaId('');
                              setEditedData(prev => ({ ...prev, commessa_id: null }));
                              setOpenCommessaCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !selectedCommessaId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="text-muted-foreground italic">Nessuna commessa</span>
                          </CommandItem>
                          {commesse.map((commessa) => (
                            <CommandItem
                              key={commessa.id}
                              value={commessa.nome_commessa}
                              onSelect={() => handleSelectCommessa(commessa.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCommessaId === commessa.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{commessa.nome_commessa}</span>
                                {commessa.codice_commessa && (
                                  <span className="text-xs text-muted-foreground">{commessa.codice_commessa}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="font-bold">{fattura.commesse?.nome_commessa || '-'}</p>
                )}
              </div>
            </div>
          )}

          {/* Note Interne */}
          {(fattura.note || isEditing) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Note Interne</h3>
              {isEditing ? (
                <Textarea
                  value={editedData.note || ''}
                  onChange={(e) => setEditedData({...editedData, note: e.target.value})}
                  placeholder="Inserisci eventuali note..."
                  rows={4}
                  className="resize-none border-2 border-border bg-white"
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{fattura.note}</p>
                </div>
              )}
            </div>
          )}

          {/* Allegato */}
          {(fattura.allegato_url || isEditing) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Documento</h3>

              {isEditing ? (
                <div className="space-y-3">
                  {/* File corrente */}
                  {fattura.allegato_url && !deleteCurrentFile && !newFile && (
                    <div className="flex items-center gap-3 p-3 border-2 border-border rounded-lg bg-gray-50">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">File corrente</p>
                        {onOpenFile && (
                          <button
                            onClick={() => onOpenFile(fattura.allegato_url!)}
                            className="text-xs text-primary hover:underline"
                          >
                            Visualizza
                          </button>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteCurrentFile(true)}
                        className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Elimina
                      </Button>
                    </div>
                  )}

                  {/* Stato eliminazione */}
                  {deleteCurrentFile && !newFile && (
                    <div className="flex items-center gap-3 p-3 border-2 border-red-200 rounded-lg bg-red-50">
                      <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-600">File verrà eliminato al salvataggio</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteCurrentFile(false)}
                        className="border-2"
                      >
                        Annulla
                      </Button>
                    </div>
                  )}

                  {/* Nuovo file selezionato */}
                  {newFile && (
                    <div className="flex items-center gap-3 p-3 border-2 border-green-200 rounded-lg bg-green-50">
                      <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{newFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(newFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewFile(null)}
                        className="border-2"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rimuovi
                      </Button>
                    </div>
                  )}

                  {/* Bottone per caricare nuovo file */}
                  {!newFile && (
                    <div>
                      <input
                        type="file"
                        id="file-upload-edit"
                        accept=".pdf,image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="file-upload-edit">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-2 border-border"
                          onClick={() => document.getElementById('file-upload-edit')?.click()}
                        >
                          <CloudUpload className="h-4 w-4 mr-2" />
                          {fattura.allegato_url && !deleteCurrentFile
                            ? 'Sostituisci file'
                            : 'Carica file'}
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        PDF, JPG, PNG (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              ) : fattura.allegato_url && onOpenFile ? (
                <Button
                  onClick={() => onOpenFile(fattura.allegato_url!)}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Visualizza Documento
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
