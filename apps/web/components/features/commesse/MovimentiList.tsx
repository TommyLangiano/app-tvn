'use client';

import { ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';
import type { Movimento } from '@/types/movimento';

interface MovimentiListProps {
  movimenti: Movimento[];
}

export function MovimentiList({ movimenti }: MovimentiListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('it-IT');
  };

  if (movimenti.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Nessun movimento registrato</p>
        <p className="text-sm text-muted-foreground mt-2">
          Aggiungi il primo ricavo o costo per iniziare a tracciare l&apos;economia della commessa
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Movimenti Recenti</h3>

      <div className="space-y-3">
        {movimenti.map((movimento) => (
          <div
            key={movimento.id}
            className="group rounded-xl border-2 border-border bg-card p-4 hover:shadow-md transition-all duration-200 hover:border-primary/30"
          >
            <div className="flex items-start gap-4">
              {/* Icona tipo movimento */}
              <div className={`flex-shrink-0 rounded-lg p-2 ${
                movimento.tipo === 'ricavo'
                  ? 'bg-green-100 dark:bg-green-950/30'
                  : 'bg-red-100 dark:bg-red-950/30'
              }`}>
                {movimento.tipo === 'ricavo' ? (
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                )}
              </div>

              {/* Contenuto */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase ${
                        movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movimento.tipo}
                      </span>
                      {movimento.categoria && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{movimento.categoria}</span>
                        </>
                      )}
                    </div>
                    <p className="font-semibold text-base truncate">{movimento.descrizione}</p>
                    {movimento.note && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {movimento.note}
                      </p>
                    )}
                  </div>

                  {/* Importi */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${
                      movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movimento.tipo === 'ricavo' ? '+' : '-'}{formatCurrency(movimento.importo_totale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Imp: {formatCurrency(movimento.importo_imponibile)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IVA {movimento.aliquota_iva}%: {formatCurrency(movimento.importo_iva)}
                    </p>
                  </div>
                </div>

                {/* Data */}
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(movimento.data_movimento)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
