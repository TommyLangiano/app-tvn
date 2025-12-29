'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Rapportino } from '@/types/rapportino';

interface DeleteRapportinoModalProps {
  rapportino: Rapportino;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteRapportinoModal({ rapportino, onClose, onDelete }: DeleteRapportinoModalProps) {
  const [loading, setLoading] = useState(false);

  const getUserDisplayName = () => {
    if (rapportino.dipendenti) {
      return `${rapportino.dipendenti.nome} ${rapportino.dipendenti.cognome}`;
    }
    return rapportino.user_name || rapportino.user_email?.split('@')[0] || 'Utente';
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Delete file if exists
      if (rapportino.allegato_url) {
        await supabase.storage
          .from('app-storage')
          .remove([rapportino.allegato_url]);
      }

      // Delete rapportino
      const { error } = await supabase
        .from('rapportini')
        .delete()
        .eq('id', rapportino.id);

      if (error) throw error;

      toast.success('Rapportino eliminato con successo');
      onClose(); // Chiudi il modal
      onDelete(); // Ricarica i dati
    } catch {
      toast.error('Errore nell\'eliminazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  return typeof window !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4 relative animate-in zoom-in-95 duration-200 border-2 border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Elimina Rapportino
            </h3>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="h-8 w-8 border-2 flex-shrink-0"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Sei sicuro di voler eliminare questo rapportino?
          </p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Operaio:</span>
              <span className="font-semibold">{getUserDisplayName()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Data:</span>
              <span className="font-semibold">
                {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ore Lavorate:</span>
              <span className="font-semibold">{rapportino.ore_lavorate}h</span>
            </div>
            {rapportino.commesse?.titolo && (
              <div className="flex justify-between">
                <span className="text-gray-600">Commessa:</span>
                <span className="font-semibold">{rapportino.commesse.titolo}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-red-600 font-medium">
            Questa azione non può essere annullata.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={loading}
            className="border-2"
          >
            Annulla
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}
