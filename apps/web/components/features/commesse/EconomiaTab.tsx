'use client';

import { useState, useMemo } from 'react';
import { Receipt, TrendingUp, TrendingDown, FileText, Banknote, LayoutGrid } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { EconomiaPersonaleTab } from './EconomiaPersonaleTab';
import { FattureTab } from './FattureTab';
import { NoteSpeseTab } from './NoteSpeseTab';
import type { NotaSpesa } from '@/types/nota-spesa';

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
  commessaNome: string;
  fattureAttive: any[];
  fatturePassive: any[];
  riepilogo?: RiepilogoEconomico | null;
  bustePagaDettaglio: any[];
  f24Dettaglio: any[];
  noteSpese: NotaSpesa[];
  noteSpeseDaApprovare: NotaSpesa[];
  noteSpeseRifiutate: NotaSpesa[];
  onReload?: () => void;
}

type SubTab = 'tutto' | 'fatture' | 'personale' | 'note_spesa';

export function EconomiaTab({
  commessaId,
  commessaNome,
  fattureAttive,
  fatturePassive,
  riepilogo,
  bustePagaDettaglio,
  f24Dettaglio,
  noteSpese,
  noteSpeseDaApprovare,
  noteSpeseRifiutate,
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

    // Filtra note spese per date (solo approvate e da approvare)
    const noteSpeseApprovate = dateFrom && dateTo
      ? noteSpese.filter(n => n.data_nota >= dateFrom && n.data_nota <= dateTo)
      : noteSpese;

    const noteSpeseDaApprovareFiltrate = dateFrom && dateTo
      ? noteSpeseDaApprovare.filter(n => n.data_nota >= dateFrom && n.data_nota <= dateTo)
      : noteSpeseDaApprovare;

    // Calcola totali sempre basandosi sulle fatture filtrate
    const ricavi_imponibile = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const ricavi_iva = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const ricavi_totali = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_imponibile = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const costi_iva = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const costi_totali = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_buste_paga = bustePagaFiltrate.reduce((sum, d) => sum + (Number(d.importo_commessa) || 0), 0);
    const costi_f24 = f24Filtrate.reduce((sum, d) => sum + (Number(d.valore_f24_commessa) || 0), 0);
    const costi_note_spesa_approvate = noteSpeseApprovate.reduce((sum, n) => sum + n.importo, 0);
    const costi_note_spesa_da_approvare = noteSpeseDaApprovareFiltrate.reduce((sum, n) => sum + n.importo, 0);
    const costi_note_spesa = costi_note_spesa_approvate + costi_note_spesa_da_approvare;

    const costiPersonale = costi_buste_paga + costi_f24;
    const totaleCosti = costi_imponibile + costiPersonale + costi_note_spesa;
    const margine_lordo = ricavi_imponibile - costi_imponibile - costiPersonale - costi_note_spesa;
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
      costi_note_spesa,
      costi_note_spesa_approvate,
      costi_note_spesa_da_approvare,
      costiPersonale,
      totaleCosti,
      margine_lordo,
      saldo_iva,
    };
  }, [fattureAttive, fatturePassive, bustePagaDettaglio, f24Dettaglio, noteSpese, noteSpeseDaApprovare, dateFrom, dateTo]);

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

        {/* Card Note Spesa */}
        <button
          onClick={() => setActiveSubTab('note_spesa')}
          className={`rounded-xl border-2 p-6 transition-all duration-200 ${
            activeSubTab === 'note_spesa'
              ? 'border-green-500 bg-green-50/50 shadow-sm'
              : 'border-border bg-card hover:border-green-300 hover:bg-green-50/30'
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <Receipt className={`h-6 w-6 ${
              activeSubTab === 'note_spesa'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`} />
            <span className={`font-semibold text-base ${
              activeSubTab === 'note_spesa'
                ? 'text-green-700'
                : 'text-foreground'
            }`}>
              Note Spesa
            </span>
          </div>
        </button>
      </div>

      {/* Contenuto Sub-tabs */}
      <div className="mt-6">
        {activeSubTab === 'tutto' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Card Margine Lordo */}
            <div className={`rounded-xl border-2 p-6 ${
              riepilogoFiltrato.margine_lordo >= 0
                ? 'border-green-300 bg-green-50/30'
                : 'border-red-300 bg-red-50/30'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${riepilogoFiltrato.margine_lordo >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <FileText className={`h-5 w-5 ${riepilogoFiltrato.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <span className="font-semibold text-base">Margine Lordo</span>
              </div>
              <div className="space-y-3">
                <div className={`text-3xl font-bold ${riepilogoFiltrato.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(riepilogoFiltrato.margine_lordo)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Ricavi Totali - Costi Totali
                </div>
              </div>
            </div>

            {/* Card Saldo IVA */}
            <div className={`rounded-xl border-2 p-6 ${
              (riepilogoFiltrato.saldo_iva || 0) === 0
                ? 'border-border bg-card'
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
              <div className="space-y-3">
                <div className={`text-3xl font-bold ${
                  (riepilogoFiltrato.saldo_iva || 0) === 0
                    ? 'text-gray-700'
                    : (riepilogoFiltrato.saldo_iva || 0) > 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}>
                  {formatCurrency(Math.abs(riepilogoFiltrato.saldo_iva || 0))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(riepilogoFiltrato.saldo_iva || 0) === 0
                    ? 'In pareggio'
                    : (riepilogoFiltrato.saldo_iva || 0) > 0
                    ? 'IVA a debito'
                    : 'IVA a credito'}
                </div>
              </div>
            </div>

            {/* Card Ricavi Totali */}
            <div className="rounded-xl border-2 border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-semibold text-lg">Ricavi Totali</span>
              </div>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(riepilogoFiltrato.ricavi_totali)}
                </div>
                <div className="space-y-3 pt-2 border-t border-border">
                  {/* Categoria Fatture */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base">Fatture:</span>
                      <span className="font-bold text-base text-green-600">{formatCurrency(riepilogoFiltrato.ricavi_totali)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">Imponibile:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.ricavi_imponibile)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">IVA:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.ricavi_iva)}</span>
                    </div>
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
                <span className="font-semibold text-lg">Costi Totali</span>
              </div>
              <div className="space-y-3">
                <div className="text-3xl font-bold text-red-600">
                  {formatCurrency(riepilogoFiltrato.totaleCosti)}
                </div>
                <div className="space-y-3 pt-2 border-t border-border">
                  {/* Categoria Fatture */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base">Fatture:</span>
                      <span className="font-bold text-base text-green-600">{formatCurrency(riepilogoFiltrato.costi_totali)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">Imponibile:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.costi_imponibile)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">IVA:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.costi_iva)}</span>
                    </div>
                  </div>

                  {/* Categoria Personale */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base">Personale:</span>
                      <span className="font-bold text-base text-green-600">{formatCurrency(riepilogoFiltrato.costiPersonale || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">Buste Paga:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.costi_buste_paga || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">F24:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.costi_f24 || 0)}</span>
                    </div>
                  </div>

                  {/* Categoria Note Spesa */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base">Note Spesa:</span>
                      <span className="font-bold text-base text-green-600">{formatCurrency(riepilogoFiltrato.costi_note_spesa || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">Approvate:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.costi_note_spesa_approvate || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pl-4">
                      <span className="text-muted-foreground text-sm">Da Approvare:</span>
                      <span className="text-sm">{formatCurrency(riepilogoFiltrato.costi_note_spesa_da_approvare || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
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

        {activeSubTab === 'note_spesa' && (
          <NoteSpeseTab
            commessaId={commessaId}
            commessaNome={commessaNome}
            noteSpese={noteSpese}
            noteSpeseDaApprovare={noteSpeseDaApprovare}
            noteSpeseRifiutate={noteSpeseRifiutate}
            onReload={onReload}
          />
        )}
      </div>
    </div>
  );
}
