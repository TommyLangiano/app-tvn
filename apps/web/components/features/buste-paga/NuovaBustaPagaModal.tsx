'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Check, ChevronsUpDown } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CalcoloBustaPaga } from '@/types/busta-paga';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  matricola?: string;
}

interface NuovaBustaPagaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  preselectedMonth?: number;
  preselectedYear?: number;
}

export function NuovaBustaPagaModal({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  preselectedMonth,
  preselectedYear,
}: NuovaBustaPagaModalProps) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [openDipendenteCombo, setOpenDipendenteCombo] = useState(false);

  // Form fields
  const [selectedDipendenteId, setSelectedDipendenteId] = useState('');
  const [mese, setMese] = useState<number>(preselectedMonth ?? new Date().getMonth() + 1);
  const [anno, setAnno] = useState<number>(preselectedYear ?? new Date().getFullYear());
  const [importoTotale, setImportoTotale] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Calcolo ore
  const [calcoloOre, setCalcoloOre] = useState<CalcoloBustaPaga | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDipendenti();
    }
  }, [isOpen]);

  // Quando cambiano dipendente, mese o anno, ricalcola le ore
  useEffect(() => {
    if (selectedDipendenteId && mese && anno) {
      calcolaOreDipendente();
    } else {
      setCalcoloOre(null);
    }
  }, [selectedDipendenteId, mese, anno]);

  const loadDipendenti = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('dipendenti')
      .select('id, nome, cognome, matricola')
      .eq('tenant_id', tenantId)
      .eq('stato', 'attivo')
      .order('cognome', { ascending: true });

    if (error) {
      console.error('Error loading dipendenti:', error);
      toast.error('Errore nel caricamento dipendenti');
      return;
    }

    setDipendenti(data || []);
  };

  const calcolaOreDipendente = async () => {
    if (!selectedDipendenteId || !mese || !anno) return;

    setCalculating(true);
    try {
      const supabase = createClient();

      // Calcola le date di inizio e fine del mese
      const dataInizio = new Date(anno, mese - 1, 1);
      const dataFine = new Date(anno, mese, 0);

      // Query rapportini del dipendente per quel mese
      const { data: rapportini, error } = await supabase
        .from('rapportini')
        .select(`
          id,
          ore_lavorate,
          commessa_id,
          commesse (
            nome_commessa,
            codice_commessa
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('dipendente_id', selectedDipendenteId)
        .gte('data_rapportino', dataInizio.toISOString().split('T')[0])
        .lte('data_rapportino', dataFine.toISOString().split('T')[0])
        .eq('stato', 'approvato'); // Solo rapportini approvati

      if (error) {
        console.error('Error loading rapportini:', error);
        toast.error('Errore nel calcolo delle ore');
        return;
      }

      // Calcola ore totali e suddivisione per commessa
      const oreTotali = rapportini?.reduce((sum, r) => sum + Number(r.ore_lavorate), 0) || 0;

      // Raggruppa per commessa
      const commesseMap = new Map<string, { nome: string; codice?: string; ore: number }>();

      rapportini?.forEach(r => {
        const existing = commesseMap.get(r.commessa_id);
        if (existing) {
          existing.ore += Number(r.ore_lavorate);
        } else {
          commesseMap.set(r.commessa_id, {
            nome: (r.commesse as any)?.nome_commessa || '',
            codice: (r.commesse as any)?.codice_commessa,
            ore: Number(r.ore_lavorate),
          });
        }
      });

      const suddivisione = Array.from(commesseMap.entries()).map(([commessa_id, data]) => ({
        commessa_id,
        nome_commessa: data.nome,
        codice_commessa: data.codice,
        ore: data.ore,
      }));

      setCalcoloOre({
        dipendente_id: selectedDipendenteId,
        mese,
        anno,
        ore_totali: oreTotali,
        suddivisione_commesse: suddivisione,
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Valida dimensione (10MB max)
    if (selectedFile.size > 10485760) {
      toast.error('Il file è troppo grande. Massimo 10MB');
      return;
    }

    // Valida tipo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Tipo di file non supportato. Usa PDF o immagini');
      return;
    }

    setFile(selectedFile);
  };

  const uploadFile = async (bustaPagaId: string): Promise<string | null> => {
    if (!file) return null;

    try {
      const supabase = createClient();
      const filePath = `${tenantId}/buste-paga/${bustaPagaId}/${file.name}`;

      const { data, error } = await supabase.storage
        .from('app-storage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;
      return data.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    // Validazioni
    if (!selectedDipendenteId) {
      toast.error('Seleziona un dipendente');
      return;
    }

    if (!mese || !anno) {
      toast.error('Seleziona mese e anno');
      return;
    }

    const importo = parseFloat(importoTotale);
    if (isNaN(importo) || importo < 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    if (!calcoloOre || calcoloOre.ore_totali === 0) {
      toast.error('Il dipendente non ha ore registrate per questo mese');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Verifica che non esista già una busta paga per questo dipendente/mese/anno
      const { data: existing } = await supabase
        .from('buste_paga')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('dipendente_id', selectedDipendenteId)
        .eq('mese', mese)
        .eq('anno', anno)
        .single();

      if (existing) {
        toast.error('Esiste già una busta paga per questo dipendente in questo mese');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 2. Calcola costo orario
      const costoOrario = importo / calcoloOre.ore_totali;

      // 3. Crea la busta paga
      const { data: bustaPaga, error: bustaPagaError } = await supabase
        .from('buste_paga')
        .insert({
          tenant_id: tenantId,
          dipendente_id: selectedDipendenteId,
          mese,
          anno,
          importo_totale: importo,
          ore_totali: calcoloOre.ore_totali,
          costo_orario: costoOrario,
          note: note || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (bustaPagaError) throw bustaPagaError;

      // 4. Carica file se presente
      let allegatoUrl = null;
      if (file) {
        allegatoUrl = await uploadFile(bustaPaga.id);
        if (allegatoUrl) {
          await supabase
            .from('buste_paga')
            .update({ allegato_url: allegatoUrl })
            .eq('id', bustaPaga.id);
        }
      }

      // 5. Crea i dettagli per ogni commessa
      const dettagli = calcoloOre.suddivisione_commesse.map(commessa => ({
        busta_paga_id: bustaPaga.id,
        tenant_id: tenantId,
        commessa_id: commessa.commessa_id,
        ore_commessa: commessa.ore,
        importo_commessa: costoOrario * commessa.ore,
      }));

      if (dettagli.length > 0) {
        const { error: dettagliError } = await supabase
          .from('buste_paga_dettaglio')
          .insert(dettagli);

        if (dettagliError) throw dettagliError;
      }

      toast.success('Busta paga creata con successo');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating busta paga:', error);
      toast.error('Errore nella creazione della busta paga');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDipendenteId('');
    setMese(preselectedMonth ?? new Date().getMonth() + 1);
    setAnno(preselectedYear ?? new Date().getFullYear());
    setImportoTotale('');
    setNote('');
    setFile(null);
    setCalcoloOre(null);
    onClose();
  };

  // Genera anni disponibili (solo anni passati e anno corrente)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

  // Valida mese massimo se è l'anno corrente
  const currentMonth = new Date().getMonth() + 1;
  const maxMese = anno === currentYear ? currentMonth : 12;

  if (!isOpen) return null;

  const selectedDipendente = dipendenti.find(d => d.id === selectedDipendenteId);
  const getDipendenteDisplayName = (dip: Dipendente) => {
    const nome = `${dip.cognome} ${dip.nome}`;
    return dip.matricola ? `${nome} (${dip.matricola})` : nome;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">Nuova Busta Paga</h2>
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
          {/* Dipendente */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dipendente *</label>
            <Popover open={openDipendenteCombo} onOpenChange={setOpenDipendenteCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openDipendenteCombo}
                  className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                  disabled={loading}
                >
                  {selectedDipendente
                    ? getDipendenteDisplayName(selectedDipendente)
                    : "Seleziona dipendente..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Cerca dipendente..." />
                  <CommandEmpty>Nessun dipendente trovato</CommandEmpty>
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {dipendenti.map((dip) => (
                      <CommandItem
                        key={dip.id}
                        value={getDipendenteDisplayName(dip)}
                        onSelect={() => {
                          setSelectedDipendenteId(dip.id);
                          setOpenDipendenteCombo(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedDipendenteId === dip.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {getDipendenteDisplayName(dip)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Mese e Anno */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mese *</label>
              <Select
                value={String(mese)}
                onValueChange={(value) => setMese(Number(value))}
                disabled={loading}
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
                disabled={loading}
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
          {calculating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-900">Calcolo ore in corso...</span>
            </div>
          )}

          {calcoloOre && !calculating && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-green-900">Totale Ore:</span>
                <span className="text-2xl font-bold text-green-600">{calcoloOre.ore_totali.toFixed(2)} h</span>
              </div>

              {calcoloOre.suddivisione_commesse.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-green-200">
                  <span className="text-sm font-medium text-green-900">Suddivisione per commessa:</span>
                  {calcoloOre.suddivisione_commesse.map((commessa) => (
                    <div key={commessa.commessa_id} className="flex items-center justify-between text-sm">
                      <span className="text-green-800">
                        {commessa.nome_commessa}
                        {commessa.codice_commessa && ` (${commessa.codice_commessa})`}
                      </span>
                      <span className="font-semibold text-green-600">{commessa.ore.toFixed(2)} h</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedDipendenteId && mese && anno && !calculating && calcoloOre?.ore_totali === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                Il dipendente non ha ore registrate per questo mese
              </p>
            </div>
          )}

          {/* Importo Totale */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Importo Totale Busta Paga (€) *</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={importoTotale}
              onChange={(e) => setImportoTotale(e.target.value)}
              placeholder="Es: 2000.00"
              className="h-11 border-2 border-border bg-white"
              disabled={loading || !calcoloOre || calcoloOre.ore_totali === 0}
            />
            {importoTotale && calcoloOre && calcoloOre.ore_totali > 0 && (
              <p className="text-sm text-muted-foreground">
                Costo orario: €{(parseFloat(importoTotale) / calcoloOre.ore_totali).toFixed(2)}/h
              </p>
            )}
          </div>

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

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Allegato</label>
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={loading}
                />
                <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : 'Carica file (PDF o immagine)'}
                  </span>
                </div>
              </label>
              {file && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
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
            disabled={loading || !selectedDipendenteId || !importoTotale || !calcoloOre || calcoloOre.ore_totali === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creazione...
              </>
            ) : (
              'Crea Busta Paga'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
