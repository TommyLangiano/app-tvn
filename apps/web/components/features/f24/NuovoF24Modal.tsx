'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { F24 } from '@/types/f24';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  preselectedMonth?: number;
  preselectedYear?: number;
  existingF24?: F24 | null;
}

export function NuovoF24Modal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  preselectedMonth,
  preselectedYear,
  existingF24,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [calculatingHours, setCalculatingHours] = useState(false);

  const [importoF24, setImportoF24] = useState('');
  const [mese, setMese] = useState(preselectedMonth || new Date().getMonth() + 1);
  const [anno, setAnno] = useState(preselectedYear || new Date().getFullYear());
  const [note, setNote] = useState('');

  const [totaleOre, setTotaleOre] = useState<number>(0);
  const [numeroDipendenti, setNumeroDipendenti] = useState<number>(0);
  const [valoreOrario, setValoreOrario] = useState<number>(0);

  // Genera anni disponibili (solo anni passati e anno corrente)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Valida mese massimo se è l'anno corrente
  const currentMonth = new Date().getMonth() + 1;
  const maxMese = anno === currentYear ? currentMonth : 12;

  // Reset form quando apri/chiudi il modal
  useEffect(() => {
    if (isOpen) {
      if (existingF24) {
        // Modalità modifica - popola con dati esistenti
        setImportoF24(existingF24.importo_f24.toString());
        setMese(existingF24.mese);
        setAnno(existingF24.anno);
        setNote(existingF24.note || '');
        setTotaleOre(Number(existingF24.totale_ore_decimali));
        setNumeroDipendenti(existingF24.numero_dipendenti);
        setValoreOrario(Number(existingF24.valore_orario));
      } else {
        // Modalità creazione - usa mese/anno dal MonthNavigator
        setImportoF24('');
        setMese(preselectedMonth || new Date().getMonth() + 1);
        setAnno(preselectedYear || new Date().getFullYear());
        setNote('');
        setTotaleOre(0);
        setNumeroDipendenti(0);
        setValoreOrario(0);
      }
    }
  }, [isOpen, existingF24, preselectedMonth, preselectedYear]);

  // Calcola ore totali quando cambia mese/anno
  useEffect(() => {
    if (mese && anno) {
      calculateTotalHours();
    }
  }, [mese, anno]);

  // Calcola valore orario quando cambiano importo o ore
  useEffect(() => {
    if (importoF24 && totaleOre > 0) {
      const importo = parseFloat(importoF24);
      const valore = importo / totaleOre;
      setValoreOrario(valore);
    } else {
      setValoreOrario(0);
    }
  }, [importoF24, totaleOre]);

  const calculateTotalHours = async () => {
    if (!mese || !anno) return;

    setCalculatingHours(true);
    try {
      const supabase = createClient();

      // Calcola il primo giorno del mese successivo
      const dataInizio = new Date(anno, mese - 1, 1);
      const dataFine = new Date(anno, mese, 1);

      const dataInizioStr = dataInizio.toISOString().split('T')[0];
      const dataFineStr = dataFine.toISOString().split('T')[0];

      // Query per calcolare totale ore e numero dipendenti dal registro presenze (rapportini)
      const { data, error } = await supabase
        .from('rapportini')
        .select('ore_lavorate, dipendente_id')
        .eq('tenant_id', tenantId)
        .gte('data_rapportino', dataInizioStr)
        .lt('data_rapportino', dataFineStr);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calcola ore totali
        const totale = data.reduce((sum, r) => sum + Number(r.ore_lavorate), 0);
        setTotaleOre(totale);

        // Conta dipendenti unici
        const dipendentiUnici = new Set(data.map(r => r.dipendente_id)).size;
        setNumeroDipendenti(dipendentiUnici);
      } else {
        setTotaleOre(0);
        setNumeroDipendenti(0);
      }
    } catch (error) {
      console.error('Error calculating hours:', error);
      toast.error('Errore nel calcolo delle ore');
    } finally {
      setCalculatingHours(false);
    }
  };

  const handleSubmit = async () => {

    if (!importoF24 || parseFloat(importoF24) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    if (totaleOre <= 0) {
      toast.error('Nessuna ora lavorata trovata per questo periodo');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utente non autenticato');

      const importo = parseFloat(importoF24);

      if (existingF24) {
        // Update existing F24
        const { error: updateError } = await supabase
          .from('f24')
          .update({
            importo_f24: importo,
            totale_ore_decimali: totaleOre,
            numero_dipendenti: numeroDipendenti,
            valore_orario: valoreOrario,
            note: note || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingF24.id);

        if (updateError) throw updateError;

        // Ricalcola ripartizione
        await calcolaRipartizione(existingF24.id, valoreOrario);

        toast.success('F24 aggiornato con successo');
      } else {
        // Create new F24
        const { data: newF24, error: insertError } = await supabase
          .from('f24')
          .insert({
            tenant_id: tenantId,
            importo_f24: importo,
            mese,
            anno,
            totale_ore_decimali: totaleOre,
            numero_dipendenti: numeroDipendenti,
            valore_orario: valoreOrario,
            note: note || null,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Calcola ripartizione
        await calcolaRipartizione(newF24.id, valoreOrario);

        toast.success('F24 creato con successo');
      }

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error saving F24:', error);
      if (error.code === '23505') {
        toast.error('Esiste già un F24 per questo periodo');
      } else {
        toast.error('Errore nel salvataggio dell\'F24');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setImportoF24('');
    setMese(preselectedMonth || new Date().getMonth() + 1);
    setAnno(preselectedYear || new Date().getFullYear());
    setNote('');
    setTotaleOre(0);
    setNumeroDipendenti(0);
    setValoreOrario(0);
    onClose();
  };

  const calcolaRipartizione = async (f24Id: string, valoreOrario: number) => {
    const supabase = createClient();

    // Elimina vecchie ripartizioni
    await supabase
      .from('f24_dettaglio')
      .delete()
      .eq('f24_id', f24Id);

    // Calcola il primo giorno del mese successivo
    const dataInizio = new Date(anno, mese - 1, 1);
    const dataFine = new Date(anno, mese, 1);

    const dataInizioStr = dataInizio.toISOString().split('T')[0];
    const dataFineStr = dataFine.toISOString().split('T')[0];

    // Calcola ore per commessa
    const { data: rapportini, error } = await supabase
      .from('rapportini')
      .select('commessa_id, ore_lavorate, dipendente_id')
      .eq('tenant_id', tenantId)
      .gte('data_rapportino', dataInizioStr)
      .lt('data_rapportino', dataFineStr);

    if (error || !rapportini) throw error;

    // Raggruppa per commessa
    const commesseMap = new Map<string, { ore: number; dipendenti: Set<string> }>();

    rapportini.forEach(r => {
      if (!commesseMap.has(r.commessa_id)) {
        commesseMap.set(r.commessa_id, { ore: 0, dipendenti: new Set() });
      }
      const commessa = commesseMap.get(r.commessa_id)!;
      commessa.ore += Number(r.ore_lavorate);
      commessa.dipendenti.add(r.dipendente_id);
    });

    // Crea dettagli
    const dettagli = Array.from(commesseMap.entries()).map(([commessaId, data]) => ({
      f24_id: f24Id,
      tenant_id: tenantId,
      commessa_id: commessaId,
      ore_commessa: data.ore,
      numero_dipendenti_commessa: data.dipendenti.size,
      valore_f24_commessa: data.ore * valoreOrario,
    }));

    if (dettagli.length > 0) {
      const { error: insertError } = await supabase
        .from('f24_dettaglio')
        .insert(dettagli);

      if (insertError) throw insertError;
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h} ore`;
    return `${h} ore e ${m} min`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">{existingF24 ? 'Modifica' : 'Nuovo'} F24</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mese e Anno */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mese di Riferimento *</label>
              <Select
                value={String(mese)}
                onValueChange={(value) => setMese(Number(value))}
                disabled={loading || !!existingF24}
              >
                <SelectTrigger className="h-11 border-2 border-border bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESI.map((nome, index) => {
                    const meseNum = index + 1;
                    const isDisabled = anno === currentYear && meseNum > maxMese;
                    return (
                      <SelectItem
                        key={meseNum}
                        value={String(meseNum)}
                        disabled={isDisabled}
                      >
                        {nome}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anno *</label>
              <Select
                value={String(anno)}
                onValueChange={(value) => setAnno(Number(value))}
                disabled={loading || !!existingF24}
              >
                <SelectTrigger className="h-11 border-2 border-border bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calcolo Ore */}
          {calculatingHours && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-900">Calcolo ore in corso...</span>
            </div>
          )}

          {!calculatingHours && totaleOre > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-900">Totale Ore Lavorate:</span>
                <span className="text-2xl font-bold text-green-600">{formatHours(totaleOre)}</span>
              </div>
              <p className="text-sm text-green-800">
                {numeroDipendenti} {numeroDipendenti === 1 ? 'dipendente' : 'dipendenti'}
              </p>
              <p className="text-xs text-green-700 pt-2 border-t border-green-200">
                Calcolato automaticamente dai rapportini del periodo
              </p>
            </div>
          )}

          {!calculatingHours && totaleOre === 0 && mese && anno && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                Nessuna ora lavorata trovata per questo periodo
              </p>
            </div>
          )}

          {/* Importo F24 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Importo F24 (€) *</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={importoF24}
              onChange={(e) => setImportoF24(e.target.value)}
              placeholder="Es: 1000.00"
              className="h-11 border-2 border-border bg-white"
              disabled={loading || totaleOre === 0}
            />
            {importoF24 && valoreOrario > 0 && (
              <p className="text-sm text-muted-foreground">
                Valore orario: €{valoreOrario.toFixed(2)}/h
              </p>
            )}
          </div>

          {/* Valore Orario (calcolato) */}
          {valoreOrario > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">Valore Orario Calcolato:</span>
                <span className="text-2xl font-bold text-primary">
                  €{valoreOrario.toFixed(2)}/h
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {importoF24} € / {totaleOre.toFixed(2)} ore
              </p>
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Note</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note aggiuntive..."
              rows={3}
              className="resize-none border-2 border-border bg-white"
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !importoF24 || totaleOre === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvataggio...
              </>
            ) : (
              existingF24 ? 'Aggiorna F24' : 'Crea F24'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
