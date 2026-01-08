'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Briefcase, Calendar, Clock } from 'lucide-react';
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
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMobileData } from '@/contexts/MobileDataContext';

type Commessa = {
  id: string;
  nome_commessa: string;
  codice_commessa?: string;
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

export default function NuovoRapportinoMobilePage() {
  const router = useRouter();
  const { dipendente, refreshData } = useMobileData();

  // Form data
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [modalitaCalcolo, setModalitaCalcolo] = useState<'ore_totali' | 'orari'>('ore_totali');
  const [customPausa, setCustomPausa] = useState('');

  // Dropdown data
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [commesseTeam, setCommesseTeam] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = useCallback(async () => {
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

      // Carica modalità calcolo
      const { data: tenant } = await supabase
        .from('tenants')
        .select('modalita_calcolo_rapportini')
        .eq('id', userTenants.tenant_id)
        .single();

      if (tenant) {
        setModalitaCalcolo(tenant.modalita_calcolo_rapportini || 'ore_totali');
      }

      // Carica solo le commesse del team del dipendente
      if (dipendente?.id) {
        const { data: teamData } = await supabase
          .from('commesse_team')
          .select(`
            commessa_id,
            commesse!commesse_team_commessa_id_fkey (
              id,
              nome_commessa,
              codice_commessa
            )
          `)
          .eq('tenant_id', userTenants.tenant_id)
          .eq('dipendente_id', dipendente.id);

        if (teamData) {
          const availableCommesseIds = new Set(teamData.map((t: any) => t.commessa_id));
          setCommesseTeam(availableCommesseIds);

          const commesseList = teamData
            .filter((ct: any) => ct.commesse)
            .map((ct: any) => ({
              id: ct.commesse.id,
              nome_commessa: ct.commesse.nome_commessa,
              codice_commessa: ct.commesse.codice_commessa,
            }));
          setCommesse(commesseList);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [dipendente?.id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dipendente?.id) {
      toast.error('Dati dipendente non disponibili');
      return;
    }

    // Validazione
    if (!formData.commessa_id) {
      toast.error('Seleziona una commessa');
      return;
    }

    if (!formData.data_rapportino) {
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

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) throw new Error('No tenant found');

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

      // Verifica se la commessa ha approvazione presenze abilitata
      const { data: impostazioniApprovazione } = await supabase
        .from('commesse_impostazioni_approvazione')
        .select('abilitato')
        .eq('commessa_id', formData.commessa_id)
        .eq('tipo_approvazione', 'presenze')
        .single();

      const statoIniziale = impostazioniApprovazione?.abilitato ? 'da_approvare' : 'approvato';

      const rapportinoData: any = {
        tenant_id: userTenants.tenant_id,
        user_name,
        user_email,
        dipendente_id: dipendente.id,
        commessa_id: formData.commessa_id,
        data_rapportino: formData.data_rapportino,
        ore_lavorate: oreLavorateEffettive,
        tempo_pausa: tempoPausaMinutes,
        note: formData.note || null,
        allegato_url: null,
        stato: statoIniziale,
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

      if (statoIniziale === 'approvato') {
        toast.success('Presenza registrata e approvata automaticamente');
      } else {
        toast.success('Presenza registrata in attesa di approvazione');
      }

      await refreshData();
      router.push('/mobile/presenze');
    } catch (error: any) {
      console.error('Error creating rapportino:', error);
      toast.error(error?.message || 'Errore nella creazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header verde */}
      <div className="bg-emerald-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mobile/presenze" prefetch={true}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <ArrowLeft className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            </button>
          </Link>
          <h1 className="text-xl font-bold">Nuova Presenza</h1>
        </div>
      </div>

      {/* Form container */}
      <div className="relative z-10" style={{ marginTop: '-40px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Commessa */}
            <div className="space-y-2">
              <Label htmlFor="commessa" className="text-sm font-semibold text-gray-900">
                Commessa <span className="text-red-600">*</span>
              </Label>
              <Select value={formData.commessa_id} onValueChange={(value) => setFormData({ ...formData, commessa_id: value })}>
                <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl bg-white">
                  <SelectValue placeholder="Seleziona commessa..." />
                </SelectTrigger>
                <SelectContent>
                  {commesse.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-gray-500">
                      Nessuna commessa assegnata
                    </div>
                  ) : (
                    commesse.map((commessa) => (
                      <SelectItem key={commessa.id} value={commessa.id}>
                        {commessa.codice_commessa ? `${commessa.codice_commessa} - ` : ''}
                        {commessa.nome_commessa}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Data Rapportino */}
            <div className="space-y-2">
              <Label htmlFor="data_rapportino" className="text-sm font-semibold text-gray-900">
                Data <span className="text-red-600">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <Input
                  id="data_rapportino"
                  type="date"
                  value={formData.data_rapportino}
                  onChange={(e) => setFormData({ ...formData, data_rapportino: e.target.value })}
                  className="h-12 border-2 border-gray-200 rounded-xl bg-white pl-10"
                  required
                />
              </div>
            </div>

            {/* Ore Lavorate o Orari */}
            {modalitaCalcolo === 'ore_totali' ? (
              <div className="space-y-2">
                <Label htmlFor="ore_lavorate" className="text-sm font-semibold text-gray-900">
                  Ore Lavorate <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input
                    id="ore_lavorate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    placeholder="8"
                    value={formData.ore_lavorate}
                    onChange={(e) => setFormData({ ...formData, ore_lavorate: e.target.value })}
                    className="h-12 border-2 border-gray-200 rounded-xl bg-white pl-10 text-base"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Orario Inizio */}
                <div className="space-y-2">
                  <Label htmlFor="orario_inizio" className="text-sm font-semibold text-gray-900">
                    Inizio <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="orario_inizio"
                    type="time"
                    value={formData.orario_inizio}
                    onChange={(e) => setFormData({ ...formData, orario_inizio: e.target.value })}
                    className="h-12 border-2 border-gray-200 rounded-xl bg-white"
                    required
                  />
                </div>

                {/* Orario Fine */}
                <div className="space-y-2">
                  <Label htmlFor="orario_fine" className="text-sm font-semibold text-gray-900">
                    Fine <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="orario_fine"
                    type="time"
                    value={formData.orario_fine}
                    onChange={(e) => setFormData({ ...formData, orario_fine: e.target.value })}
                    className="h-12 border-2 border-gray-200 rounded-xl bg-white"
                    required
                  />
                </div>
              </div>
            )}

            {/* Pausa */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                Pausa
              </Label>
              <Select
                value={formData.tempo_pausa}
                onValueChange={(value) => setFormData({ ...formData, tempo_pausa: value })}
              >
                <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl bg-white">
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
                  className="h-12 border-2 border-gray-200 rounded-xl bg-white mt-2"
                />
              )}
            </div>

            {/* Ore Effettive */}
            <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Ore Effettive</span>
                <span className="text-2xl font-bold text-emerald-600">{calculateEffectiveHours}h</span>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note" className="text-sm font-semibold text-gray-900">
                Note <span className="text-gray-400 font-normal">(opzionale)</span>
              </Label>
              <Textarea
                id="note"
                placeholder="Eventuali note sul rapportino..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="border-2 border-gray-200 rounded-xl bg-white resize-none min-h-[100px]"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Creazione in corso...' : 'Crea Presenza'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
