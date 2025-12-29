'use client';

import { useState, useEffect } from 'react';
import { Receipt, X, Edit, Trash2, Save, XCircle, ChevronsUpDown, Check, CloudUpload, FileText, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSignedUrl } from '@/lib/utils/storage';
import type { NotaSpesa, NotaSpesaAzione, CategoriaNotaSpesa } from '@/types/nota-spesa';

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  email: string;
}

interface Commessa {
  id: string;
  titolo: string;
  slug: string;
}

interface InfoNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDelete?: () => void;
  onOpenFile?: (path: string) => void;
}

export function InfoNotaSpesaModal({ notaSpesa, isOpen, onOpenChange, onUpdate, onDelete, onOpenFile }: InfoNotaSpesaModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState<Partial<NotaSpesa>>(notaSpesa);

  // Dati per dropdown
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [categorie, setCategorie] = useState<CategoriaNotaSpesa[]>([]);
  const [openDipendenteCombo, setOpenDipendenteCombo] = useState(false);
  const [openCommessaCombo, setOpenCommessaCombo] = useState(false);
  const [selectedDipendenteId, setSelectedDipendenteId] = useState<string>('');
  const [selectedCommessaId, setSelectedCommessaId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');

  // Gestione file
  const [newFile, setNewFile] = useState<File | null>(null);
  const [deleteCurrentFile, setDeleteCurrentFile] = useState(false);
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);

  // Azioni
  const [azioni, setAzioni] = useState<NotaSpesaAzione[]>([]);

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
    setEditedData(notaSpesa);
    setSelectedDipendenteId(notaSpesa.dipendente_id || '');
    setSelectedCommessaId(notaSpesa.commessa_id || '');
    loadAzioni();
    loadAllegatoUrl();
  }, [notaSpesa]);

  const loadAzioni = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('note_spesa_azioni')
        .select(`
          *,
          utente:dipendenti!note_spesa_azioni_eseguita_da_fkey (
            nome,
            cognome,
            email
          )
        `)
        .eq('nota_spesa_id', notaSpesa.id)
        .order('created_at', { ascending: false });

      if (data) {
        setAzioni(data);
      }
    } catch (error) {
      console.error('Error loading azioni:', error);
    }
  };

  const loadAllegatoUrl = async () => {
    if (!notaSpesa.allegati || notaSpesa.allegati.length === 0) return;
    const allegato = notaSpesa.allegati[0];
    const url = await getSignedUrl(allegato.file_path);
    if (url) {
      setAllegatoUrl(url);
    }
  };

  const loadDipendenti = async (tid?: string) => {
    const tenant = tid || tenantId;
    if (!tenant) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome, email')
        .eq('tenant_id', tenant)
        .order('cognome, nome');

      if (error) throw error;
      setDipendenti(data || []);
    } catch (error) {
      console.error('Error loading dipendenti:', error);
    }
  };

  const loadCommesse = async (tid?: string) => {
    const tenant = tid || tenantId;
    if (!tenant) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('commesse')
        .select('id, titolo, slug')
        .eq('tenant_id', tenant)
        .order('titolo');

      if (error) throw error;
      setCommesse(data || []);
    } catch (error) {
      console.error('Error loading commesse:', error);
    }
  };

  const loadCategorie = async (tid?: string) => {
    const tenant = tid || tenantId;
    if (!tenant) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categorie_note_spesa')
        .select('*')
        .eq('tenant_id', tenant)
        .eq('attiva', true)
        .order('ordinamento');

      if (error) throw error;
      setCategorie(data || []);
    } catch (error) {
      console.error('Error loading categorie:', error);
    }
  };

  const getDipendenteDisplayName = (dipendente: Dipendente) => {
    return `${dipendente.cognome} ${dipendente.nome}`.trim();
  };

  const handleSelectDipendente = (dipendenteId: string) => {
    const dipendente = dipendenti.find(d => d.id === dipendenteId);
    if (dipendente) {
      setSelectedDipendenteId(dipendenteId);
      setEditedData(prev => ({
        ...prev,
        dipendente_id: dipendenteId,
      }));
      setOpenDipendenteCombo(false);
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
        loadDipendenti(currentTenantId),
        loadCommesse(currentTenantId),
        loadCategorie(currentTenantId),
      ]);
    }
  };

  const handleCancelEdit = () => {
    setEditedData(notaSpesa);
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

  const uploadFile = async (notaSpesaId: string): Promise<string | null> => {
    if (!newFile) return null;

    const supabase = createClient();
    const fileExt = newFile.name.split('.').pop();
    const fileName = `${notaSpesaId}_${Date.now()}.${fileExt}`;
    const filePath = `note-spesa/${fileName}`;

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

      // Gestione allegato
      let allegati = notaSpesa.allegati || [];

      // Se c'è un nuovo file, caricalo
      if (newFile) {
        const uploadedPath = await uploadFile(notaSpesa.id);
        if (uploadedPath) {
          // Elimina il vecchio file se esiste
          if (notaSpesa.allegati && notaSpesa.allegati.length > 0) {
            try {
              await supabase.storage
                .from('app-storage')
                .remove([notaSpesa.allegati[0].file_path]);
            } catch (error) {
              console.error('Error deleting old file:', error);
            }
          }
          allegati = [{
            nome_file: newFile.name,
            file_path: uploadedPath,
            file_size: newFile.size,
            mime_type: newFile.type,
          }];
        }
      } else if (deleteCurrentFile && notaSpesa.allegati && notaSpesa.allegati.length > 0) {
        // Elimina il file esistente
        try {
          await supabase.storage
            .from('app-storage')
            .remove([notaSpesa.allegati[0].file_path]);
          allegati = [];
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }

      // Prepara i dati da aggiornare
      const updateData: any = {
        dipendente_id: selectedDipendenteId,
        commessa_id: selectedCommessaId,
        data_nota: editedData.data_nota,
        importo: parseFloat(editedData.importo?.toString() || '0'),
        categoria: editedData.categoria,
        descrizione: editedData.descrizione || null,
        allegati,
        stato: editedData.stato,
      };

      const { error } = await supabase
        .from('note_spesa')
        .update(updateData)
        .eq('id', notaSpesa.id);

      if (error) {
        console.error('Error updating nota spesa:', error);
        toast.error('Errore nell\'aggiornamento della nota spesa');
        return;
      }

      toast.success('Nota spesa aggiornata con successo');
      setIsEditing(false);
      setNewFile(null);
      setDeleteCurrentFile(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating nota spesa:', error);
      toast.error('Errore nell\'aggiornamento della nota spesa');
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatoBadgeClasses = (stato: string) => {
    switch (stato) {
      case 'approvato':
        return 'bg-green-100 text-green-700';
      case 'da_approvare':
        return 'bg-yellow-100 text-yellow-700';
      case 'rifiutato':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatoLabel = (stato: string) => {
    switch (stato) {
      case 'approvato':
        return 'Approvato';
      case 'da_approvare':
        return 'Da Approvare';
      case 'rifiutato':
        return 'Rifiutato';
      case 'bozza':
        return 'Bozza';
      default:
        return stato;
    }
  };

  const getAzioneIcon = (azione: string) => {
    switch (azione) {
      case 'creata':
        return <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />;
      case 'modificata':
        return <Edit className="h-5 w-5 text-orange-600 flex-shrink-0" />;
      case 'sottomessa':
        return <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />;
      case 'approvata':
        return <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />;
      case 'rifiutata':
        return <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      case 'eliminata':
        return <Trash2 className="h-5 w-5 text-gray-600 flex-shrink-0" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />;
    }
  };

  const getAzioneLabel = (azione: string) => {
    switch (azione) {
      case 'creata':
        return 'Nota spesa creata';
      case 'modificata':
        return 'Nota spesa modificata';
      case 'sottomessa':
        return 'Sottomessa per approvazione';
      case 'approvata':
        return 'Nota spesa approvata';
      case 'rifiutata':
        return 'Nota spesa rifiutata';
      case 'eliminata':
        return 'Nota spesa eliminata';
      default:
        return azione;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col [&>button]:hidden">
        {/* Header fisso */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Receipt className="h-6 w-6 text-primary flex-shrink-0" />
            <SheetTitle className="text-2xl font-bold truncate">
              Dettagli Nota Spesa
            </SheetTitle>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!isEditing ? (
              <>
                {onDelete && (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
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
                  onClick={() => onOpenChange(false)}
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
                {/* Close button - Also visible when editing */}
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contenuto scrollabile */}
      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
        <div className="space-y-6">
          {/* Dati Nota Spesa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Dati Nota Spesa</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Numero Nota</p>
                {isEditing ? (
                  <Input
                    value={editedData.numero_nota || ''}
                    onChange={(e) => setEditedData({...editedData, numero_nota: e.target.value})}
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="font-bold">{notaSpesa.numero_nota}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Dipendente</p>
                {isEditing ? (
                  <Popover open={openDipendenteCombo} onOpenChange={setOpenDipendenteCombo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDipendenteCombo}
                        className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                      >
                        {dipendenti.find(d => d.id === selectedDipendenteId)
                          ? getDipendenteDisplayName(dipendenti.find(d => d.id === selectedDipendenteId)!)
                          : (notaSpesa.dipendenti
                            ? `${notaSpesa.dipendenti.cognome} ${notaSpesa.dipendenti.nome}`
                            : "Seleziona dipendente...")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                      <Command>
                        <CommandInput placeholder="Cerca dipendente..." />
                        <CommandEmpty>
                          <div className="p-2 text-sm text-muted-foreground">
                            Nessun dipendente trovato
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {dipendenti.map((dipendente) => (
                            <CommandItem
                              key={dipendente.id}
                              value={getDipendenteDisplayName(dipendente)}
                              onSelect={() => handleSelectDipendente(dipendente.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedDipendenteId === dipendente.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{getDipendenteDisplayName(dipendente)}</span>
                                <span className="text-xs text-muted-foreground">{dipendente.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="font-medium">
                    {notaSpesa.dipendenti
                      ? `${notaSpesa.dipendenti.cognome} ${notaSpesa.dipendenti.nome}`
                      : 'N/A'}
                  </p>
                )}
              </div>

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
                        {commesse.find(c => c.id === selectedCommessaId)?.titolo || notaSpesa.commesse?.titolo || "Seleziona commessa..."}
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
                          {commesse.map((commessa) => (
                            <CommandItem
                              key={commessa.id}
                              value={commessa.titolo}
                              onSelect={() => handleSelectCommessa(commessa.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCommessaId === commessa.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{commessa.titolo}</span>
                                {commessa.slug && (
                                  <span className="text-xs text-muted-foreground">{commessa.slug}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="font-medium">{notaSpesa.commesse?.titolo || '-'}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Data</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedData.data_nota || ''}
                    onChange={(e) => setEditedData({...editedData, data_nota: e.target.value})}
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="font-medium">
                    {formatDate(notaSpesa.data_nota)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Categoria</p>
                {isEditing ? (
                  <Select
                    value={editedData.categoria || ''}
                    onValueChange={(value) => setEditedData({...editedData, categoria: value})}
                  >
                    <SelectTrigger className="h-11 border-2 border-border bg-white">
                      <SelectValue placeholder="Seleziona categoria">
                        {categorie.find(c => c.id === editedData.categoria)?.nome || 'Seleziona categoria'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categorie.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.colore }}
                            />
                            {cat.nome}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  notaSpesa.categorie_note_spesa ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-sm text-xs font-medium bg-primary/10 text-primary">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: notaSpesa.categorie_note_spesa.colore }}
                      />
                      {notaSpesa.categorie_note_spesa.nome}
                    </span>
                  ) : (
                    <p className="font-medium">-</p>
                  )
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Stato</p>
                {isEditing ? (
                  <Select
                    value={editedData.stato || notaSpesa.stato}
                    onValueChange={(value) => setEditedData({...editedData, stato: value as any})}
                  >
                    <SelectTrigger className="h-11 border-2 border-border bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bozza">Bozza</SelectItem>
                      <SelectItem value="da_approvare">Da Approvare</SelectItem>
                      <SelectItem value="approvato">Approvato</SelectItem>
                      <SelectItem value="rifiutato">Rifiutato</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${getStatoBadgeClasses(notaSpesa.stato)}`}>
                    {getStatoLabel(notaSpesa.stato)}
                  </span>
                )}
              </div>
            </div>

            {/* Box importo con sfondo primario */}
            <div className="bg-primary/5 p-6 rounded-lg mt-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Importo</p>
                {isEditing ? (
                  <Input
                    type="number"
                    step="0.01"
                    value={editedData.importo || ''}
                    onChange={(e) => setEditedData({...editedData, importo: parseFloat(e.target.value)})}
                    className="h-11 border-2 border-border bg-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(notaSpesa.importo)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Descrizione */}
          {(notaSpesa.descrizione || isEditing) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Descrizione</h3>
              {isEditing ? (
                <Textarea
                  value={editedData.descrizione || ''}
                  onChange={(e) => setEditedData({...editedData, descrizione: e.target.value})}
                  placeholder="Inserisci una descrizione..."
                  rows={4}
                  className="resize-none border-2 border-border bg-white"
                />
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{notaSpesa.descrizione}</p>
                </div>
              )}
            </div>
          )}

          {/* Allegato */}
          {(notaSpesa.allegati?.length > 0 || isEditing) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Documento</h3>

              {isEditing ? (
                <div className="space-y-3">
                  {/* File corrente */}
                  {notaSpesa.allegati?.length > 0 && !deleteCurrentFile && !newFile && (
                    <div className="flex items-center gap-3 p-3 border-2 border-border rounded-lg bg-gray-50">
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">File corrente</p>
                        {allegatoUrl && (
                          <button
                            onClick={() => window.open(allegatoUrl, '_blank')}
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
                          {notaSpesa.allegati?.length > 0 && !deleteCurrentFile
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
              ) : notaSpesa.allegati?.length > 0 && allegatoUrl ? (
                <Button
                  onClick={() => window.open(allegatoUrl, '_blank')}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Visualizza Documento
                </Button>
              ) : null}
            </div>
          )}

          {/* Cronologia Azioni */}
          {azioni.length > 0 && !isEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Cronologia</h3>
              <div className="space-y-2">
                {azioni.map((azione) => (
                  <div key={azione.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    {getAzioneIcon(azione.azione)}
                    <div>
                      <p className="text-sm font-medium">{getAzioneLabel(azione.azione)}</p>
                      {azione.utente && (
                        <p className="text-xs text-muted-foreground">
                          {azione.utente.cognome} {azione.utente.nome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDateTime(azione.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </SheetContent>
    </Sheet>
  );
}
