'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { deleteCustomRole, canDeleteRole } from '@/lib/roles';
import type { CustomRole } from '@/lib/roles';
import { toast } from 'sonner';

interface DeleteRoleModalProps {
  role: CustomRole;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteRoleModal({ role, onClose, onDelete }: DeleteRoleModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      // Verifica se ci sono utenti assegnati
      const canDelete = await canDeleteRole(role.id);
      
      if (!canDelete) {
        toast.error('Impossibile eliminare il ruolo: ci sono utenti assegnati a questo ruolo');
        setLoading(false);
        return;
      }

      const success = await deleteCustomRole(role.id);

      if (!success) {
        throw new Error('Errore durante eliminazione');
      }

      toast.success('Ruolo eliminato con successo');
      onDelete();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Errore durante l\'eliminazione del ruolo');
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
            <h2 className="text-xl font-bold">Elimina Ruolo</h2>
          </div>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="icon"
            className="border-2 border-border bg-white text-foreground hover:bg-white/90"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">
              <strong>Attenzione!</strong> Questa azione e irreversibile.
              Il ruolo verra eliminato permanentemente.
            </p>
          </div>

          {/* Dettagli ruolo */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{role.name}</span>
            </div>
            {role.description && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Descrizione:</span>
                <span className="font-medium text-xs">{role.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">
                {role.is_system_role ? 'Sistema' : 'Personalizzato'}
              </span>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-900">
              <strong>Nota:</strong> Non e possibile eliminare ruoli con utenti assegnati.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-2 border-border bg-white text-foreground hover:bg-white/90"
          >
            Annulla
          </Button>
          <Button
            onClick={handleDelete}
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
