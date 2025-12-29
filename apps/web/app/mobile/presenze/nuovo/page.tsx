'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MobileRapportiniPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dipendenteId, setDipendenteId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');

  // Form state
  const [commessaId, setCommessaId] = useState('');
  const [dataRapportino, setDataRapportino] = useState(new Date().toISOString().split('T')[0]);
  const [oreLavorate, setOreLavorate] = useState('');
  const [orarioInizio, setOrarioInizio] = useState('');
  const [orarioFine, setOrarioFine] = useState('');
  const [tempoPausa, setTempoPausa] = useState('60');
  const [note, setNote] = useState('');

  const [commesse, setCommesse] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get dipendente
      const { data: dipendente } = await supabase
        .from('dipendenti')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!dipendente) {
        toast.error('Errore: dipendente non trovato');
        return;
      }

      setDipendenteId(dipendente.id);
      setTenantId(dipendente.tenant_id);

      // Get commesse attive
      const { data: commesseData } = await supabase
        .from('commesse')
        .select('id, nome_commessa, cliente_commessa')
        .eq('tenant_id', dipendente.tenant_id)
        .eq('archiviata', false)
        .order('nome_commessa');

      setCommesse(commesseData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento dei dati');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commessaId) {
      toast.error('Seleziona una commessa');
      return;
    }

    if (!oreLavorate || parseFloat(oreLavorate) <= 0) {
      toast.error('Inserisci le ore lavorate');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Validate dipendente_id exists
      if (!dipendenteId) {
        toast.error('Errore: dipendente non trovato. Riprova.');
        return;
      }

      // Check if this specific commessa requires approval for presenze
      const { data: approvalSettings } = await supabase
        .from('commesse_impostazioni_approvazione')
        .select('abilitato')
        .eq('commessa_id', commessaId)
        .eq('tipo_approvazione', 'presenze')
        .maybeSingle();

      // Determine stato based on commessa-specific approval settings
      const richiedeApprovazioneCommessa = approvalSettings?.abilitato || false;
      const stato = richiedeApprovazioneCommessa ? 'da_approvare' : 'approvato';

      const insertData = {
        tenant_id: tenantId,
        dipendente_id: dipendenteId,
        commessa_id: commessaId,
        data_rapportino: dataRapportino,
        ore_lavorate: parseFloat(oreLavorate),
        orario_inizio: orarioInizio || null,
        orario_fine: orarioFine || null,
        tempo_pausa: tempoPausa ? parseInt(tempoPausa) : 60,
        note: note || null,
        stato,
        created_by: user.id,
      };

      console.log('Inserting rapportino:', insertData);

      const { error } = await supabase
        .from('rapportini')
        .insert(insertData);

      if (error) throw error;

      if (richiedeApprovazioneCommessa) {
        toast.success('Rapportino inviato! In attesa di approvazione.');
      } else {
        toast.success('Rapportino registrato con successo!');
      }

      // Reset form
      setCommessaId('');
      setDataRapportino(new Date().toISOString().split('T')[0]);
      setOreLavorate('');
      setOrarioInizio('');
      setOrarioFine('');
      setTempoPausa('60');
      setNote('');

      // Redirect to presenze
      router.push('/mobile/presenze');
    } catch (error: any) {
      console.error('Error creating rapportino:', error);

      // Check for duplicate constraint violation
      if (error?.code === '23505' || error?.message?.includes('rapportini_dipendente_unique')) {
        toast.error('Hai già inserito un rapportino per questa commessa in questa data');
      } else {
        toast.error('Errore durante il salvataggio');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inserisci Ore</h1>
        <p className="text-sm text-gray-500 mt-1">Registra le tue ore di lavoro</p>
      </div>

      {/* Info Alert - Will be shown based on selected commessa */}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Commessa */}
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Commessa *</Label>
          <Select value={commessaId} onValueChange={setCommessaId}>
            <SelectTrigger className="h-12 border-2">
              <SelectValue placeholder="Seleziona commessa" />
            </SelectTrigger>
            <SelectContent>
              {commesse.map((commessa) => (
                <SelectItem key={commessa.id} value={commessa.id}>
                  <div className="py-1">
                    <p className="font-medium">{commessa.nome_commessa}</p>
                    <p className="text-xs text-gray-500">{commessa.cliente_commessa}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Data */}
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Data *
          </Label>
          <Input
            type="date"
            value={dataRapportino}
            onChange={(e) => setDataRapportino(e.target.value)}
            className="h-12 border-2"
            max={new Date().toISOString().split('T')[0]}
            required
          />
        </Card>

        {/* Ore Lavorate */}
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Ore Lavorate *
          </Label>
          <Input
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            value={oreLavorate}
            onChange={(e) => setOreLavorate(e.target.value)}
            className="h-12 border-2 text-lg"
            placeholder="8"
            required
          />
        </Card>

        {/* Orari (Opzionali) */}
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Orari (opzionale)</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Inizio</Label>
              <Input
                type="time"
                value={orarioInizio}
                onChange={(e) => setOrarioInizio(e.target.value)}
                className="h-11 border-2"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Fine</Label>
              <Input
                type="time"
                value={orarioFine}
                onChange={(e) => setOrarioFine(e.target.value)}
                className="h-11 border-2"
              />
            </div>
          </div>
        </Card>

        {/* Pausa */}
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Pausa (minuti)</Label>
          <Input
            type="number"
            min="0"
            max="480"
            value={tempoPausa}
            onChange={(e) => setTempoPausa(e.target.value)}
            className="h-12 border-2"
            placeholder="60"
          />
        </Card>

        {/* Note */}
        <Card className="p-4 space-y-3">
          <Label className="text-base font-semibold">Note (opzionale)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px] border-2 resize-none"
            placeholder="Aggiungi eventuali note sul lavoro svolto..."
          />
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700"
        >
          {loading ? 'Salvataggio...' : 'Salva Rapportino'}
        </Button>
      </form>
    </div>
  );
}
