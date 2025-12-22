'use client';

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';

type Movimento = {
  id: string;
  tipo: 'ricavo' | 'costo';
  categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
  numero?: string;
  cliente_fornitore: string;
  tipologia?: string;
  data_emissione: string;
  importo_imponibile?: number;
  importo_iva?: number;
  percentuale_iva?: number;
  importo_totale: number;
  stato_pagamento?: string;
  allegato_url: string | null;
};

interface DeleteMovimentoModalProps {
  movimento: Movimento;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteMovimentoModal({ movimento, onClose, onSuccess }: DeleteMovimentoModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Determina la tabella corretta
      const getTableName = () => {
        switch (movimento.categoria) {
          case 'fattura_attiva':
            return 'fatture_attive';
          case 'fattura_passiva':
            return 'fatture_passive';
          case 'scontrino':
            return 'scontrini';
          default:
            throw new Error('Categoria non valida');
        }
      };

      const { error } = await supabase
        .from(getTableName())
        .delete()
        .eq('id', movimento.id);

      if (error) throw error;

      toast.success('Movimento eliminato con successo');
      onSuccess();
      onClose();
    } catch {

      toast.error('Errore durante l\'eliminazione del movimento');
    } finally {
      setLoading(false);
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    switch (categoria) {
      case 'fattura_attiva':
        return 'Fattura Attiva';
      case 'fattura_passiva':
        return 'Fattura Passiva';
      case 'scontrino':
        return 'Scontrino';
      default:
        return categoria;
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
            <h2 className="text-xl font-bold">Elimina Movimento</h2>
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
              Tutti i dati relativi a questo movimento andranno persi permanentemente.
            </p>
          </div>

          {/* Dettagli movimento */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categoria:</span>
              <span className="font-medium">{getCategoriaLabel(movimento.categoria)}</span>
            </div>
            {movimento.numero && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Numero:</span>
                <span className="font-medium">{movimento.numero}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {movimento.tipo === 'ricavo' ? 'Cliente:' : 'Fornitore:'}
              </span>
              <span className="font-medium">{movimento.cliente_fornitore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totale:</span>
              <span className={`font-bold ${
                movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(movimento.importo_totale)}
              </span>
            </div>
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
