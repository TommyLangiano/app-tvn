'use client';

// Componente temporaneo che riutilizza MovimentiTab
// TODO: Semplificare ulteriormente rimuovendo le card di riepilogo

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
  // Per ora wrappa MovimentiTab, in futuro semplificheremo
  return (
    <MovimentiTab
      commessaId={commessaId}
      fattureAttive={fattureAttive}
      fatturePassive={fatturePassive}
      riepilogo={null}
      bustePagaDettaglio={[]}
      f24Dettaglio={[]}
      onReload={onReload}
    />
  );
}
