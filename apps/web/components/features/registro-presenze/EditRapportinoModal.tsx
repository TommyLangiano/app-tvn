'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Briefcase, Calendar, Clock, RotateCcw, FileText, User as UserIcon, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Rapportino } from '@/types/rapportino';
import { getSignedUrl } from '@/lib/utils/storage';

interface EditRapportinoModalProps {
  rapportino: Rapportino;
  onClose: () => void;
  onSuccess: () => void;
  commesse: Commessa[];
}

type Commessa = {
  id: string;
  nome_commessa: string;
};

export function EditRapportinoModal({ rapportino, onClose, onSuccess, commesse }: EditRapportinoModalProps) {
  // Determina la modalità in base a come è stato creato il rapportino
  const initialModalita = rapportino.orario_inizio && rapportino.orario_fine ? 'orari' : 'ore_totali';

  const [formData, setFormData] = useState({
    commessa_id: rapportino.commessa_id || '',
    data_rapportino: rapportino.data_rapportino || '',
    ore_lavorate: rapportino.ore_lavorate?.toString() || '',
    orario_inizio: rapportino.orario_inizio || '',
    orario_fine: rapportino.orario_fine || '',
    tempo_pausa: rapportino.tempo_pausa?.toString() || '60',
    note: rapportino.note || '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openCommessaCombobox, setOpenCommessaCombobox] = useState(false);
  const [modalitaCalcolo] = useState<'ore_totali' | 'orari'>(initialModalita);
  const [customPausa, setCustomPausa] = useState('');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(rapportino.allegato_url || null);
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [commesseTeam, setCommesseTeam] = useState<Map<string, Set<string>>>(new Map()); // commessa_id -> Set of dipendente_ids
  const [userToDipendenteMap, setUserToDipendenteMap] = useState<Map<string, string>>(new Map()); // user.id -> dipendente.id
  const [loadingTeam, setLoadingTeam] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialAllegatoRef = useRef<string | null>(rapportino.allegato_url || null);

  useEffect(() => {
    if (rapportino.allegato_url) {
      getSignedUrl(rapportino.allegato_url).then(setAllegatoUrl);
    }
    // Carica i team delle commesse
    loadCommesseTeam();
  }, [rapportino.allegato_url]);

  const loadCommesseTeam = async () => {
    try {
      setLoadingTeam(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      // Carica i dipendenti per costruire la mappa user_id -> dipendente_id
      const { data: dipendentiData, error: dipError } = await supabase
        .from('dipendenti')
        .select('id, user_id')
        .eq('tenant_id', userTenants.tenant_id);

      if (dipError) throw dipError;

      // Costruisci la mappa: userId -> dipendenteId
      const userDipMap = new Map<string, string>();
      dipendentiData?.forEach((dip) => {
        if (dip.user_id) {
          // Se ha user_id, mappa user_id -> dipendente.id
          userDipMap.set(dip.user_id, dip.id);
        }
        // Aggiungi anche dipendente.id -> dipendente.id per i dipendenti senza account
        userDipMap.set(dip.id, dip.id);
      });
      setUserToDipendenteMap(userDipMap);

      // Carica tutti i team delle commesse
      const { data: teamData, error } = await supabase
        .from('commesse_team')
        .select('commessa_id, dipendente_id')
        .eq('tenant_id', userTenants.tenant_id);

      if (error) throw error;

      // Costruisci la mappa: commessa_id -> Set di dipendente_ids
      const teamMap = new Map<string, Set<string>>();
      teamData?.forEach((row) => {
        if (!teamMap.has(row.commessa_id)) {
          teamMap.set(row.commessa_id, new Set());
        }
        teamMap.get(row.commessa_id)!.add(row.dipendente_id);
      });

      setCommesseTeam(teamMap);
    } catch (error) {
      console.error('Error loading commesse team:', error);
      toast.error('Errore nel caricamento dei team');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    // Imposta il valore personalizzato se non è uno dei valori standard
    const standardValues = ['0', '60', '90'];
    const pausaValue = rapportino.tempo_pausa?.toString() || '60';

    if (!standardValues.includes(pausaValue)) {
      setFormData(prev => ({ ...prev, tempo_pausa: 'custom' }));
      setCustomPausa(pausaValue);
    }
  }, [rapportino.tempo_pausa]);

  const handleReset = () => {
    setFormData({
      commessa_id: rapportino.commessa_id || '',
      data_rapportino: rapportino.data_rapportino || '',
      ore_lavorate: rapportino.ore_lavorate?.toString() || '',
      orario_inizio: rapportino.orario_inizio || '',
      orario_fine: rapportino.orario_fine || '',
      tempo_pausa: rapportino.tempo_pausa?.toString() || '60',
      note: rapportino.note || '',
    });
    setSelectedFile(null);
    setCurrentFilePath(rapportino.allegato_url || null);
    setAllegatoUrl(null);
    if (rapportino.allegato_url) {
      getSignedUrl(rapportino.allegato_url).then(setAllegatoUrl);
    }
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

  const handleRemoveExistingFile = () => {
    setShowRemoveConfirm(true);
  };

  const confirmRemoveExistingFile = () => {
    setCurrentFilePath(null);
    setAllegatoUrl(null);
    setShowRemoveConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validazione base
    if (!formData.commessa_id || !formData.data_rapportino) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    // Validazione team: verifica che il dipendente sia nel team della commessa
    const teamSet = commesseTeam.get(formData.commessa_id);
    if (!teamSet || teamSet.size === 0) {
      toast.error('La commessa selezionata non ha un team configurato');
      return;
    }

    // Determina il dipendente_id dal rapportino
    // rapportino può avere user_id o dipendente_id
    const userId = rapportino.user_id || rapportino.dipendente_id;
    if (!userId) {
      toast.error('Errore: impossibile determinare il dipendente');
      return;
    }

    const dipendenteId = userToDipendenteMap.get(userId);
    if (!dipendenteId || !teamSet.has(dipendenteId)) {
      toast.error('Il dipendente selezionato non fa parte del team di questa commessa');
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

      let allegatoPath = currentFilePath;

      // Handle file upload
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${rapportino.user_id}.${fileExt}`;
        const filePath = `${userTenant.tenant_id}/rapportini/${rapportino.user_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('app-storage')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        // Delete old file if exists and different
        if (initialAllegatoRef.current && initialAllegatoRef.current !== filePath) {
          await supabase.storage
            .from('app-storage')
            .remove([initialAllegatoRef.current]);
        }

        allegatoPath = filePath;
      } else if (currentFilePath === null && initialAllegatoRef.current) {
        // User removed the file
        await supabase.storage
          .from('app-storage')
          .remove([initialAllegatoRef.current]);
        allegatoPath = null;
      }

      // Update rapportino data
      const rapportinoData: any = {
        commessa_id: formData.commessa_id,
        data_rapportino: formData.data_rapportino,
        ore_lavorate: oreLavorateEffettive,
        tempo_pausa: tempoPausaMinutes,
        note: formData.note || null,
        allegato_url: allegatoPath,
      };

      // Aggiungi o rimuovi orari in base alla modalità
      if (modalitaCalcolo === 'orari') {
        rapportinoData.orario_inizio = formData.orario_inizio;
        rapportinoData.orario_fine = formData.orario_fine;
      } else {
        rapportinoData.orario_inizio = null;
        rapportinoData.orario_fine = null;
      }

      const { error: updateError } = await supabase
        .from('rapportini')
        .update(rapportinoData)
        .eq('id', rapportino.id);

      if (updateError) throw updateError;

      toast.success('Rapportino modificato con successo');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating rapportino:', error);
      toast.error(error?.message || 'Errore nella modifica del rapportino');
    } finally {
      setLoading(false);
    }
  };

  // Filtra le commesse disponibili in base al dipendente del rapportino
  const getAvailableCommesse = () => {
    // Determina il dipendente_id
    const userId = rapportino.user_id || rapportino.dipendente_id;
    if (!userId) {
      return commesse; // Se non c'è userId, mostra tutte (fallback)
    }

    const dipendenteId = userToDipendenteMap.get(userId);
    if (!dipendenteId) {
      return commesse; // Se non troviamo il dipendente_id, mostra tutte (fallback)
    }

    // Trova le commesse dove il dipendente è nel team
    const availableCommesseIds = new Set<string>();

    commesseTeam.forEach((teamSet, commessaId) => {
      if (teamSet.has(dipendenteId)) {
        availableCommesseIds.add(commessaId);
      }
    });

    return commesse.filter(c => availableCommesseIds.has(c.id));
  };

  // Calculate effective hours (ore lavorate effettive = ore o range - pausa)
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
            <h2 className="text-xl sm:text-2xl font-bold">Modifica Rapportino</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Aggiorna i dettagli del lavoro
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
          {/* Dipendente (Read-only) */}
          <div>
            <Label className="text-foreground font-medium text-sm mb-2 block">
              Dipendente
            </Label>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border-2 border-border bg-background h-11 cursor-not-allowed">
              <div className="flex items-center gap-2 min-w-0">
                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">{rapportino.user_name || rapportino.user_email}</span>
              </div>
            </div>
          </div>

          {/* Data + Ore/Orari + Pausa - Layout a L */}
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

            {/* Pausa - SEMPRE 4 colonne e row-span-2 (occupa 2 righe) */}
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
                        if (!customPausa) {
                          setCustomPausa('');
                        }
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
              <Popover open={openCommessaCombobox} onOpenChange={setOpenCommessaCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCommessaCombobox}
                    className="h-11 w-full justify-between border-2 border-border bg-background"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {formData.commessa_id
                          ? commesse.find((c) => c.id === formData.commessa_id)?.nome_commessa
                          : 'Seleziona commessa...'}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cerca commessa..." />
                    <CommandList>
                      <CommandEmpty>Nessuna commessa disponibile per questo dipendente.</CommandEmpty>
                      <CommandGroup>
                        {getAvailableCommesse().map((commessa) => (
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
              </Popover>
              {formData.commessa_id && (
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

              {/* Existing File Display */}
              {currentFilePath && !selectedFile && (
                <div className="border-2 border-border rounded-lg p-4 bg-background h-[calc(100%-2rem)]">
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="text-xs font-medium text-foreground truncate max-w-full px-2">
                      {currentFilePath.split('/').pop()}
                    </p>
                    <div className="flex items-center gap-2">
                      {allegatoUrl && (
                        <a
                          href={allegatoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </a>
                      )}
                      {!showRemoveConfirm ? (
                        <button
                          type="button"
                          onClick={handleRemoveExistingFile}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={confirmRemoveExistingFile}
                            className="h-7 text-xs border-2 text-red-600"
                          >
                            Conferma
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowRemoveConfirm(false)}
                            className="h-7 text-xs border-2"
                          >
                            Annulla
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* New File Upload Area */}
              {!currentFilePath && (
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
              )}
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
              {loading ? 'Salvataggio in corso...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
}
