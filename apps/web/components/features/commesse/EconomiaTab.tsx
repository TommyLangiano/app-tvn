'use client';

import { useState, useMemo } from 'react';
import { Receipt, TrendingUp, TrendingDown, FileText, Banknote, FileStack } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { EconomiaPersonaleTab } from './EconomiaPersonaleTab';
import { FattureTab } from './FattureTab';

interface RiepilogoEconomico {
  ricavi_imponibile: number;
  ricavi_iva: number;
  ricavi_totali: number;
  costi_imponibile: number;
  costi_iva: number;
  costi_totali: number;
  costi_buste_paga?: number;
  costi_f24?: number;
  margine_lordo: number;
  saldo_iva: number;
}

interface EconomiaTabProps {
  commessaId: string;
  fattureAttive: any[];
  fatturePassive: any[];
  riepilogo?: RiepilogoEconomico | null;
  bustePagaDettaglio: any[];
  f24Dettaglio: any[];
  onReload?: () => void;
}

type SubTab = 'fatture' | 'personale' | 'altro';

export function EconomiaTab({
  commessaId,
  fattureAttive,
  fatturePassive,
  riepilogo,
  bustePagaDettaglio,
  f24Dettaglio,
  onReload
}: EconomiaTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('fatture');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Calcola riepilogo filtrato per date
  const riepilogoFiltrato = useMemo(() => {
    // Filtra fatture attive per date (se presenti)
    const fattureAttiveFiltrate = dateFrom && dateTo
      ? fattureAttive.filter(f => f.data_fattura >= dateFrom && f.data_fattura <= dateTo)
      : fattureAttive;

    // Filtra fatture passive per date (se presenti)
    const fatturePassiveFiltrate = dateFrom && dateTo
      ? fatturePassive.filter(f => f.data_fattura >= dateFrom && f.data_fattura <= dateTo)
      : fatturePassive;

    // Filtra buste paga per date range (se presenti)
    const bustePagaFiltrate = dateFrom && dateTo
      ? bustePagaDettaglio.filter(dettaglio => {
          if (!dettaglio.buste_paga) return false;
          const { mese, anno } = dettaglio.buste_paga;
          const bustaPagaDate = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
          return bustaPagaDate >= dateFrom && bustaPagaDate <= dateTo;
        })
      : bustePagaDettaglio;

    // Filtra F24 per date range (se presenti)
    const f24Filtrate = dateFrom && dateTo
      ? f24Dettaglio.filter(dettaglio => {
          if (!dettaglio.f24) return false;
          const { mese, anno } = dettaglio.f24;
          const f24Date = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
          return f24Date >= dateFrom && f24Date <= dateTo;
        })
      : f24Dettaglio;

    // Calcola totali sempre basandosi sulle fatture filtrate
    const ricavi_imponibile = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const ricavi_iva = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const ricavi_totali = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_imponibile = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const costi_iva = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const costi_totali = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_buste_paga = bustePagaFiltrate.reduce((sum, d) => sum + (Number(d.importo_commessa) || 0), 0);
    const costi_f24 = f24Filtrate.reduce((sum, d) => sum + (Number(d.valore_f24_commessa) || 0), 0);

    const costiPersonale = costi_buste_paga + costi_f24;
    const totaleCosti = costi_imponibile + costiPersonale;
    const margine_lordo = ricavi_imponibile - costi_imponibile - costiPersonale;
    const saldo_iva = ricavi_iva - costi_iva;

    return {
      ricavi_imponibile,
      ricavi_iva,
      ricavi_totali,
      costi_imponibile,
      costi_iva,
      costi_totali,
      costi_buste_paga,
      costi_f24,
      costiPersonale,
      totaleCosti,
      margine_lordo,
      saldo_iva,
    };
  }, [fattureAttive, fatturePassive, bustePagaDettaglio, f24Dettaglio, dateFrom, dateTo]);

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  return (
    <div className="space-y-6">
      {/* Card Selector per Sub-tabs */}
      <div className="grid grid-cols-3 gap-4">
        {/* Card Fatture */}
        <button
          onClick={() => setActiveSubTab('fatture')}
          className={`rounded-xl border-2 p-6 transition-all duration-200 ${
            activeSubTab === 'fatture'
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : 'border-border bg-card hover:border-green-300 hover:bg-green-50/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg transition-colors ${
              activeSubTab === 'fatture'
                ? 'bg-green-500'
                : 'bg-muted'
            }`}>
              <Receipt className={`h-5 w-5 ${
                activeSubTab === 'fatture'
                  ? 'text-white'
                  : 'text-muted-foreground'
              }`} />
            </div>
            <span className={`font-semibold text-base ${
              activeSubTab === 'fatture'
                ? 'text-green-700'
                : 'text-foreground'
            }`}>
              Fatture
            </span>
          </div>
        </button>

        {/* Card Personale */}
        <button
          onClick={() => setActiveSubTab('personale')}
          className={`rounded-xl border-2 p-6 transition-all duration-200 ${
            activeSubTab === 'personale'
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : 'border-border bg-card hover:border-green-300 hover:bg-green-50/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg transition-colors ${
              activeSubTab === 'personale'
                ? 'bg-green-500'
                : 'bg-muted'
            }`}>
              <Banknote className={`h-5 w-5 ${
                activeSubTab === 'personale'
                  ? 'text-white'
                  : 'text-muted-foreground'
              }`} />
            </div>
            <span className={`font-semibold text-base ${
              activeSubTab === 'personale'
                ? 'text-green-700'
                : 'text-foreground'
            }`}>
              Personale
            </span>
          </div>
        </button>

        {/* Card Altro */}
        <button
          onClick={() => setActiveSubTab('altro')}
          className={`rounded-xl border-2 p-6 transition-all duration-200 ${
            activeSubTab === 'altro'
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : 'border-border bg-card hover:border-green-300 hover:bg-green-50/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg transition-colors ${
              activeSubTab === 'altro'
                ? 'bg-green-500'
                : 'bg-muted'
            }`}>
              <FileStack className={`h-5 w-5 ${
                activeSubTab === 'altro'
                  ? 'text-white'
                  : 'text-muted-foreground'
              }`} />
            </div>
            <span className={`font-semibold text-base ${
              activeSubTab === 'altro'
                ? 'text-green-700'
                : 'text-foreground'
            }`}>
              Altro
            </span>
          </div>
        </button>
      </div>

      {/* Contenuto Sub-tabs */}
      <div className="mt-6">
        {activeSubTab === 'fatture' && (
          <FattureTab
            commessaId={commessaId}
            fattureAttive={fattureAttive}
            fatturePassive={fatturePassive}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onReload={onReload}
          />
        )}

        {activeSubTab === 'personale' && (
          <EconomiaPersonaleTab
            bustePagaDettaglio={bustePagaDettaglio}
            f24Dettaglio={f24Dettaglio}
            dateFrom={dateFrom}
            dateTo={dateTo}
          />
        )}

        {activeSubTab === 'altro' && (
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
            <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sezione in arrivo</h3>
            <p className="text-sm text-muted-foreground">
              Qui verranno visualizzate altre voci economiche (es. ammortamenti, accantonamenti, etc.)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
