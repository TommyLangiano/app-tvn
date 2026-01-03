'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, FileText, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { MovimentiTab } from './MovimentiTab';

interface FattureTabProps {
  commessaId: string;
  fattureAttive: any[];
  fatturePassive: any[];
  dateFrom?: string;
  dateTo?: string;
  onReload?: () => void;
}

export function FattureTab({
  commessaId,
  fattureAttive,
  fatturePassive,
  dateFrom = '',
  dateTo = '',
  onReload
}: FattureTabProps) {
  // Calcola riepilogo solo per fatture (senza personale)
  const riepilogoFatture = useMemo(() => {
    const ricavi_imponibile = fattureAttive.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const ricavi_iva = fattureAttive.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const ricavi_totali = fattureAttive.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    // Calcola fatture emesse per stato pagamento
    const ricavi_pagato = fattureAttive
      .filter(f => f.stato_pagamento === 'Pagato')
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);
    const ricavi_da_incassare = fattureAttive
      .filter(f => f.stato_pagamento === 'Da Incassare')
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_imponibile = fatturePassive.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const costi_iva = fatturePassive.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const costi_totali = fatturePassive.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    // Calcola fatture ricevute per stato pagamento
    const costi_pagato = fatturePassive
      .filter(f => f.stato_pagamento === 'Pagato')
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);
    const costi_non_pagato = fatturePassive
      .filter(f => f.stato_pagamento === 'Non Pagato')
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const margine_lordo = ricavi_imponibile - costi_imponibile;
    const saldo_iva = ricavi_iva - costi_iva;

    return {
      ricavi_imponibile,
      ricavi_iva,
      ricavi_totali,
      ricavi_pagato,
      ricavi_da_incassare,
      costi_imponibile,
      costi_iva,
      costi_totali,
      costi_pagato,
      costi_non_pagato,
      margine_lordo,
      saldo_iva
    };
  }, [fattureAttive, fatturePassive]);

  return (
    <div className="space-y-6">
      {/* Card Riepilogo Fatture */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Fatture Emesse */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <span className="font-semibold text-base">Fatture Emesse</span>
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(riepilogoFatture.ricavi_totali)}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Imponibile:</span>
                <span className="text-sm font-semibold">{formatCurrency(riepilogoFatture.ricavi_imponibile)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IVA:</span>
                <span className="text-sm font-semibold">{formatCurrency(riepilogoFatture.ricavi_iva)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Da Incassare:</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(riepilogoFatture.ricavi_da_incassare)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pagato:</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(riepilogoFatture.ricavi_pagato)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Fatture Ricevute */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-red-100">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <span className="font-semibold text-base">Fatture Ricevute</span>
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(riepilogoFatture.costi_totali)}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Imponibile:</span>
                <span className="text-sm font-semibold">{formatCurrency(riepilogoFatture.costi_imponibile)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">IVA:</span>
                <span className="text-sm font-semibold">{formatCurrency(riepilogoFatture.costi_iva)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Non Pagato:</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(riepilogoFatture.costi_non_pagato)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pagato:</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(riepilogoFatture.costi_pagato)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Margine Lordo */}
        <div className="rounded-xl border-2 border-border bg-card p-6 flex flex-col items-center justify-center text-center">
          <div className={`p-2 rounded-lg mb-3 ${riepilogoFatture.margine_lordo >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <FileText className={`h-5 w-5 ${riepilogoFatture.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <span className="font-semibold text-base mb-2">Margine Lordo</span>
          <div className={`text-3xl font-bold ${riepilogoFatture.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(riepilogoFatture.margine_lordo)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Imponibile Fatture Emesse - Imponibile Fatture Ricevute
          </div>
        </div>

        {/* Card Saldo IVA */}
        <div className={`rounded-xl border-2 bg-card p-6 flex flex-col items-center justify-center text-center ${
          (riepilogoFatture.saldo_iva || 0) === 0
            ? 'border-green-300 bg-green-50/30'
            : (riepilogoFatture.saldo_iva || 0) > 0
            ? 'border-red-300 bg-red-50/30'
            : 'border-green-300 bg-green-50/30'
        }`}>
          <div className={`p-2 rounded-lg mb-3 ${
            (riepilogoFatture.saldo_iva || 0) === 0
              ? 'bg-gray-100'
              : (riepilogoFatture.saldo_iva || 0) > 0
              ? 'bg-red-100'
              : 'bg-green-100'
          }`}>
            <Receipt className={`h-5 w-5 ${
              (riepilogoFatture.saldo_iva || 0) === 0
                ? 'text-gray-600'
                : (riepilogoFatture.saldo_iva || 0) > 0
                ? 'text-red-600'
                : 'text-green-600'
            }`} />
          </div>
          <span className="font-semibold text-base mb-2">Saldo IVA</span>
          <div className={`text-3xl font-bold ${
            (riepilogoFatture.saldo_iva || 0) === 0
              ? 'text-gray-700'
              : (riepilogoFatture.saldo_iva || 0) > 0
              ? 'text-red-600'
              : 'text-green-600'
          }`}>
            {formatCurrency(Math.abs(riepilogoFatture.saldo_iva || 0))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {(riepilogoFatture.saldo_iva || 0) === 0
              ? 'In pareggio'
              : (riepilogoFatture.saldo_iva || 0) > 0
              ? 'IVA a debito'
              : 'IVA a credito'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            IVA Fatture Emesse - IVA Fatture Ricevute
          </div>
        </div>
      </div>

      {/* Tabella Fatture */}
      <MovimentiTab
        commessaId={commessaId}
        fattureAttive={fattureAttive}
        fatturePassive={fatturePassive}
        riepilogo={null}
        bustePagaDettaglio={[]}
        f24Dettaglio={[]}
        onReload={onReload}
      />
    </div>
  );
}
