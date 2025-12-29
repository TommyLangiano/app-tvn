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
  fatturatoEmesso: number;
  costiTotali: number;
  noteSpesa: number;
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
    fatturatoEmesso: 0,
    costiTotali: 0,
    noteSpesa: 0,
    utileLordo: 0,
    saldoIva: 0,
  });

  // Gestione cambio periodo
  const handlePeriodChange = useCallback((period: PeriodType) => {
    setSelectedPeriod(period);
    const newRange = getDateRangeFromPeriod(period, selectedYear);
    setDateRange(newRange);
  }, [selectedYear]);

  // Gestione cambio anno - filtra i dati per l'anno selezionato
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
    // Mostra sempre l'anno selezionato (1 gen - 31 dic)
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
      const [
        { data: fattureAttive },
        { data: fatturePassive },
        { data: noteSpesa }
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
          .gte('data_nota', dateFrom)
          .lte('data_nota', dateTo)
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

      const utileLordo = fatturatoEmesso - costiTotali - totaleNoteSpesa;

      // Calcola saldo IVA (riutilizza i dati già fetchati)
      const ivaFatturePassive = sumIva(fatturePassive);
      const ivaFattureAttive = sumIva(fattureAttive);
      const saldoIva = ivaFatturePassive - ivaFattureAttive;

      setRiepilogoData({
        fatturatoPrevisto,
        fatturatoEmesso,
        costiTotali,
        noteSpesa: totaleNoteSpesa,
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

  // Effetto per ricaricare i dati quando cambia il dateRange
  useEffect(() => {
    loadRiepilogoEconomico(dateRange);
  }, [dateRange, loadRiepilogoEconomico]);

  return (
    <div className="space-y-6">
      {/* Header e Chart in un unico container */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Report Aziendale</h1>
        </div>

        {/* Filtri Periodo */}
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          selectedYear={selectedYear}
          onPeriodChange={handlePeriodChange}
          onYearChange={handleYearChange}
        />

        {/* Riepilogo Economico Chart */}
        <RiepilogoEconomicoChart data={riepilogoData} loading={loading} />
      </div>
    </div>
  );
}
