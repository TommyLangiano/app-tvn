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
      toast.error('Errore nell&apos;eliminazione del rapportino');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border-2 border-border max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Elimina Rapportino</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p>
            Sei sicuro di voler eliminare il rapportino di <strong>{getUserDisplayName()}</strong> del{' '}
            <strong>
              {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT')}
            </strong>?
          </p>
          <p className="text-sm text-muted-foreground">
            Questa azione non può essere annullata.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
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
