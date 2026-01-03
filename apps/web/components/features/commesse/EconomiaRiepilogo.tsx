'use client';

import { TrendingUp, TrendingDown, DollarSign, Plus, ArrowUpCircle, ArrowDownCircle, List, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RiepilogoEconomico, FatturaAttiva, FatturaPassiva } from '@/types/fattura';
import { formatCurrency } from '@/lib/utils/currency';

interface EconomiaRiepilogoProps {
  riepilogo: RiepilogoEconomico | null;
  fatture?: FatturaAttiva[];
  fatturePassive?: FatturaPassiva[];
  // scontrini?: Scontrino[]; // Tabella eliminata
  onNuovoRicavo?: () => void;
  onNuovoCosto?: () => void;
  onVisualizzaTutto?: () => void;
}

// Tipo unificato per i movimenti
type Movimento = {
  id: string;
  tipo: 'ricavo' | 'costo';
  categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
  numero?: string;
  cliente_fornitore: string;
  tipologia: string;
  data_emissione: string;
  importo_totale: number;
  allegato_url: string | null;
};

export function EconomiaRiepilogo({
  riepilogo,
  fatture = [],
  fatturePassive = [],
  // scontrini = [], // Tabella eliminata
  onNuovoRicavo,
  onNuovoCosto,
  onVisualizzaTutto
}: EconomiaRiepilogoProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!riepilogo) {
    return (
      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6">
        <p className="text-muted-foreground text-center text-sm sm:text-base">Nessun dato economico disponibile</p>
      </div>
    );
  }

  // Unisci tutti i movimenti in un unico array
  const allMovimenti: Movimento[] = [
    ...fatture.map(f => ({
      id: f.id,
      tipo: 'ricavo' as const,
      categoria: 'fattura_attiva' as const,
      numero: f.numero_fattura,
      cliente_fornitore: f.cliente,
      tipologia: f.categoria, // FatturaAttiva usa 'categoria' non 'tipologia'
      data_emissione: f.data_fattura, // FatturaAttiva usa 'data_fattura' non 'data_emissione'
      importo_totale: f.importo_totale,
      allegato_url: f.allegato_url,
    })),
    ...fatturePassive.map(f => ({
      id: f.id,
      tipo: 'costo' as const,
      categoria: 'fattura_passiva' as const,
      numero: f.numero_fattura,
      cliente_fornitore: f.fornitore,
      tipologia: f.categoria, // FatturaPassiva usa 'categoria' non 'tipologia'
      data_emissione: f.data_fattura, // FatturaPassiva usa 'data_fattura' non 'data_emissione'
      importo_totale: f.importo_totale,
      allegato_url: f.allegato_url,
    })),
    // Scontrini rimossi (tabella eliminata)
    // ...scontrini.map(s => ({
    //   id: s.id,
    //   tipo: 'costo' as const,
    //   categoria: 'scontrino' as const,
    //   cliente_fornitore: s.fornitore,
    //   tipologia: s.tipologia,
    //   data_emissione: s.data_emissione,
    //   importo_totale: s.importo_totale,
    //   allegato_url: s.allegato_url,
    // })),
  ];

  // Ordina per data (più recenti prima)
  const movimentiOrdinati = allMovimenti.sort((a, b) =>
    new Date(b.data_emissione).getTime() - new Date(a.data_emissione).getTime()
  );

  // Prendi solo gli ultimi 3 movimenti
  const recentMovimenti = movimentiOrdinati.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Card Riepilogo Economico */}
      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2">
          <DollarSign className="h-5 w-5 text-primary mt-0.5" />
          <h3 className="text-base sm:text-lg font-semibold leading-tight">
            Riepilogo<br />Economico
          </h3>
        </div>

        {/* Ricavi e Costi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Ricavi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-green-600 text-sm sm:text-base">Fatture Emesse</h4>
              </div>
              {onNuovoRicavo && (
                <Button
                  onClick={onNuovoRicavo}
                  size="sm"
                  className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-xs">Aggiungi</span>
                </Button>
              )}
            </div>
            <div className="space-y-2 pl-4 sm:pl-6">
              <div className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground">Imponibile:</span>
                <span className="font-medium break-words text-right">{formatCurrency(riepilogo.ricavi_imponibile)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-medium break-words text-right">{formatCurrency(riepilogo.ricavi_iva)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 gap-2">
                <span className="font-semibold text-sm sm:text-base">Totale:</span>
                <span className="font-bold text-sm sm:text-base break-words text-right">{formatCurrency(riepilogo.ricavi_totali)}</span>
              </div>
            </div>
          </div>

          {/* Costi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <h4 className="font-semibold text-red-600 text-sm sm:text-base">Totale Costi</h4>
              </div>
              {onNuovoCosto && (
                <Button
                  onClick={onNuovoCosto}
                  size="sm"
                  className="h-7 gap-1 bg-red-600 hover:bg-red-700 text-white px-2 sm:px-3 shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-xs">Aggiungi</span>
                </Button>
              )}
            </div>
            <div className="space-y-2 pl-4 sm:pl-6">
              <div className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground">Fatture:</span>
                <span className="font-medium break-words text-right">{formatCurrency(riepilogo.costi_imponibile)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground">Buste Paga:</span>
                <span className="font-medium break-words text-right">{formatCurrency(riepilogo.costi_buste_paga || 0)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground">F24:</span>
                <span className="font-medium break-words text-right">{formatCurrency(riepilogo.costi_f24 || 0)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm gap-2">
                <span className="text-muted-foreground">IVA:</span>
                <span className="font-medium break-words text-right">{formatCurrency(riepilogo.costi_iva)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 gap-2">
                <span className="font-semibold text-sm sm:text-base">Totale:</span>
                <span className="font-bold text-sm sm:text-base break-words text-right">{formatCurrency(riepilogo.costi_totali + (riepilogo.costi_buste_paga || 0) + (riepilogo.costi_f24 || 0))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separatore */}
        <div className="border-t-2 border-border" />

        {/* Margine e Saldo IVA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Margine Lordo */}
          <div className={`rounded-lg border-2 p-3 sm:p-4 ${
            riepilogo.margine_lordo === 0
              ? 'border-blue-200 bg-blue-50'
              : riepilogo.margine_lordo > 0
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Margine Lordo</p>
            <p className={`text-xl sm:text-2xl font-bold break-words ${
              riepilogo.margine_lordo === 0
                ? 'text-blue-600'
                : riepilogo.margine_lordo > 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {formatCurrency(riepilogo.margine_lordo)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Imponibile ricavi - Imponibile costi
            </p>
          </div>

          {/* Saldo IVA */}
          <div className={`rounded-lg border-2 p-3 sm:p-4 ${
            riepilogo.saldo_iva === 0
              ? 'border-green-200 bg-green-50'
              : riepilogo.saldo_iva > 0
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          }`}>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Saldo IVA</p>
            <p className={`text-xl sm:text-2xl font-bold break-words ${
              riepilogo.saldo_iva === 0
                ? 'text-green-600'
                : riepilogo.saldo_iva > 0
                ? 'text-red-600'
                : 'text-green-600'
            }`}>
              {formatCurrency(
                riepilogo.saldo_iva === 0
                  ? 0
                  : riepilogo.saldo_iva > 0
                  ? -riepilogo.saldo_iva
                  : -riepilogo.saldo_iva
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {riepilogo.saldo_iva === 0 ? 'Neutra' : riepilogo.saldo_iva > 0 ? 'IVA a debito' : 'IVA a credito'}
            </p>
          </div>
        </div>
      </div>

      {/* Card Ultimi Movimenti */}
      <div className="rounded-xl border-2 border-border bg-card p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold">Ultimi Movimenti</h3>
          </div>
          {movimentiOrdinati.length > 3 && onVisualizzaTutto && (
            <Button
              onClick={onVisualizzaTutto}
              variant="ghost"
              size="sm"
              className="h-9 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
            >
              Visualizza tutti ({movimentiOrdinati.length})
            </Button>
          )}
        </div>

        {/* Lista Movimenti */}
        {recentMovimenti.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-background rounded-lg border-2 border-dashed border-border">
            <p className="text-sm">Nessun movimento registrato</p>
            <p className="text-xs mt-1">Aggiungi il primo movimento usando i pulsanti sopra</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMovimenti.map((movimento) => (
              <div
                key={movimento.id}
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-border bg-background hover:bg-muted/10 transition-colors"
              >
                {/* Icona tipo movimento */}
                <div className="flex-shrink-0">
                  {movimento.tipo === 'ricavo' ? (
                    <div className="p-2 rounded-lg bg-green-50">
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-red-50">
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                    </div>
                  )}
                </div>

                {/* Info movimento - tutto su una riga */}
                <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                  <p className="font-medium text-sm truncate">
                    {movimento.numero && `${movimento.numero} - `}{movimento.cliente_fornitore}
                  </p>
                  {movimento.allegato_url && (
                    <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground flex-shrink-0">{movimento.tipologia}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">•</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(movimento.data_emissione)}</span>
                </div>

                {/* Importo */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-semibold text-sm ${
                    movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movimento.tipo === 'ricavo' ? '+' : '-'} {formatCurrency(movimento.importo_totale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
