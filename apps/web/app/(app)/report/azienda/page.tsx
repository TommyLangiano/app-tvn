'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { RiepilogoEconomicoChart } from '../components/charts/RiepilogoEconomicoChart';
import { PeriodFilter, type PeriodType } from './components/PeriodFilter';
import { getDateRangeFromPeriod, type DateRange } from './utils/dateFilters';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface RiepilogoEconomicoData {
  fatturatoPrevisto: number;
  imponibileRicavi: number;
  imponibileCostiFatture: number;
  costiBustePaga: number;
  costiF24: number;
  noteSpesaApprovate: number;
  utileLordo: number;
  saldoIva: number;
}

// Helper ottimizzato per ridurre operazioni di reduce
const sumImponibili = (items: any[] | null): number => {
  if (!items?.length) return 0;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].importo_imponibile || 0;
  }
  return sum;
};

const sumIva = (items: any[] | null): number => {
  if (!items?.length) return 0;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].importo_iva || 0;
  }
  return sum;
};

const sumImporti = (items: any[] | null): number => {
  if (!items?.length) return 0;
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].importo || 0;
  }
  return sum;
};

export default function ReportAziendaPage() {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('oggi');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPeriod('oggi'));
  const [riepilogoData, setRiepilogoData] = useState<RiepilogoEconomicoData>({
    fatturatoPrevisto: 0,
    imponibileRicavi: 0,
    imponibileCostiFatture: 0,
    costiBustePaga: 0,
    costiF24: 0,
    noteSpesaApprovate: 0,
    utileLordo: 0,
    saldoIva: 0,
  });

  // Gestione cambio periodo
  const handlePeriodChange = useCallback((period: PeriodType) => {
    setSelectedPeriod(period);
    setSelectedYear(new Date().getFullYear()); // Reset anno corrente
    const newRange = getDateRangeFromPeriod(period);
    setDateRange(newRange);
  }, []);

  // Gestione cambio anno - mostra tutto l'anno selezionato
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    setSelectedPeriod('oggi'); // Reset periodo
    // Mostra sempre l'anno completo (1 gen - 31 dic)
    const newRange = {
      from: new Date(year, 0, 1), // 1 gennaio
      to: new Date(year, 11, 31, 23, 59, 59), // 31 dicembre
    };
    setDateRange(newRange);
  }, []);

  // Memoizza la funzione di caricamento per evitare ricreazioni
  const loadRiepilogoEconomico = useCallback(async (range: DateRange) => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Utente non autenticato');
        return;
      }

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenant?.tenant_id) {
        toast.error('Tenant non trovato');
        return;
      }

      const tenantId = userTenant.tenant_id;

      // Formatta le date per Supabase
      const dateFrom = format(range.from, 'yyyy-MM-dd');
      const dateTo = format(range.to, 'yyyy-MM-dd');

      // Fetch commesse per calcolare fatturato previsto - filtrate per data_inizio
      const { data: commesse } = await supabase
        .from('commesse')
        .select('id, importo_commessa, budget_commessa, data_inizio')
        .eq('tenant_id', tenantId)
        .gte('data_inizio', dateFrom)
        .lte('data_inizio', dateTo);

      const commessaIds = (commesse || []).map(c => c.id);

      // Ottimizzazione: esegui tutte le query in parallelo con filtri di data
      // Note: solo note_spesa hanno sistema approvazione (stato: approvato/da_approvare/rifiutato)
      const [
        { data: fattureAttive },
        { data: fatturePassive },
        { data: noteSpesa },
        { data: bustePagaDettaglio },
        { data: f24Dettaglio }
      ] = await Promise.all([
        supabase
          .from('fatture_attive')
          .select('importo_imponibile, importo_iva')
          .in('commessa_id', commessaIds)
          .gte('data_fattura', dateFrom)
          .lte('data_fattura', dateTo),
        supabase
          .from('fatture_passive')
          .select('importo_imponibile, importo_iva')
          .in('commessa_id', commessaIds)
          .gte('data_fattura', dateFrom)
          .lte('data_fattura', dateTo),
        supabase
          .from('note_spesa')
          .select('importo')
          .in('commessa_id', commessaIds)
          .eq('stato', 'approvato')
          .gte('data_nota', dateFrom)
          .lte('data_nota', dateTo),
        supabase
          .from('buste_paga_dettaglio')
          .select(`
            importo_commessa,
            buste_paga (
              mese,
              anno
            )
          `)
          .in('commessa_id', commessaIds),
        supabase
          .from('f24_dettaglio')
          .select(`
            valore_f24_commessa,
            f24 (
              mese,
              anno
            )
          `)
          .in('commessa_id', commessaIds)
      ]);

      // Calcola i totali usando helper ottimizzati
      let fatturatoPrevisto = 0;
      if (commesse?.length) {
        for (let i = 0; i < commesse.length; i++) {
          fatturatoPrevisto += commesse[i].importo_commessa || commesse[i].budget_commessa || 0;
        }
      }

      const fatturatoEmesso = sumImponibili(fattureAttive);
      const costiTotali = sumImponibili(fatturePassive);
      const totaleNoteSpesa = sumImporti(noteSpesa);

      // Filtra e calcola buste paga per date range
      const bustePagaFiltrate = (bustePagaDettaglio || []).filter((dettaglio: any) => {
        if (!dettaglio.buste_paga) return false;
        const { mese, anno } = dettaglio.buste_paga;
        const bustaPagaDate = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return bustaPagaDate >= dateFrom && bustaPagaDate <= dateTo;
      });

      const totaleBustePaga = bustePagaFiltrate.reduce((sum: number, d: any) => {
        return sum + (Number(d.importo_commessa) || 0);
      }, 0);

      // Filtra e calcola F24 per date range
      const f24Filtrate = (f24Dettaglio || []).filter((dettaglio: any) => {
        if (!dettaglio.f24) return false;
        const { mese, anno } = dettaglio.f24;
        const f24Date = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return f24Date >= dateFrom && f24Date <= dateTo;
      });

      const totaleF24 = f24Filtrate.reduce((sum: number, d: any) => {
        return sum + (Number(d.valore_f24_commessa) || 0);
      }, 0);

      const utileLordo = fatturatoEmesso - costiTotali - totaleBustePaga - totaleF24 - totaleNoteSpesa;

      // Calcola saldo IVA (IVA ricavi - IVA costi)
      const ivaFatturePassive = sumIva(fatturePassive);
      const ivaFattureAttive = sumIva(fattureAttive);
      const saldoIva = ivaFattureAttive - ivaFatturePassive;

      setRiepilogoData({
        fatturatoPrevisto,
        imponibileRicavi: fatturatoEmesso,
        imponibileCostiFatture: costiTotali,
        costiBustePaga: totaleBustePaga,
        costiF24: totaleF24,
        noteSpesaApprovate: totaleNoteSpesa,
        utileLordo,
        saldoIva,
      });
    } catch (error) {
      console.error('Error loading riepilogo economico:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, []); // Nessuna dipendenza esterna, funzione stabile

  // Effetto per aggiornare automaticamente il dateRange quando cambia l'anno corrente
  useEffect(() => {
    // Solo se siamo su "anno corrente"
    if (selectedPeriod === 'oggi' && selectedYear === new Date().getFullYear()) {
      // Controlla ogni ora se la data è cambiata
      const interval = setInterval(() => {
        const currentYear = new Date().getFullYear();

        // Se l'anno è cambiato, aggiorna il range
        if (currentYear !== selectedYear) {
          setSelectedYear(currentYear);
          const newRange = getDateRangeFromPeriod('oggi');
          setDateRange(newRange);
        }
      }, 60 * 60 * 1000); // Controlla ogni ora

      return () => clearInterval(interval);
    }
  }, [selectedPeriod, selectedYear]);

  // Effetto per ricaricare i dati quando cambia il dateRange
  useEffect(() => {
    loadRiepilogoEconomico(dateRange);
  }, [dateRange, loadRiepilogoEconomico]);

  return (
    <div className="space-y-6">
      {/* Header e Chart in un unico container */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Header con titolo e filtri sulla stessa riga */}
        <div className="px-6 pt-6 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Riepilogo Economico</h1>

            {/* Filtri Periodo */}
            <PeriodFilter
              selectedPeriod={selectedPeriod}
              selectedYear={selectedYear}
              onPeriodChange={handlePeriodChange}
              onYearChange={handleYearChange}
            />
          </div>
        </div>

        {/* Linea divisoria */}
        <div className="border-b border-border"></div>

        {/* Riepilogo Economico Chart */}
        <div className="p-6">
          <RiepilogoEconomicoChart data={riepilogoData} />
        </div>
      </div>
    </div>
  );
}
