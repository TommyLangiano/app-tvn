'use client';

import { useState, useEffect } from 'react';
import { FileText, Trash2, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getSignedUrl } from '@/lib/utils/storage';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import type { BustaPaga, BustaPagaDettaglio } from '@/types/busta-paga';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface DettaglioBustaPagaSheetProps {
  bustaPaga: BustaPaga;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  onDelete?: () => void;
}

export function DettaglioBustaPagaSheet({
  bustaPaga,
  isOpen,
  onOpenChange,
  onUpdate,
  onDelete,
}: DettaglioBustaPagaSheetProps) {
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);
  const [dettagli, setDettagli] = useState<BustaPagaDettaglio[]>([]);
  const [loadingDettagli, setLoadingDettagli] = useState(true);

  useEffect(() => {
    if (bustaPaga.allegato_url) {
      getSignedUrl(bustaPaga.allegato_url).then(setAllegatoUrl);
    }
  }, [bustaPaga.allegato_url]);

  useEffect(() => {
    if (isOpen) {
      loadDettagli();
    }
  }, [isOpen, bustaPaga.id]);

  const loadDettagli = async () => {
    setLoadingDettagli(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('buste_paga_dettaglio')
        .select(`
          *,
          commesse (
            nome_commessa,
            codice_commessa
          )
        `)
        .eq('busta_paga_id', bustaPaga.id)
        .order('ore_commessa', { ascending: false });

      if (error) throw error;
      setDettagli(data || []);
    } catch (error) {
      console.error('Error loading dettagli:', error);
      toast.error('Errore nel caricamento dei dettagli');
    } finally {
      setLoadingDettagli(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    if (!confirm(`Sei sicuro di voler eliminare questa busta paga?`)) {
      return;
    }

    try {
      const supabase = createClient();

      // Elimina il file se esiste
      if (bustaPaga.allegato_url) {
        await supabase.storage
          .from('app-storage')
          .remove([bustaPaga.allegato_url]);
      }

      // Elimina la busta paga
      const { error } = await supabase
        .from('buste_paga')
        .delete()
        .eq('id', bustaPaga.id);

      if (error) throw error;

      toast.success('Busta paga eliminata con successo');
      onOpenChange(false);
      onDelete();
    } catch (error) {
      console.error('Error deleting busta paga:', error);
      toast.error('Errore nell\'eliminazione della busta paga');
    }
  };

  const handleOpenFile = async () => {
    if (!allegatoUrl) return;
    window.open(allegatoUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetTitle className="sr-only">Dettaglio Busta Paga</SheetTitle>

        {/* Header con azioni */}
        <div className="sticky top-0 bg-white z-10 pb-4 border-b border-border mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Busta Paga - {MESI[bustaPaga.mese - 1]} {bustaPaga.anno}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {bustaPaga.dipendenti?.cognome} {bustaPaga.dipendenti?.nome}
                {bustaPaga.dipendenti?.matricola && ` - Matricola: ${bustaPaga.dipendenti.matricola}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </Button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenuto */}
        <div className="space-y-6">
          {/* Riepilogo Importi */}
          <div className="bg-primary/5 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Riepilogo</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ore Totali</p>
                <p className="text-2xl font-bold text-primary">
                  {Number(bustaPaga.ore_totali).toFixed(2)} h
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Importo Totale</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(bustaPaga.importo_totale))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Costo Orario</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(Number(bustaPaga.costo_orario))}/h
                </p>
              </div>
            </div>
          </div>

          {/* Suddivisione per Commessa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Suddivisione per Commessa</h3>

            {loadingDettagli ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Caricamento dettagli...</p>
              </div>
            ) : dettagli.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-900">
                  Nessun dettaglio disponibile
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {dettagli.map((dettaglio) => (
                  <div
                    key={dettaglio.id}
                    className="bg-white border border-border rounded-lg overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">
                            {(dettaglio.commesse as any)?.nome_commessa || 'Commessa sconosciuta'}
                          </h4>
                          {(dettaglio.commesse as any)?.codice_commessa && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Codice: {(dettaglio.commesse as any).codice_commessa}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Ore Lavorate</p>
                          <p className="text-lg font-bold text-primary">
                            {Number(dettaglio.ore_commessa).toFixed(2)} h
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Importo</p>
                          <p className="text-lg font-bold text-foreground">
                            {formatCurrency(Number(dettaglio.importo_commessa))}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Percentuale sul totale:</span>
                          <span className="font-semibold">
                            {bustaPaga.ore_totali > 0
                              ? ((Number(dettaglio.ore_commessa) / Number(bustaPaga.ore_totali)) * 100).toFixed(1)
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          {bustaPaga.note && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Note</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{bustaPaga.note}</p>
              </div>
            </div>
          )}

          {/* Allegato */}
          {bustaPaga.allegato_url && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Allegato</h3>
              <Button
                variant="outline"
                onClick={handleOpenFile}
                disabled={!allegatoUrl}
                className="w-full justify-start gap-2 h-auto py-3"
              >
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex flex-col items-start">
                  <span className="font-medium">Visualizza Allegato</span>
                  <span className="text-xs text-muted-foreground">
                    Clicca per aprire il file
                  </span>
                </div>
              </Button>
            </div>
          )}

          {/* Info di sistema */}
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Creata il: {formatDate(bustaPaga.created_at)}
            </p>
            {bustaPaga.updated_at !== bustaPaga.created_at && (
              <p className="text-xs text-muted-foreground">
                Ultima modifica: {formatDate(bustaPaga.updated_at)}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
