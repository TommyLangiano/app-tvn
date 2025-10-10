'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface BulkDeleteMovimentiModalProps {
  movimentiIds: string[];
  movimentiData: Array<{
    id: string;
    categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
    numero?: string;
    cliente_fornitore: string;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkDeleteMovimentiModal({
  movimentiIds,
  movimentiData,
  onClose,
  onSuccess,
}: BulkDeleteMovimentiModalProps) {
  const [loading, setLoading] = useState(false);

  const handleBulkDelete = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Raggruppa per categoria
      const byCategoria = movimentiData.reduce((acc, mov) => {
        if (!acc[mov.categoria]) {
          acc[mov.categoria] = [];
        }
        acc[mov.categoria].push(mov.id);
        return acc;
      }, {} as Record<string, string[]>);

      // Elimina da ogni tabella
      const deletePromises = [];

      if (byCategoria['fattura_attiva']?.length > 0) {
        deletePromises.push(
          supabase
            .from('fatture_attive')
            .delete()
            .in('id', byCategoria['fattura_attiva'])
        );
      }

      if (byCategoria['fattura_passiva']?.length > 0) {
        deletePromises.push(
          supabase
            .from('fatture_passive')
            .delete()
            .in('id', byCategoria['fattura_passiva'])
        );
      }

      if (byCategoria['scontrino']?.length > 0) {
        deletePromises.push(
          supabase
            .from('scontrini')
            .delete()
            .in('id', byCategoria['scontrino'])
        );
      }

      const results = await Promise.all(deletePromises);

      // Controlla errori
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw errors[0].error;
      }

      toast.success(`${movimentiIds.length} ${movimentiIds.length === 1 ? 'movimento eliminato' : 'movimenti eliminati'} con successo`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error bulk deleting movimenti:', error);
      toast.error('Errore durante l\'eliminazione dei movimenti');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="bg-background rounded-xl border-2 border-border max-w-md mx-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Elimina Movimenti</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">
              <strong>Attenzione!</strong> Questa azione è irreversibile.
              Stai per eliminare <strong>{movimentiIds.length}</strong> {movimentiIds.length === 1 ? 'movimento' : 'movimenti'}.
              Tutti i dati relativi andranno persi permanentemente.
            </p>
          </div>

          {/* Lista movimenti (max 5) */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {movimentiIds.length === 1 ? 'Movimento selezionato:' : 'Movimenti selezionati:'}
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {movimentiData.slice(0, 5).map((mov) => (
                <div
                  key={mov.id}
                  className="text-sm bg-muted/50 rounded px-3 py-2"
                >
                  {mov.numero && <span className="font-medium">{mov.numero} - </span>}
                  {mov.cliente_fornitore}
                </div>
              ))}
              {movimentiData.length > 5 && (
                <p className="text-sm text-muted-foreground px-3 py-1">
                  ...e altri {movimentiData.length - 5}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-2"
          >
            Annulla
          </Button>
          <Button
            onClick={handleBulkDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Eliminazione...' : 'Elimina Definitivamente'}
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
