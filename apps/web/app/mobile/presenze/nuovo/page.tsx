'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ArrowLeft, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Commessa = {
  id: string;
  nome_commessa: string;
};

const initialFormData = {
  commessa_id: '',
  data_rapportino: new Date().toISOString().split('T')[0],
  ore_lavorate: '',
  tempo_pausa: '60',
  orario_inizio: '',
  orario_fine: '',
  note: '',
};

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

const EffectiveHoursDisplay = memo(({ hours }: { hours: string }) => (
  <div className="bg-emerald-50 border-2 border-emerald-200 p-3 rounded-lg">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-900">Ore Effettive</span>
      <span className="text-2xl font-bold text-emerald-900">{hours}h</span>
    </div>
  </div>
));

EffectiveHoursDisplay.displayName = 'EffectiveHoursDisplay';

export default function NuovoRapportinoMobilePage() {
  const router = useRouter();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [openCommessaCombobox, setOpenCommessaCombobox] = useState(false);
  const [modalitaCalcolo, setModalitaCalcolo] = useState<'ore_totali' | 'orari'>('ore_totali');
  const [customPausa, setCustomPausa] = useState('');
  const [dipendenteId, setDipendenteId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [commesseTeam, setCommesseTeam] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingData(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: dipendente } = await supabase
        .from('dipendenti')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!dipendente) {
        toast.error('Errore: dipendente non trovato');
        router.push('/mobile/presenze');
        return;
      }

      setDipendenteId(dipendente.id);
      setTenantId(dipendente.tenant_id);

      const { data: tenant } = await supabase
        .from('tenants')
        .select('modalita_calcolo_rapportini')
        .eq('id', dipendente.tenant_id)
        .single();

      if (tenant) {
        setModalitaCalcolo(tenant.modalita_calcolo_rapportini || 'ore_totali');
      }

      const { data: teamData } = await supabase
        .from('commesse_team')
        .select('commessa_id')
        .eq('tenant_id', dipendente.tenant_id)
        .eq('dipendente_id', dipendente.id);

      const availableCommesseIds = new Set(teamData?.map(t => t.commessa_id) || []);
      setCommesseTeam(availableCommesseIds);

      if (availableCommesseIds.size > 0) {
        const { data: commesseData } = await supabase
          .from('commesse')
          .select('id, nome_commessa')
          .eq('tenant_id', dipendente.tenant_id)
          .eq('archiviata', false)
          .in('id', Array.from(availableCommesseIds))
          .order('nome_commessa');

        setCommesse(commesseData || []);
      } else {
        setCommesse([]);
        toast.info('Non fai parte di nessun team. Contatta il tuo amministratore.');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setCustomPausa('');
  }, []);

  const calculateEffectiveHours = useMemo(() => {
    let oreNum = 0;

    if (modalitaCalcolo === 'ore_totali') {
      oreNum = parseFloat(formData.ore_lavorate) || 0;
    } else {
      if (formData.orario_inizio && formData.orario_fine) {
        const [inizioH, inizioM] = formData.orario_inizio.split(':').map(Number);
        const [fineH, fineM] = formData.orario_fine.split(':').map(Number);

        if (!isNaN(inizioH) && !isNaN(inizioM) && !isNaN(fineH) && !isNaN(fineM)) {
          const inizioMinutes = inizioH * 60 + inizioM;
          let fineMinutes = fineH * 60 + fineM;

          if (fineMinutes < inizioMinutes) {
            fineMinutes += 24 * 60;
          }

          const minutiLavorati = fineMinutes - inizioMinutes;
          oreNum = minutiLavorati / 60;
        }
      }
    }

    let pausaMinutes = 0;
    if (formData.tempo_pausa === 'custom') {
      pausaMinutes = parseInt(customPausa) || 0;
    } else {
      pausaMinutes = parseInt(formData.tempo_pausa) || 0;
    }

    const effectiveHours = oreNum - (pausaMinutes / 60);
    return effectiveHours > 0 ? effectiveHours.toFixed(2) : '0.00';
  }, [modalitaCalcolo, formData.ore_lavorate, formData.orario_inizio, formData.orario_fine, formData.tempo_pausa, customPausa]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.commessa_id || !formData.data_rapportino) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (!commesseTeam.has(formData.commessa_id)) {
      toast.error('Non fai parte del team di questa commessa');
      return;
    }

    let oreNum = 0;

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
      if (!formData.orario_inizio || !formData.orario_fine) {
        toast.error('Inserisci orario di inizio e fine');
        return;
      }

      const [inizioH, inizioM] = formData.orario_inizio.split(':').map(Number);
      const [fineH, fineM] = formData.orario_fine.split(':').map(Number);

      const inizioMinutes = inizioH * 60 + inizioM;
      let fineMinutes = fineH * 60 + fineM;

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

      let tempoPausaMinutes = 60;
      if (formData.tempo_pausa === 'custom') {
        tempoPausaMinutes = parseInt(customPausa) || 0;
      } else {
        tempoPausaMinutes = parseInt(formData.tempo_pausa) || 60;
      }

      const oreLavorateEffettive = oreNum - (tempoPausaMinutes / 60);

      if (oreLavorateEffettive <= 0) {
        toast.error('Le ore lavorate (dopo la pausa) devono essere maggiori di 0');
        return;
      }

      const user_name = user.user_metadata?.full_name || null;
      const user_email = user.email || null;

      const rapportinoData: any = {
        tenant_id: tenantId,
        user_name,
        user_email,
        dipendente_id: dipendenteId,
        commessa_id: formData.commessa_id,
        data_rapportino: formData.data_rapportino,
        ore_lavorate: oreLavorateEffettive,
        tempo_pausa: tempoPausaMinutes,
        note: formData.note || null,
        allegato_url: null,
        created_by: user.id,
      };

      if (modalitaCalcolo === 'orari') {
        rapportinoData.orario_inizio = formData.orario_inizio;
        rapportinoData.orario_fine = formData.orario_fine;
      }

      const { error } = await supabase
        .from('rapportini')
        .insert(rapportinoData);

      if (error) {
        if (error.code === '23505') {
          toast.error('Hai già inserito un rapportino per questa commessa in questa data');
          return;
        } else {
          throw error;
        }
      }

      toast.success('Rapportino creato con successo');
      router.push('/mobile/presenze');
    } catch (error: any) {
      console.error('Error creating rapportino:', error);
      toast.error(error?.message || 'Errore nella creazione del rapportino');
    } finally {
      setLoading(false);
    }
  }, [formData, commesseTeam, modalitaCalcolo, customPausa, tenantId, dipendenteId, router]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  if (loadingData) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/mobile/presenze')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Nuovo Rapportino</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Commessa <span className="text-red-600">*</span>
          </Label>
          <Popover open={openCommessaCombobox} onOpenChange={setOpenCommessaCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCommessaCombobox}
                className="h-11 w-full justify-between bg-white border border-input"
              >
                <span className="flex items-center gap-2 truncate">
                  <Briefcase className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">
                    {formData.commessa_id
                      ? commesse.find((c) => c.id === formData.commessa_id)?.nome_commessa
                      : 'Seleziona commessa...'}
                  </span>
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cerca commessa..." />
                <CommandList>
                  <CommandEmpty>Nessuna commessa disponibile nel tuo team.</CommandEmpty>
                  <CommandGroup>
                    {commesse.map((commessa) => (
                      <CommandItem
                        key={commessa.id}
                        value={commessa.nome_commessa}
                        onSelect={() => {
                          handleFieldChange('commessa_id', commessa.id);
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
        </div>

        <div>
          <Label htmlFor="data_rapportino" className="text-sm font-medium text-gray-900 mb-2 block">
            Data Rapportino <span className="text-red-600">*</span>
          </Label>
          <Input
            id="data_rapportino"
            type="date"
            value={formData.data_rapportino}
            onChange={(e) => handleFieldChange('data_rapportino', e.target.value)}
            className="bg-white border border-input h-11"
            required
          />
        </div>

        {modalitaCalcolo === 'ore_totali' ? (
          <div>
            <Label htmlFor="ore_lavorate" className="text-sm font-medium text-gray-900 mb-2 block">
              Ore Lavorate <span className="text-red-600">*</span>
            </Label>
            <Input
              id="ore_lavorate"
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="8"
              value={formData.ore_lavorate}
              onChange={(e) => handleFieldChange('ore_lavorate', e.target.value)}
              className="bg-white border border-input h-11"
              required
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="orario_inizio" className="text-sm font-medium text-gray-900 mb-2 block">
                Orario Inizio <span className="text-red-600">*</span>
              </Label>
              <Input
                id="orario_inizio"
                type="time"
                value={formData.orario_inizio || ''}
                onChange={(e) => handleFieldChange('orario_inizio', e.target.value)}
                className="bg-white border border-input h-11"
                required
              />
            </div>

            <div>
              <Label htmlFor="orario_fine" className="text-sm font-medium text-gray-900 mb-2 block">
                Orario Fine <span className="text-red-600">*</span>
              </Label>
              <Input
                id="orario_fine"
                type="time"
                value={formData.orario_fine || ''}
                onChange={(e) => handleFieldChange('orario_fine', e.target.value)}
                className="bg-white border border-input h-11"
                required
              />
            </div>
          </div>
        )}

        <div>
          <Label className="text-sm font-medium text-gray-900 mb-2 block">
            Pausa
          </Label>
          <Select
            value={formData.tempo_pausa}
            onValueChange={(value) => handleFieldChange('tempo_pausa', value)}
          >
            <SelectTrigger className="bg-white border border-input h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 ora</SelectItem>
              <SelectItem value="90">1 ora e 30</SelectItem>
              <SelectItem value="0">Nessuna pausa</SelectItem>
              <SelectItem value="custom">Altro</SelectItem>
            </SelectContent>
          </Select>
          {formData.tempo_pausa === 'custom' && (
            <Input
              type="number"
              placeholder="Minuti"
              value={customPausa}
              onChange={(e) => setCustomPausa(e.target.value)}
              className="bg-white border border-input h-11 mt-2"
            />
          )}
        </div>

        <EffectiveHoursDisplay hours={calculateEffectiveHours} />

        <div>
          <Label htmlFor="note" className="text-sm font-medium text-gray-900 mb-2 block">Note</Label>
          <Textarea
            id="note"
            placeholder="Eventuali note sul rapportino..."
            value={formData.note}
            onChange={(e) => handleFieldChange('note', e.target.value)}
            className="bg-white border border-input resize-none"
            rows={4}
          />
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >
            {loading ? 'Creazione in corso...' : 'Crea Rapportino'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={loading}
            className="w-full h-12 font-semibold"
          >
            Reset Form
          </Button>
        </div>
      </form>
    </div>
  );
}
