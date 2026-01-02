'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { RiepilogoEconomicoChart } from '@/app/(app)/report/components/charts/RiepilogoEconomicoChart';
import { PeriodFilter, type PeriodType } from '@/app/(app)/report/azienda/components/PeriodFilter';
import { getDateRangeFromPeriod, type DateRange } from '@/app/(app)/report/azienda/utils/dateFilters';

interface RiepilogoEconomicoData {
  fatturatoPrevisto: number;
  fatturatoEmesso: number;
  costiTotali: number;
  noteSpesa: number;
  utileLordo: number;
  saldoIva: number;
}

interface CommessaReportTabProps {
  commessaId: string;
  commessa: any;
  fattureAttive: any[];
  fatturePassive: any[];
  noteSpese: any[];
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

export function CommessaReportTab({ commessaId, commessa, fattureAttive, fatturePassive, noteSpese }: CommessaReportTabProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('oggi');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dateRange, setDateRange] = useState<DateRange>(() => getDateRangeFromPeriod('oggi'));

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

  // Calcolo dati usando useMemo per prestazioni istantanee
  const riepilogoData = useMemo(() => {
    // Formatta le date per confronto
    const dateFrom = format(dateRange.from, 'yyyy-MM-dd');
    const dateTo = format(dateRange.to, 'yyyy-MM-dd');

    console.log('🔍 DEBUG Report - Range date:', { dateFrom, dateTo });
    console.log('🔍 DEBUG Report - Totale fatture attive:', fattureAttive.length);
    console.log('🔍 DEBUG Report - Totale fatture passive:', fatturePassive.length);

    // Filtra fatture attive per data
    const fattureAttiveFiltrate = fattureAttive.filter(f => {
      const inRange = f.data_fattura >= dateFrom && f.data_fattura <= dateTo;
      if (!inRange) {
        console.log('❌ Fattura attiva esclusa:', f.numero_fattura, 'data:', f.data_fattura);
      }
      return inRange;
    });

    // Filtra fatture passive per data
    const fatturePassiveFiltrate = fatturePassive.filter(f => {
      const inRange = f.data_fattura >= dateFrom && f.data_fattura <= dateTo;
      if (!inRange) {
        console.log('❌ Fattura passiva esclusa:', f.numero_fattura, 'data:', f.data_fattura);
      }
      return inRange;
    });

    console.log('✅ Fatture attive filtrate:', fattureAttiveFiltrate.length);
    console.log('✅ Fatture passive filtrate:', fatturePassiveFiltrate.length);

    // Filtra note spese per data (solo approvate)
    const noteSpeseApprovate = noteSpese.filter(n => {
      return n.stato === 'approvato' && n.data_nota >= dateFrom && n.data_nota <= dateTo;
    });

    // Calcola i totali usando helper ottimizzati
    const fatturatoPrevisto = commessa?.importo_commessa || commessa?.budget_commessa || 0;
    const fatturatoEmesso = sumImponibili(fattureAttiveFiltrate);
    const costiTotali = sumImponibili(fatturePassiveFiltrate);
    const totaleNoteSpesa = sumImporti(noteSpeseApprovate);
    const utileLordo = fatturatoEmesso - costiTotali - totaleNoteSpesa;

    // Calcola saldo IVA (IVA ricavi - IVA costi)
    const ivaFatturePassive = sumIva(fatturePassiveFiltrate);
    const ivaFattureAttive = sumIva(fattureAttiveFiltrate);
    const saldoIva = ivaFattureAttive - ivaFatturePassive;

    console.log('💰 IVA Fatture Attive:', ivaFattureAttive);
    console.log('💰 IVA Fatture Passive:', ivaFatturePassive);
    console.log('💰 SALDO IVA (Attive - Passive):', saldoIva);

    return {
      fatturatoPrevisto,
      fatturatoEmesso,
      costiTotali,
      noteSpesa: totaleNoteSpesa,
      utileLordo,
      saldoIva,
    };
  }, [dateRange, commessa, fattureAttive, fatturePassive, noteSpese]);

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
