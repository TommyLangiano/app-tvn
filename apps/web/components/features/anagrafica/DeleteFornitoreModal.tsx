'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Fornitore = {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore: string;
  email?: string;
  telefono?: string;
};

interface DeleteFornitoreModalProps {
  fornitore: Fornitore;
  onClose: () => void;
  onDelete: () => void;
}

export function DeleteFornitoreModal({ fornitore, onClose, onDelete }: DeleteFornitoreModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('fornitori')
        .delete()
        .eq('id', fornitore.id);

      if (error) throw error;

      toast.success('Fornitore eliminato con successo');
      onDelete();
    } catch (error) {

      toast.error('Errore durante l\'eliminazione del Fornitore');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      return `${fornitore.cognome || ''} ${fornitore.nome || ''}`.trim();
    }
    return fornitore.ragione_sociale || 'N/A';
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
            <h2 className="text-xl font-bold">Elimina Fornitore</h2>
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
              <strong>Attenzione!</strong> Questa azione è irreversibile.
              Tutti i dati relativi a questo Fornitore andranno persi permanentemente.
            </p>
          </div>

          {/* Dettagli Fornitore */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{getDisplayName()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium">
                {fornitore.forma_giuridica === 'persona_fisica' ? 'Persona Fisica' : 'Persona Giuridica'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Settore:</span>
              <span className="font-medium">{fornitore.tipologia_settore}</span>
            </div>
            {fornitore.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{fornitore.email}</span>
              </div>
            )}
            {fornitore.telefono && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefono:</span>
                <span className="font-medium">{fornitore.telefono}</span>
              </div>
            )}
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
