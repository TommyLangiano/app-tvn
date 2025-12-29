'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
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
      onDelete();
    } catch {
      toast.error('Errore nell\'eliminazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border-2 border-border max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Elimina Rapportino</h3>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 border-2 flex-shrink-0"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600">
            Sei sicuro di voler eliminare questo rapportino?
          </p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Dipendente:</span>
              <span className="text-gray-900">{getUserDisplayName()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Data:</span>
              <span className="text-gray-900">
                {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Ore:</span>
              <span className="text-gray-900 font-semibold">{rapportino.ore_lavorate}h</span>
            </div>
            {rapportino.commesse && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Commessa:</span>
                <span className="text-gray-900">{rapportino.commesse.nome_commessa}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 italic">
            Questa azione non può essere annullata.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-2"
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Eliminazione...' : 'Elimina'}
          </Button>
        </div>
      </div>
    </div>
  );
}
