'use client';

import { useState, useMemo } from 'react';
import { Receipt, TrendingUp, TrendingDown, FileText, Banknote, FileStack, LayoutGrid } from 'lucide-react';
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

type SubTab = 'tutto' | 'fatture' | 'personale' | 'altro';

export function EconomiaTab({
  commessaId,
  fattureAttive,
  fatturePassive,
  riepilogo,
  bustePagaDettaglio,
  f24Dettaglio,
  onReload
}: EconomiaTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('tutto');
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
      <div className="grid grid-cols-4 gap-4">
        {/* Card Tutto */}
        <button
          onClick={() => setActiveSubTab('tutto')}
          className={`rounded-xl border-2 p-6 transition-all duration-200 ${
            activeSubTab === 'tutto'
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : 'border-border bg-card hover:border-green-300 hover:bg-green-50/30'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <LayoutGrid className={`h-6 w-6 ${
              activeSubTab === 'tutto'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`} />
            <span className={`font-semibold text-base ${
              activeSubTab === 'tutto'
                ? 'text-green-700'
                : 'text-foreground'
            }`}>
              Tutto
            </span>
          </div>
        </button>

        {/* Card Fatture */}
        <button
          onClick={() => setActiveSubTab('fatture')}
          className={`rounded-xl border-2 p-6 transition-all duration-200 ${
            activeSubTab === 'fatture'
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : 'border-border bg-card hover:border-green-300 hover:bg-green-50/30'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <Receipt className={`h-6 w-6 ${
              activeSubTab === 'fatture'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`} />
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
          <div className="flex items-center justify-center gap-3">
            <Banknote className={`h-6 w-6 ${
              activeSubTab === 'personale'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`} />
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
          <div className="flex items-center justify-center gap-3">
            <FileStack className={`h-6 w-6 ${
              activeSubTab === 'altro'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`} />
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
        {activeSubTab === 'tutto' && (
          <div className="space-y-6">
            {/* Card Riepilogo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card Ricavi Totali */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-base">Ricavi Totali</span>
                </div>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(riepilogoFiltrato.ricavi_totali)}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fatture:</span>
                      <span className="text-sm font-semibold">{formatCurrency(riepilogoFiltrato.ricavi_totali)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground ml-2">• Imponibile:</span>
                      <span className="font-medium">{formatCurrency(riepilogoFiltrato.ricavi_imponibile)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground ml-2">• IVA:</span>
                      <span className="font-medium">{formatCurrency(riepilogoFiltrato.ricavi_iva)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Costi Totali */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-red-100">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="font-semibold text-base">Costi Totali</span>
                </div>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(riepilogoFiltrato.totaleCosti)}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fatture:</span>
                      <span className="text-sm font-semibold">{formatCurrency(riepilogoFiltrato.costi_totali)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground ml-2">• Imponibile:</span>
                      <span className="font-medium">{formatCurrency(riepilogoFiltrato.costi_imponibile)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground ml-2">• IVA:</span>
                      <span className="font-medium">{formatCurrency(riepilogoFiltrato.costi_iva)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Personale:</span>
                      <span className="text-sm font-semibold text-yellow-600">{formatCurrency(riepilogoFiltrato.costiPersonale || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground ml-2">• Buste Paga:</span>
                      <span className="font-medium">{formatCurrency(riepilogoFiltrato.costi_buste_paga || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground ml-2">• F24:</span>
                      <span className="font-medium">{formatCurrency(riepilogoFiltrato.costi_f24 || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Margine Lordo */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${riepilogoFiltrato.margine_lordo >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <FileText className={`h-5 w-5 ${riepilogoFiltrato.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <span className="font-semibold text-base">Margine Lordo</span>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${riepilogoFiltrato.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(riepilogoFiltrato.margine_lordo)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Ricavi - Costi (incluso personale)
                  </div>
                </div>
              </div>

              {/* Card Saldo IVA */}
              <div className={`rounded-xl border-2 bg-card p-6 ${
                (riepilogoFiltrato.saldo_iva || 0) === 0
                  ? 'border-green-300 bg-green-50/30'
                  : (riepilogoFiltrato.saldo_iva || 0) > 0
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-green-300 bg-green-50/30'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${
                    (riepilogoFiltrato.saldo_iva || 0) === 0
                      ? 'bg-gray-100'
                      : (riepilogoFiltrato.saldo_iva || 0) > 0
                      ? 'bg-red-100'
                      : 'bg-green-100'
                  }`}>
                    <Receipt className={`h-5 w-5 ${
                      (riepilogoFiltrato.saldo_iva || 0) === 0
                        ? 'text-gray-600'
                        : (riepilogoFiltrato.saldo_iva || 0) > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`} />
                  </div>
                  <span className="font-semibold text-base">Saldo IVA</span>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${
                    (riepilogoFiltrato.saldo_iva || 0) === 0
                      ? 'text-gray-700'
                      : (riepilogoFiltrato.saldo_iva || 0) > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(Math.abs(riepilogoFiltrato.saldo_iva || 0))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {(riepilogoFiltrato.saldo_iva || 0) === 0
                      ? 'In pareggio'
                      : (riepilogoFiltrato.saldo_iva || 0) > 0
                      ? 'IVA a debito'
                      : 'IVA a credito'}
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder per lista movimenti */}
            <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Lista movimenti completa</h3>
              <p className="text-sm text-muted-foreground">
                Qui verrà visualizzata la lista unificata di tutti i movimenti (fatture, buste paga, F24, etc.)
              </p>
            </div>
          </div>
        )}

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
