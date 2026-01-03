'use client';

import { useMemo } from 'react';
import { Banknote, BadgeEuro, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';

interface EconomiaPersonaleTabProps {
  bustePagaDettaglio: any[];
  f24Dettaglio: any[];
  dateFrom?: string;
  dateTo?: string;
}

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface MovimentoPersonale {
  id: string;
  tipo: 'Busta Paga' | 'F24';
  mese: number;
  anno: number;
  periodo: string;
  totale: number;
  count: number;
  dettagli: any[];
}

export function EconomiaPersonaleTab({
  bustePagaDettaglio,
  f24Dettaglio,
  dateFrom,
  dateTo
}: EconomiaPersonaleTabProps) {

  // Calcola totali costi personale
  const riepilogoPersonale = useMemo(() => {
    let bustePagaFiltrate = bustePagaDettaglio;
    let f24Filtrate = f24Dettaglio;

    // Applica filtro date se presente
    if (dateFrom && dateTo) {
      bustePagaFiltrate = bustePagaDettaglio.filter(dettaglio => {
        if (!dettaglio.buste_paga) return false;
        const { mese, anno } = dettaglio.buste_paga;
        const bustaPagaDate = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return bustaPagaDate >= dateFrom && bustaPagaDate <= dateTo;
      });

      f24Filtrate = f24Dettaglio.filter(dettaglio => {
        if (!dettaglio.f24) return false;
        const { mese, anno } = dettaglio.f24;
        const f24Date = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return f24Date >= dateFrom && f24Date <= dateTo;
      });
    }

    const costi_buste_paga = bustePagaFiltrate.reduce((sum, d) => sum + (Number(d.importo_commessa) || 0), 0);
    const costi_f24 = f24Filtrate.reduce((sum, d) => sum + (Number(d.valore_f24_commessa) || 0), 0);
    const totale_personale = costi_buste_paga + costi_f24;

    return {
      costi_buste_paga,
      costi_f24,
      totale_personale,
    };
  }, [bustePagaDettaglio, f24Dettaglio, dateFrom, dateTo]);

  // Prepara movimenti BUSTE PAGA per la tabella
  const movimentiBustePaga = useMemo(() => {
    let bustePagaFiltrate = bustePagaDettaglio;

    // Applica filtro date se presente
    if (dateFrom && dateTo) {
      bustePagaFiltrate = bustePagaDettaglio.filter(dettaglio => {
        if (!dettaglio.buste_paga) return false;
        const { mese, anno } = dettaglio.buste_paga;
        const bustaPagaDate = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return bustaPagaDate >= dateFrom && bustaPagaDate <= dateTo;
      });
    }

    // Raggruppa buste paga per mese/anno
    const bustePagaGrouped = bustePagaFiltrate.reduce((acc: any, dettaglio: any) => {
      if (!dettaglio.buste_paga) return acc;
      const { mese, anno } = dettaglio.buste_paga;
      const key = `bp-${anno}-${mese}`;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          tipo: 'Busta Paga' as const,
          mese,
          anno,
          periodo: `${MESI[mese - 1]} ${anno}`,
          totale: 0,
          count: 0,
          dettagli: []
        };
      }

      acc[key].totale += Number(dettaglio.importo_commessa) || 0;
      acc[key].count += 1;
      acc[key].dettagli.push(dettaglio);

      return acc;
    }, {});

    const movimenti: MovimentoPersonale[] = Object.values(bustePagaGrouped);
    return movimenti.sort((a, b) => {
      if (b.anno !== a.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  }, [bustePagaDettaglio, dateFrom, dateTo]);

  // Prepara movimenti F24 per la tabella
  const movimentiF24 = useMemo(() => {
    let f24Filtrate = f24Dettaglio;

    // Applica filtro date se presente
    if (dateFrom && dateTo) {
      f24Filtrate = f24Dettaglio.filter(dettaglio => {
        if (!dettaglio.f24) return false;
        const { mese, anno } = dettaglio.f24;
        const f24Date = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return f24Date >= dateFrom && f24Date <= dateTo;
      });
    }

    // Raggruppa F24 per mese/anno
    const f24Grouped = f24Filtrate.reduce((acc: any, dettaglio: any) => {
      if (!dettaglio.f24) return acc;
      const { mese, anno } = dettaglio.f24;
      const key = `f24-${anno}-${mese}`;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          tipo: 'F24' as const,
          mese,
          anno,
          periodo: `${MESI[mese - 1]} ${anno}`,
          totale: 0,
          count: 0,
          dettagli: []
        };
      }

      acc[key].totale += Number(dettaglio.valore_f24_commessa) || 0;
      acc[key].count += 1;
      acc[key].dettagli.push(dettaglio);

      return acc;
    }, {});

    const movimenti: MovimentoPersonale[] = Object.values(f24Grouped);
    return movimenti.sort((a, b) => {
      if (b.anno !== a.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  }, [f24Dettaglio, dateFrom, dateTo]);

  // Colonne DataTable per Buste Paga
  const columnsBustePaga: DataTableColumn<MovimentoPersonale>[] = [
    {
      key: 'periodo',
      label: 'Periodo',
      sortable: true,
      render: (movimento) => (
        <span className="text-sm font-medium">{movimento.periodo}</span>
      ),
    },
    {
      key: 'count',
      label: 'Dipendenti',
      sortable: true,
      render: (movimento) => (
        <span className="text-sm text-muted-foreground">{movimento.count}</span>
      ),
    },
    {
      key: 'totale',
      label: 'Importo',
      sortable: true,
      render: (movimento) => (
        <span className="text-sm font-bold text-yellow-600">
          {formatCurrency(movimento.totale)}
        </span>
      ),
    },
  ];

  // Colonne DataTable per F24
  const columnsF24: DataTableColumn<MovimentoPersonale>[] = [
    {
      key: 'periodo',
      label: 'Periodo',
      sortable: true,
      render: (movimento) => (
        <span className="text-sm font-medium">{movimento.periodo}</span>
      ),
    },
    {
      key: 'count',
      label: 'Dipendenti',
      sortable: true,
      render: (movimento) => (
        <span className="text-sm text-muted-foreground">{movimento.count}</span>
      ),
    },
    {
      key: 'totale',
      label: 'Importo',
      sortable: true,
      render: (movimento) => (
        <span className="text-sm font-bold text-orange-600">
          {formatCurrency(movimento.totale)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Card Riepilogo Personale */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Buste Paga */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Banknote className="h-5 w-5 text-yellow-600" />
            </div>
            <span className="font-semibold text-base">Buste Paga</span>
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-yellow-600">
              {formatCurrency(riepilogoPersonale.costi_buste_paga)}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Costo mensile medio:</span>
                <span className="text-sm font-semibold">
                  {movimentiBustePaga.length > 0
                    ? formatCurrency(riepilogoPersonale.costi_buste_paga / movimentiBustePaga.length)
                    : formatCurrency(0)
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mesi ripartiti:</span>
                <span className="text-sm font-semibold">{movimentiBustePaga.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card F24 */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <BadgeEuro className="h-5 w-5 text-orange-600" />
            </div>
            <span className="font-semibold text-base">F24</span>
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-orange-600">
              {formatCurrency(riepilogoPersonale.costi_f24)}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Costo mensile medio:</span>
                <span className="text-sm font-semibold">
                  {movimentiF24.length > 0
                    ? formatCurrency(riepilogoPersonale.costi_f24 / movimentiF24.length)
                    : formatCurrency(0)
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mesi ripartiti:</span>
                <span className="text-sm font-semibold">{movimentiF24.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Totale Personale */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-red-100">
              <Users className="h-5 w-5 text-red-600" />
            </div>
            <span className="font-semibold text-base">Totale Personale</span>
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-red-600">
              {formatCurrency(riepilogoPersonale.totale_personale)}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Buste Paga:</span>
                <span className="text-sm font-semibold text-yellow-600">{formatCurrency(riepilogoPersonale.costi_buste_paga)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">F24:</span>
                <span className="text-sm font-semibold text-orange-600">{formatCurrency(riepilogoPersonale.costi_f24)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabelle Movimenti Personale - Suddivise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabella Buste Paga */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Banknote className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-lg">Buste Paga</h3>
          </div>
          <DataTable<MovimentoPersonale>
            data={movimentiBustePaga}
            columns={columnsBustePaga}
            keyField="id"
            loading={false}
            emptyIcon={Banknote}
            emptyTitle="Nessuna busta paga"
            emptyDescription={dateFrom && dateTo
              ? 'Nessuna ripartizione di buste paga nel periodo selezionato'
              : 'Non ci sono ancora ripartizioni di buste paga per questa commessa'}
            searchable={false}
            sortField="anno"
            sortDirection="desc"
          />
        </div>

        {/* Tabella F24 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-100">
              <BadgeEuro className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-lg">F24</h3>
          </div>
          <DataTable<MovimentoPersonale>
            data={movimentiF24}
            columns={columnsF24}
            keyField="id"
            loading={false}
            emptyIcon={BadgeEuro}
            emptyTitle="Nessun F24"
            emptyDescription={dateFrom && dateTo
              ? 'Nessuna ripartizione di F24 nel periodo selezionato'
              : 'Non ci sono ancora ripartizioni di F24 per questa commessa'}
            searchable={false}
            sortField="anno"
            sortDirection="desc"
          />
        </div>
      </div>
    </div>
  );
}
