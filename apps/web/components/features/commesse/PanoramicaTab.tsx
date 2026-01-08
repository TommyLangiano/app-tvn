'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, FileText, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { FatturaPassiva } from '@/types/fattura';
import type { NotaSpesa } from '@/types/nota-spesa';
import { ConfermaNotaSpesaModal } from '@/components/features/note-spesa/ConfermaNotaSpesaModal';
import { InfoNotaSpesaModal } from '@/components/features/note-spesa/InfoNotaSpesaModal';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PanoramicaTabProps {
  commessaId: string;
  fatturePassive: FatturaPassiva[];
  noteSpeseDaApprovare: NotaSpesa[];
  onTabChange: (tab: string, subTab?: string, fatturaId?: string) => void;
  onReload?: () => void;
}

export function PanoramicaTab({ commessaId, fatturePassive, noteSpeseDaApprovare, onTabChange, onReload }: PanoramicaTabProps) {
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [modalTipo, setModalTipo] = useState<'approva' | 'rifiuta' | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleApprova = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setModalTipo('approva');
  };

  const handleRifiuta = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setModalTipo('rifiuta');
  };

  const handleConfirmAzione = async (motivo?: string) => {
    if (!selectedNotaSpesa || !modalTipo) return;

    try {
      const supabase = createClient();
      const nuovoStato = modalTipo === 'approva' ? 'approvato' : 'rifiutato';

      const { error } = await supabase
        .from('note_spesa')
        .update({ stato: nuovoStato })
        .eq('id', selectedNotaSpesa.id);

      if (error) throw error;

      toast.success(
        modalTipo === 'approva'
          ? 'Nota spesa approvata con successo'
          : 'Nota spesa rifiutata'
      );

      setModalTipo(null);
      setSelectedNotaSpesa(null);

      if (onReload) {
        onReload();
      }
    } catch (error) {
      console.error('Error updating nota spesa:', error);
      toast.error('Errore durante l\'operazione');
    }
  };

  const handleOpenDettaglio = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setIsSheetOpen(true);
  };

  const getUserDisplayName = (notaSpesa: NotaSpesa) => {
    const dipendente = notaSpesa.dipendenti;
    if (dipendente) {
      return `${dipendente.nome} ${dipendente.cognome}`;
    }
    return 'N/A';
  };

  // Filtra fatture in scadenza - prima le scadute, poi le in scadenza
  const fattureInScadenza = useMemo(() => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const setteGiorniDopo = new Date(oggi);
    setteGiorniDopo.setDate(setteGiorniDopo.getDate() + 7);

    // Filtra fatture con scadenza e ordina: prima scadute (dalla più vecchia), poi in scadenza (dalla più vicina)
    return fatturePassive
      .filter(f => {
        if (!f.scadenza_pagamento) return false;
        const scadenza = new Date(f.scadenza_pagamento);
        scadenza.setHours(0, 0, 0, 0);

        // Fatture con scadenza fino a +7 giorni (include anche quelle già scadute)
        return scadenza <= setteGiorniDopo;
      })
      .sort((a, b) => {
        const scadenzaA = new Date(a.scadenza_pagamento!);
        const scadenzaB = new Date(b.scadenza_pagamento!);
        scadenzaA.setHours(0, 0, 0, 0);
        scadenzaB.setHours(0, 0, 0, 0);

        // Ordina per data di scadenza: le più vecchie prima (scadute), poi le più vicine
        return scadenzaA.getTime() - scadenzaB.getTime();
      })
      .slice(0, 3); // Solo le prime 3
  }, [fatturePassive]);

  // Ultime 3 note spesa da approvare
  const ultimeTreNoteDaApprovare = useMemo(() => {
    return noteSpeseDaApprovare
      .sort((a, b) => {
        // Ordina per data più recente
        const dataA = new Date(a.data_nota);
        const dataB = new Date(b.data_nota);
        return dataB.getTime() - dataA.getTime();
      })
      .slice(0, 3);
  }, [noteSpeseDaApprovare]);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Colonna sinistra - Cards verticali */}
      <div className="space-y-6">
        {/* Card Fatture in Scadenza */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Fatture in Scadenza</h3>
            <button
              onClick={() => {
                console.log('🔍 PanoramicaTab - Click Visualizza tutto, chiamando onTabChange con:', 'economia', 'fatture');
                onTabChange('economia', 'fatture');
              }}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Visualizza tutto
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {fattureInScadenza.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna fattura in scadenza
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-border">
                  <th className="px-4 py-6 text-left text-sm font-semibold">N. Fattura</th>
                  <th className="px-4 py-6 text-left text-sm font-semibold">Fornitore</th>
                  <th className="px-4 py-6 text-right text-sm font-semibold">Importo</th>
                  <th className="px-4 py-6 text-right text-sm font-semibold">Scadenza</th>
                </tr>
              </thead>
              <tbody>
                {fattureInScadenza.map((fattura) => {
                  const scadenza = new Date(fattura.scadenza_pagamento!);
                  scadenza.setHours(0, 0, 0, 0);
                  const oggi = new Date();
                  oggi.setHours(0, 0, 0, 0);
                  const giorniMancanti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr
                      key={fattura.id}
                      onClick={() => onTabChange('economia', 'fatture', fattura.id)}
                      className="border-b border-border last:border-0 hover:bg-green-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{fattura.numero_fattura}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{fattura.fornitore}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {formatCurrency(fattura.importo_totale)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs text-muted-foreground mb-1">
                          {format(scadenza, 'd MMM yyyy', { locale: it })}
                        </div>
                        <div className={`text-xs font-medium ${
                          giorniMancanti < 0
                            ? 'text-red-600'
                            : giorniMancanti === 0
                            ? 'text-red-600'
                            : giorniMancanti === 1
                            ? 'text-orange-600'
                            : 'text-yellow-600'
                        }`}>
                          {giorniMancanti < 0
                            ? `Scaduta da ${Math.abs(giorniMancanti)} giorni`
                            : giorniMancanti === 0
                            ? 'Scade oggi'
                            : giorniMancanti === 1
                            ? 'Scade domani'
                            : `Scade tra ${giorniMancanti} giorni`}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Card Note Spesa da Approvare */}
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Note Spesa da Approvare</h3>
            <button
              onClick={() => onTabChange('note-spesa', 'da_approvare')}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Visualizza tutto
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {ultimeTreNoteDaApprovare.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna nota spesa da approvare
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-border">
                  <th className="px-4 py-6 text-left text-sm font-semibold">Dipendente</th>
                  <th className="px-4 py-6 text-left text-sm font-semibold">Descrizione</th>
                  <th className="px-4 py-6 text-right text-sm font-semibold">Importo</th>
                  <th className="px-4 py-6 text-right text-sm font-semibold">Data</th>
                  <th className="px-4 py-6 text-center text-sm font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {ultimeTreNoteDaApprovare.map((nota) => {
                  const dataNota = new Date(nota.data_nota);

                  return (
                    <tr
                      key={nota.id}
                      onClick={() => handleOpenDettaglio(nota)}
                      className="border-b border-border last:border-0 hover:bg-green-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {getUserDisplayName(nota)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {nota.descrizione}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {formatCurrency(nota.importo)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-xs text-muted-foreground">
                          {format(dataNota, 'd MMM yyyy', { locale: it })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprova(nota);
                            }}
                            className="inline-flex items-center justify-center bg-green-50 border-2 border-green-300 hover:bg-green-100 hover:border-green-400 rounded-md p-2.5 transition-all group"
                            title="Approva"
                          >
                            <CheckCircle className="h-5 w-5 text-green-600 group-hover:text-green-700" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRifiuta(nota);
                            }}
                            className="inline-flex items-center justify-center bg-red-50 border-2 border-red-300 hover:bg-red-100 hover:border-red-400 rounded-md p-2.5 transition-all group"
                            title="Rifiuta"
                          >
                            <XCircle className="h-5 w-5 text-red-600 group-hover:text-red-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Colonna destra - Placeholder per future features */}
      <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Altre visualizzazioni in arrivo</p>
      </div>

      {/* Modali */}
      {selectedNotaSpesa && modalTipo && (
        <ConfermaNotaSpesaModal
          onClose={() => {
            setModalTipo(null);
            setSelectedNotaSpesa(null);
          }}
          onConfirm={handleConfirmAzione}
          tipo={modalTipo}
          notaSpesa={selectedNotaSpesa}
        />
      )}

      {selectedNotaSpesa && isSheetOpen && (
        <InfoNotaSpesaModal
          isOpen={isSheetOpen}
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) setSelectedNotaSpesa(null);
          }}
          onUpdate={() => {
            // Refresh data if needed
          }}
          notaSpesa={selectedNotaSpesa}
        />
      )}
    </div>
  );
}
