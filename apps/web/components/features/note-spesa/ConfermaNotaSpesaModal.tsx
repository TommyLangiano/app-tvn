'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { formatCurrency } from '@/lib/utils/currency';
import type { NotaSpesa } from '@/types/nota-spesa';

interface ConfermaNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  tipo: 'approva' | 'rifiuta';
  onClose: () => void;
  onConfirm: (motivo?: string) => Promise<void>;
}

export function ConfermaNotaSpesaModal({ notaSpesa, tipo, onClose, onConfirm }: ConfermaNotaSpesaModalProps) {
  const [motivoRifiuto, setMotivoRifiuto] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMotivo, setErrorMotivo] = useState('');

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

  const handleConfirm = async () => {
    // Validazione per rifiuto
    if (tipo === 'rifiuta') {
      if (!motivoRifiuto.trim()) {
        setErrorMotivo('Il motivo del rifiuto è obbligatorio');
        return;
      }
      if (motivoRifiuto.trim().length < 3) {
        setErrorMotivo('Il motivo deve essere di almeno 3 caratteri');
        return;
      }
    }

    try {
      setLoading(true);
      setErrorMotivo('');
      await onConfirm(tipo === 'rifiuta' ? motivoRifiuto : undefined);
      onClose();
    } catch (error: any) {
      console.error('Error confirming action:', error);
      // L'errore viene gestito dal componente padre con toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-[500px] w-full mx-auto rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
              tipo === 'approva' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {tipo === 'approva' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <h2 className="text-lg font-bold">
              {tipo === 'approva' ? 'Approva Nota Spesa' : 'Rifiuta Nota Spesa'}
            </h2>
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
        <div className="p-5 space-y-4">
          {/* Messaggio Conferma */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
            tipo === 'approva'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            {tipo === 'approva' ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-semibold mb-1 ${
                tipo === 'approva' ? 'text-green-900' : 'text-red-900'
              }`}>
                {tipo === 'approva'
                  ? 'Sei sicuro di voler approvare questa nota spesa?'
                  : 'Sei sicuro di voler rifiutare questa nota spesa?'}
              </p>
            </div>
          </div>

          {/* Riepilogo Nota Spesa */}
          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Numero:</span>
              <span className="text-sm font-semibold">{notaSpesa.numero_nota}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dipendente:</span>
              <span className="text-sm font-semibold">{getUserDisplayName()}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Data:</span>
              <span className="text-sm font-semibold">{formatDate(notaSpesa.data_nota)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Categoria:</span>
              <span className="text-sm font-semibold">
                {notaSpesa.categorie_note_spesa?.nome || notaSpesa.categoria}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Importo:</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(notaSpesa.importo)}</span>
            </div>

            {notaSpesa.descrizione && (
              <div className="pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground block mb-1">Descrizione:</span>
                <p className="text-sm text-foreground line-clamp-2">{notaSpesa.descrizione}</p>
              </div>
            )}

            {notaSpesa.allegati && notaSpesa.allegati.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Allegati:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {notaSpesa.allegati.length} {notaSpesa.allegati.length === 1 ? 'file' : 'file'}
                </span>
              </div>
            )}
          </div>

          {/* Campo Motivo Rifiuto - Solo se tipo='rifiuta' */}
          {tipo === 'rifiuta' && (
            <div>
              <Label htmlFor="motivo" className="text-foreground font-medium text-sm mb-2 block">
                Motivo del Rifiuto <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="motivo"
                placeholder="Inserisci il motivo del rifiuto (minimo 3 caratteri)..."
                value={motivoRifiuto}
                onChange={(e) => {
                  setMotivoRifiuto(e.target.value);
                  setErrorMotivo('');
                }}
                className={`border-2 bg-background resize-none min-h-[100px] ${
                  errorMotivo ? 'border-red-500' : 'border-border'
                }`}
                required
                disabled={loading}
              />
              {errorMotivo && (
                <p className="text-sm text-red-600 mt-1">{errorMotivo}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
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
              onClick={handleConfirm}
              disabled={loading || (tipo === 'rifiuta' && !motivoRifiuto.trim())}
              className={`h-11 px-6 font-semibold gap-2 ${
                tipo === 'approva'
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }`}
              variant={tipo === 'rifiuta' ? 'destructive' : 'default'}
            >
              {tipo === 'approva' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {loading
                ? (tipo === 'approva' ? 'Approvazione...' : 'Rifiuto...')
                : (tipo === 'approva' ? 'Conferma Approvazione' : 'Conferma Rifiuto')}
            </Button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
