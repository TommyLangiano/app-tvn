'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import type { NotaSpesa } from '@/types/nota-spesa';

interface DeleteNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteNotaSpesaModal({ notaSpesa, onClose, onDelete }: DeleteNotaSpesaModalProps) {
  const [loading, setLoading] = useState(false);

  const getUserDisplayName = () => {
    if (notaSpesa.dipendenti) {
      return `${notaSpesa.dipendenti.nome} ${notaSpesa.dipendenti.cognome}`;
    }
    return 'Utente';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) throw new Error('No tenant found');

      // Delete allegati from storage
      if (notaSpesa.allegati && notaSpesa.allegati.length > 0) {
        const filePaths = notaSpesa.allegati.map(a => a.file_path);
        await supabase.storage
          .from('app-storage')
          .remove(filePaths);
      }

      // Create azione log before deletion
      await supabase
        .from('note_spesa_azioni')
        .insert({
          nota_spesa_id: notaSpesa.id,
          tenant_id: userTenants.tenant_id,
          azione: 'eliminata',
          eseguita_da: user.id,
          stato_precedente: notaSpesa.stato,
        });

      // Delete nota spesa
      const { error: deleteError } = await supabase
        .from('note_spesa')
        .delete()
        .eq('id', notaSpesa.id);

      if (deleteError) throw deleteError;

      toast.success('Nota spesa eliminata con successo');
      onDelete();
      onClose();
    } catch (error: any) {
      console.error('Error deleting nota spesa:', error);
      toast.error(error?.message || 'Errore nell\'eliminazione della nota spesa');
    } finally {
      setLoading(false);
    }
  };

  return typeof window !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="max-w-lg w-full mx-4 rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold">Elimina Nota Spesa</h2>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 border-2"
            type="button"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900 mb-1">
                Attenzione: questa azione è irreversibile
              </p>
              <p className="text-sm text-red-700">
                La nota spesa e tutti gli allegati associati verranno eliminati definitivamente dal sistema.
              </p>
            </div>
          </div>

          {/* Nota Spesa Details */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Numero:</span>
              <span className="font-semibold">{notaSpesa.numero_nota}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dipendente:</span>
              <span className="font-semibold">{getUserDisplayName()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Data:</span>
              <span className="font-semibold">{formatDate(notaSpesa.data_nota)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Categoria:</span>
              <span className="font-semibold">{notaSpesa.categoria}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Importo:</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(notaSpesa.importo)}</span>
            </div>

            {notaSpesa.allegati && notaSpesa.allegati.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Allegati:</span>
                <span className="font-semibold">
                  {notaSpesa.allegati.length} file
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Stato:</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                notaSpesa.stato === 'approvato' ? 'bg-green-100 text-green-700' :
                notaSpesa.stato === 'da_approvare' ? 'bg-yellow-100 text-yellow-700' :
                notaSpesa.stato === 'rifiutato' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {notaSpesa.stato === 'approvato' ? 'Approvata' :
                 notaSpesa.stato === 'da_approvare' ? 'Da Approvare' :
                 notaSpesa.stato === 'rifiutato' ? 'Rifiutata' :
                 'Bozza'}
              </span>
            </div>
          </div>

          {/* Confirm Message */}
          <p className="text-sm text-center text-muted-foreground">
            Sei sicuro di voler eliminare questa nota spesa?
          </p>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="border-2 h-11 px-6 font-semibold"
            >
              Annulla
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="destructive"
              className="h-11 px-6 font-semibold gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? 'Eliminazione in corso...' : 'Elimina Definitivamente'}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}
