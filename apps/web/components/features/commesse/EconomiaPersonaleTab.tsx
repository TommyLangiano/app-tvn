'use client';

import { useMemo } from 'react';
import { Banknote, BadgeEuro, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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

export function EconomiaPersonaleTab({
  bustePagaDettaglio,
  f24Dettaglio,
  dateFrom,
  dateTo
}: EconomiaPersonaleTabProps) {

  // Filtra e raggruppa buste paga per mese/anno
  const bustePagaRaggruppate = useMemo(() => {
    let filtrate = bustePagaDettaglio;

    // Applica filtro date se presente
    if (dateFrom && dateTo) {
      filtrate = filtrate.filter(dettaglio => {
        if (!dettaglio.buste_paga) return false;
        const { mese, anno } = dettaglio.buste_paga;
        const bustaPagaDate = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return bustaPagaDate >= dateFrom && bustaPagaDate <= dateTo;
      });
    }

    // Raggruppa per mese/anno
    const grouped = filtrate.reduce((acc: any, dettaglio: any) => {
      if (!dettaglio.buste_paga) return acc;
      const { mese, anno } = dettaglio.buste_paga;
      const key = `${anno}-${mese}`;

      if (!acc[key]) {
        acc[key] = {
          mese,
          anno,
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

    // Converti in array e ordina per data (più recente prima)
    return Object.values(grouped).sort((a: any, b: any) => {
      if (b.anno !== a.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  }, [bustePagaDettaglio, dateFrom, dateTo]);

  // Filtra e raggruppa F24 per mese/anno
  const f24Raggruppati = useMemo(() => {
    let filtrati = f24Dettaglio;

    // Applica filtro date se presente
    if (dateFrom && dateTo) {
      filtrati = filtrati.filter(dettaglio => {
        if (!dettaglio.f24) return false;
        const { mese, anno } = dettaglio.f24;
        const f24Date = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
        return f24Date >= dateFrom && f24Date <= dateTo;
      });
    }

    // Raggruppa per mese/anno
    const grouped = filtrati.reduce((acc: any, dettaglio: any) => {
      if (!dettaglio.f24) return acc;
      const { mese, anno } = dettaglio.f24;
      const key = `${anno}-${mese}`;

      if (!acc[key]) {
        acc[key] = {
          mese,
          anno,
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

    // Converti in array e ordina per data (più recente prima)
    return Object.values(grouped).sort((a: any, b: any) => {
      if (b.anno !== a.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  }, [f24Dettaglio, dateFrom, dateTo]);

  // Combina e ordina tutti i movimenti
  const tuttiMovimenti = useMemo(() => {
    const movimenti = [
      ...bustePagaRaggruppate.map((bp: any) => ({
        tipo: 'Busta Paga',
        mese: bp.mese,
        anno: bp.anno,
        totale: bp.totale,
        count: bp.count,
        icon: Banknote,
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        textColor: 'text-yellow-600'
      })),
      ...f24Raggruppati.map((f24: any) => ({
        tipo: 'F24',
        mese: f24.mese,
        anno: f24.anno,
        totale: f24.totale,
        count: f24.count,
        icon: BadgeEuro,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        textColor: 'text-orange-600'
      }))
    ];

    // Ordina per data (più recente prima)
    return movimenti.sort((a, b) => {
      if (b.anno !== a.anno) return b.anno - a.anno;
      return b.mese - a.mese;
    });
  }, [bustePagaRaggruppate, f24Raggruppati]);

  const totaleCostiPersonale = useMemo(() => {
    return tuttiMovimenti.reduce((sum, m) => sum + m.totale, 0);
  }, [tuttiMovimenti]);

  if (tuttiMovimenti.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
        <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Nessun costo del personale</h3>
        <p className="text-sm text-muted-foreground">
          {dateFrom && dateTo
            ? 'Nessuna ripartizione di buste paga o F24 nel periodo selezionato'
            : 'Non ci sono ancora ripartizioni di buste paga o F24 per questa commessa'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con totale */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <Banknote className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">Costi del Personale</span>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Totale</div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totaleCostiPersonale)}</div>
        </div>
      </div>

      {/* Tabella movimenti */}
      <div className="w-full overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Tipo</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Periodo</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Importo</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {tuttiMovimenti.map((movimento, index) => {
              const Icon = movimento.icon;
              return (
                <tr
                  key={`${movimento.tipo}-${movimento.anno}-${movimento.mese}`}
                  className="border-b border-border hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${movimento.iconBg}`}>
                        <Icon className={`h-4 w-4 ${movimento.iconColor}`} />
                      </div>
                      <span className="font-medium">{movimento.tipo}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium">
                      {MESI[movimento.mese - 1]} {movimento.anno}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-lg font-bold ${movimento.textColor}`}>
                      {formatCurrency(movimento.totale)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // TODO: Aprire dettaglio in sheet
                        // Per ora solo placeholder
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Dettagli
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 border-t-2 border-border">
              <td className="px-6 py-5 text-left text-base font-bold text-foreground" colSpan={2}>
                TOTALE COSTI PERSONALE
              </td>
              <td className="px-6 py-5 text-right text-xl font-bold text-red-600">
                {formatCurrency(totaleCostiPersonale)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
