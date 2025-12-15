'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Briefcase, Calendar, Clock, RotateCcw, FileText, User as UserIcon, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RapportinoFormData } from '@/types/rapportino';

interface NuovoRapportinoModalProps {
  onClose: () => void;
  onSuccess: () => void;
  users: User[];
  commesse: Commessa[];
  prefilledUserId?: string;
  prefilledDate?: string;
  initialModalitaCalcolo?: 'ore_totali' | 'orari';
  prefilledCommessaId?: string;
}

type User = {
  id: string;
  email: string;
  role: string;
  dipendente_id?: string; // ID del dipendente se non ha account
  user_metadata?: {
    full_name?: string;
  };
};

type Commessa = {
  id: string;
  nome_commessa: string;
};

const initialFormData = {
  commessa_id: '',
  data_rapportino: new Date().toISOString().split('T')[0],
  ore_lavorate: '',
  tempo_pausa: '60', // Default: 1 ora
  orario_inizio: '',
  orario_fine: '',
  note: '',
};

export function NuovoRapportinoModal({ onClose, onSuccess, users, commesse, prefilledUserId, prefilledDate, initialModalitaCalcolo, prefilledCommessaId }: NuovoRapportinoModalProps) {
  const [formData, setFormData] = useState({
    ...initialFormData,
    data_rapportino: prefilledDate || initialFormData.data_rapportino,
    commessa_id: prefilledCommessaId || initialFormData.commessa_id,
  });
  const [selectedDipendenti, setSelectedDipendenti] = useState<string[]>(
    prefilledUserId ? [prefilledUserId] : []
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openCommessaCombobox, setOpenCommessaCombobox] = useState(false);
  const [openDipendentiPopover, setOpenDipendentiPopover] = useState(false);
  const [modalitaCalcolo, setModalitaCalcolo] = useState<'ore_totali' | 'orari'>(initialModalitaCalcolo || 'ore_totali');
  const [customPausa, setCustomPausa] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Solo se non è già stata passata come prop
    if (!initialModalitaCalcolo) {
      loadModalitaCalcolo();
    }
  }, []);

  const loadModalitaCalcolo = async () => {
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

      const { data: tenant } = await supabase
        .from('tenants')
        .select('modalita_calcolo_rapportini')
        .eq('id', userTenants.tenant_id)
        .single();

      if (tenant) {
        setModalitaCalcolo(tenant.modalita_calcolo_rapportini || 'ore_totali');
      }
    } catch {
      // Use default
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setSelectedDipendenti([]);
    setSelectedFile(null);
  };

  const addDipendente = (userId: string) => {
    if (!selectedDipendenti.includes(userId)) {
      setSelectedDipendenti([...selectedDipendenti, userId]);
      setOpenDipendentiPopover(false);
    }
  };

  const removeDipendente = (userId: string) => {
    setSelectedDipendenti(selectedDipendenti.filter(id => id !== userId));
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Il file è troppo grande. Massimo 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Il file è troppo grande. Massimo 10MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validazione base
    if (selectedDipendenti.length === 0 || !formData.commessa_id || !formData.data_rapportino) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    let oreNum = 0;

    // Calcola ore in base alla modalità
    if (modalitaCalcolo === 'ore_totali') {
      if (!formData.ore_lavorate) {
        toast.error('Inserisci le ore lavorate');
        return;
      }
      oreNum = parseFloat(formData.ore_lavorate);
      if (isNaN(oreNum) || oreNum <= 0 || oreNum > 24) {
        toast.error('Le ore lavorate devono essere tra 0 e 24');
        return;
      }
    } else {
      // Modalità orari: calcola ore da orario_inizio e orario_fine
      if (!formData.orario_inizio || !formData.orario_fine) {
        toast.error('Inserisci orario di inizio e fine');
        return;
      }

      const [inizioH, inizioM] = formData.orario_inizio.split(':').map(Number);
      const [fineH, fineM] = formData.orario_fine.split(':').map(Number);

      const inizioMinutes = inizioH * 60 + inizioM;
      let fineMinutes = fineH * 60 + fineM;

      // Se fine è prima di inizio, assume che sia il giorno dopo
      if (fineMinutes < inizioMinutes) {
        fineMinutes += 24 * 60;
      }

      const minutiLavorati = fineMinutes - inizioMinutes;
      oreNum = minutiLavorati / 60;

      if (oreNum <= 0 || oreNum > 24) {
        toast.error('Orari non validi');
        return;
      }
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
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
      if (!userTenant) throw new Error('No tenant found');

      // Calculate tempo_pausa
      let tempoPausaMinutes = 60; // Default: 1 ora
      if (formData.tempo_pausa === 'custom') {
        tempoPausaMinutes = parseInt(customPausa) || 0;
      } else {
        tempoPausaMinutes = parseInt(formData.tempo_pausa) || 60;
      }

      // Sottrai la pausa dalle ore totali per ottenere le ore effettive lavorate
      const oreLavorateEffettive = oreNum - (tempoPausaMinutes / 60);

      if (oreLavorateEffettive <= 0) {
        toast.error('Le ore lavorate (dopo la pausa) devono essere maggiori di 0');
        return;
      }

      // Create rapportini for each selected dipendente
      let successCount = 0;
      let duplicateCount = 0;
      const duplicateUsers: string[] = [];

      for (const userId of selectedDipendenti) {
        let allegato_url = null;

        // Upload file if selected (one file per dipendente)
        if (selectedFile) {
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${Date.now()}_${userId}.${fileExt}`;
          const filePath = `${userTenant.tenant_id}/rapportini/${userId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('app-storage')
            .upload(filePath, selectedFile);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue; // Skip this dipendente if upload fails
          }

          allegato_url = filePath;
        }

        // Get selected user info
        const selectedUser = users.find(u => u.id === userId);
        const user_name = selectedUser?.user_metadata?.full_name || null;
        const user_email = selectedUser?.email || null;

        // Insert rapportino data
        const rapportinoData: any = {
          tenant_id: userTenant.tenant_id,
          user_name,
          user_email,
          commessa_id: formData.commessa_id,
          data_rapportino: formData.data_rapportino,
          ore_lavorate: oreLavorateEffettive,
          tempo_pausa: tempoPausaMinutes,
          note: formData.note || null,
          allegato_url,
          created_by: user.id,
        };

        // Usa user_id o dipendente_id in base alla presenza di account
        if (selectedUser?.dipendente_id) {
          rapportinoData.dipendente_id = selectedUser.dipendente_id;
        } else {
          rapportinoData.user_id = userId;
        }

        // Aggiungi orari solo se modalità orari
        if (modalitaCalcolo === 'orari') {
          rapportinoData.orario_inizio = formData.orario_inizio;
          rapportinoData.orario_fine = formData.orario_fine;
        }

        // Insert each rapportino individually
        const { error } = await supabase
          .from('rapportini')
          .insert(rapportinoData);

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505') {
            duplicateCount++;
            duplicateUsers.push(getUserDisplayName(selectedUser!));
          } else {
            console.error('Insert error for user', userId, ':', error);
          }
        } else {
          successCount++;
        }
      }

      if (successCount === 0 && duplicateCount === 0) {
        throw new Error('Nessun rapportino creato');
      }

      // Show appropriate success message
      if (successCount > 0 && duplicateCount > 0) {
        toast.success(`${successCount} rapportini creati. ${duplicateCount} già esistenti (${duplicateUsers.join(', ')})`);
      } else if (successCount > 0) {
        toast.success(`${successCount} rapportini creati con successo`);
      } else if (duplicateCount > 0) {
        toast.warning(`Rapportini già esistenti per: ${duplicateUsers.join(', ')}`);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error creating rapportini:', error);
      toast.error(error?.message || 'Errore nella creazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.user_metadata?.full_name || user.email?.split('@')[0] || user.email;
  };

  // Calculate effective hours (ore lavorate - pausa)
  const calculateEffectiveHours = () => {
    let oreNum = 0;

    // Calcola ore in base alla modalità
    if (modalitaCalcolo === 'ore_totali') {
      oreNum = parseFloat(formData.ore_lavorate) || 0;
    } else {
      // Modalità orari: calcola ore da orario_inizio e orario_fine
      if (formData.orario_inizio && formData.orario_fine) {
        const [inizioH, inizioM] = formData.orario_inizio.split(':').map(Number);
        const [fineH, fineM] = formData.orario_fine.split(':').map(Number);

        if (!isNaN(inizioH) && !isNaN(inizioM) && !isNaN(fineH) && !isNaN(fineM)) {
          const inizioMinutes = inizioH * 60 + inizioM;
          let fineMinutes = fineH * 60 + fineM;

          // Se fine è prima di inizio, assume che sia il giorno dopo
          if (fineMinutes < inizioMinutes) {
            fineMinutes += 24 * 60;
          }

          const minutiLavorati = fineMinutes - inizioMinutes;
          oreNum = minutiLavorati / 60;
        }
      }
    }

    // Sottrai pausa
    let pausaMinutes = 0;
    if (formData.tempo_pausa === 'custom') {
      pausaMinutes = parseInt(customPausa) || 0;
    } else {
      pausaMinutes = parseInt(formData.tempo_pausa) || 0;
    }

    const effectiveHours = oreNum - (pausaMinutes / 60);
    return effectiveHours > 0 ? effectiveHours.toFixed(2) : '0.00';
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-4xl w-full mx-auto max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Nuovo Rapportino</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compila i dati del rapportino giornaliero
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="h-9 border-2 gap-1.5"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dipendenti Section - Grid Layout */}
          <div>
            <Label className="text-foreground font-medium text-sm mb-2 block">
              Dipendenti <span className="text-destructive">*</span>
            </Label>

            {/* Selected Dipendenti + Add Button Grid - 2 per row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Selected Dipendenti Cards */}
              {selectedDipendenti.map((userId) => {
                const dipendente = users.find(u => u.id === userId);
                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between px-4 py-2.5 rounded-lg border-2 border-border bg-background h-11"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{getUserDisplayName(dipendente!)}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDipendente(userId)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {/* Add Dipendente Button */}
              <Popover open={openDipendentiPopover} onOpenChange={setOpenDipendentiPopover}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 border-2 border-dashed border-border hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi dipendente
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cerca dipendente..." />
                    <CommandList>
                      <CommandEmpty>Nessun dipendente trovato.</CommandEmpty>
                      <CommandGroup>
                        {users
                          .filter(user => !selectedDipendenti.includes(user.id))
                          .map((user) => (
                            <CommandItem
                              key={user.id}
                              value={getUserDisplayName(user)}
                              onSelect={() => addDipendente(user.id)}
                            >
                              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                              {getUserDisplayName(user)}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Data, Ore/Orari, Pausa - Layout a L */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Data - sempre 4 colonne */}
            <div className="md:col-span-4 w-full">
              <Label htmlFor="data_rapportino" className="text-foreground font-medium text-sm mb-2 block w-full">
                Data Rapportino <span className="text-destructive">*</span>
              </Label>
              <Input
                id="data_rapportino"
                type="date"
                value={formData.data_rapportino}
                onChange={(e) => setFormData({ ...formData, data_rapportino: e.target.value })}
                className="h-11 border-2 border-border bg-background w-full"
                style={{ paddingRight: '0.25rem' }}
                required
              />
            </div>

            {/* Ore Lavorate O Orari */}
            {modalitaCalcolo === 'ore_totali' ? (
              <div className="md:col-span-4 w-full">
                <Label htmlFor="ore_lavorate" className="text-foreground font-medium text-sm mb-2 block w-full">
                  Ore Lavorate <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ore_lavorate"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="8"
                  value={formData.ore_lavorate}
                  onChange={(e) => setFormData({ ...formData, ore_lavorate: e.target.value })}
                  className="h-11 border-2 border-border bg-background w-full"
                  style={{ paddingRight: '0.25rem' }}
                  required
                />
              </div>
            ) : (
              <>
                <div className="md:col-span-2 w-full">
                  <Label htmlFor="orario_inizio" className="text-foreground font-medium text-sm mb-2 block w-full">
                    Orario Inizio <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="orario_inizio"
                    type="time"
                    value={formData.orario_inizio || ''}
                    onChange={(e) => setFormData({ ...formData, orario_inizio: e.target.value })}
                    className="h-11 border-2 border-border bg-background w-full"
                    style={{ paddingRight: '0.25rem' }}
                    required
                  />
                </div>

                <div className="md:col-span-2 w-full">
                  <Label htmlFor="orario_fine" className="text-foreground font-medium text-sm mb-2 block w-full">
                    Orario Fine <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="orario_fine"
                    type="time"
                    value={formData.orario_fine || ''}
                    onChange={(e) => setFormData({ ...formData, orario_fine: e.target.value })}
                    className="h-11 border-2 border-border bg-background w-full"
                    style={{ paddingRight: '0.25rem' }}
                    required
                  />
                </div>
              </>
            )}

            {/* Pausa - SEMPRE 4 colonne e row-span-2 */}
            <div className="md:col-span-4 md:row-span-2">
              <Label className="text-foreground font-medium text-sm mb-2 block">
                Pausa (min)
              </Label>
              <div className="space-y-3">
                <label htmlFor="pausa_60" className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      id="pausa_60"
                      name="tempo_pausa"
                      value="60"
                      checked={formData.tempo_pausa === '60'}
                      onChange={(e) => setFormData({ ...formData, tempo_pausa: e.target.value })}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 checked:border-0 checked:bg-primary focus:outline-none"
                    />
                    <div className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                  </div>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">1 ora</span>
                </label>
                <label htmlFor="pausa_90" className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      id="pausa_90"
                      name="tempo_pausa"
                      value="90"
                      checked={formData.tempo_pausa === '90'}
                      onChange={(e) => setFormData({ ...formData, tempo_pausa: e.target.value })}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 checked:border-0 checked:bg-primary focus:outline-none"
                    />
                    <div className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                  </div>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">1 ora e 30</span>
                </label>
                <label htmlFor="pausa_0" className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      id="pausa_0"
                      name="tempo_pausa"
                      value="0"
                      checked={formData.tempo_pausa === '0'}
                      onChange={(e) => setFormData({ ...formData, tempo_pausa: e.target.value })}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 checked:border-0 checked:bg-primary focus:outline-none"
                    />
                    <div className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                  </div>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">Nessuna pausa</span>
                </label>
                <label htmlFor="pausa_custom" className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="radio"
                      id="pausa_custom"
                      name="tempo_pausa"
                      value="custom"
                      checked={formData.tempo_pausa === 'custom'}
                      onChange={(e) => {
                        setFormData({ ...formData, tempo_pausa: e.target.value });
                        setCustomPausa('');
                      }}
                      className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 checked:border-0 checked:bg-primary focus:outline-none"
                    />
                    <div className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100"></div>
                  </div>
                  <span className="text-sm text-foreground group-hover:text-primary transition-colors">Altro</span>
                  {formData.tempo_pausa === 'custom' && (
                    <Input
                      type="text"
                      placeholder="min"
                      value={customPausa}
                      onChange={(e) => setCustomPausa(e.target.value)}
                      className="h-9 w-24 border-2 border-border bg-background"
                    />
                  )}
                </label>
              </div>
            </div>

            {/* Ore Calcolate - 8 colonne (sotto Data + Ore/Orari) */}
            <div className="md:col-span-8">
              <Label className="text-foreground font-medium text-sm mb-2 block">
                Ore Lavorate (Calcolate Automaticamente)
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={calculateEffectiveHours()}
                  readOnly
                  className="h-11 border-2 border-border bg-background pl-10 text-foreground font-semibold cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Commessa */}
          <div>
            <Label className="text-foreground font-medium text-sm mb-2 block">
              Commessa <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Popover open={openCommessaCombobox} onOpenChange={prefilledCommessaId ? undefined : setOpenCommessaCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCommessaCombobox}
                    className="h-11 w-full justify-between border-2 border-border bg-background"
                    disabled={!!prefilledCommessaId}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {formData.commessa_id
                          ? commesse.find((c) => c.id === formData.commessa_id)?.nome_commessa
                          : 'Seleziona commessa...'}
                      </span>
                    </span>
                    {!prefilledCommessaId && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                  </Button>
                </PopoverTrigger>
                {!prefilledCommessaId && (
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca commessa..." />
                      <CommandList>
                        <CommandEmpty>Nessuna commessa trovata.</CommandEmpty>
                        <CommandGroup>
                          {commesse.map((commessa) => (
                            <CommandItem
                              key={commessa.id}
                              value={commessa.nome_commessa}
                              onSelect={() => {
                                setFormData({ ...formData, commessa_id: commessa.id });
                                setOpenCommessaCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  formData.commessa_id === commessa.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {commessa.nome_commessa}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
              {formData.commessa_id && !prefilledCommessaId && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, commessa_id: '' })}
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Row: Note + Upload File */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Note - 3 colonne */}
            <div className="md:col-span-3">
              <Label htmlFor="note" className="text-foreground font-medium text-sm mb-2 block">Note</Label>
              <div className="relative h-full">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Textarea
                  id="note"
                  placeholder="Eventuali note sul rapportino..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="border-2 border-border bg-background pl-10 resize-none h-[calc(100%-2rem)]"
                />
              </div>
            </div>

            {/* Upload File - 2 colonne */}
            <div className="md:col-span-2">
              <Label className="text-foreground font-medium text-sm mb-2 block">Allegato</Label>
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer h-[calc(100%-2rem)]',
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
                <div className="text-center h-full flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  {selectedFile ? (
                    <>
                      <p className="text-sm font-medium text-foreground mb-1 truncate max-w-full px-2">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="h-8 text-xs border-2"
                      >
                        Rimuovi
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-foreground mb-1 px-2">
                        Trascina o <span className="text-primary font-medium">clicca</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
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
              className="h-11 px-6 font-semibold"
            >
              {loading ? 'Creazione in corso...' : 'Crea Rapportino'}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
