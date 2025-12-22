'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import type { NotaSpesa } from '@/types/nota-spesa';

interface ApprovazioneNotaSpesaModalProps {
  notaSpesa: NotaSpesa;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApprovazioneNotaSpesaModal({ notaSpesa, onClose, onSuccess }: ApprovazioneNotaSpesaModalProps) {
  const [azione, setAzione] = useState<'approva' | 'rifiuta' | null>(null);
  const [motivoRifiuto, setMotivoRifiuto] = useState('');
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

  const handleApprova = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get dipendente_id from user
      const { data: dipendenteData } = await supabase
        .from('dipendenti')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!dipendenteData) throw new Error('Dipendente not found');

      // Call RPC function
      const { error: rpcError } = await supabase.rpc('approva_nota_spesa', {
        p_nota_spesa_id: notaSpesa.id,
        p_approvato_da: dipendenteData.id
      });

      if (rpcError) throw rpcError;

      toast.success('Nota spesa approvata con successo');
      onSuccess();
    } catch (error: any) {
      console.error('Error approving nota spesa:', error);
      toast.error(error?.message || 'Errore nell\'approvazione della nota spesa');
    } finally {
      setLoading(false);
    }
  };

  const handleRifiuta = async () => {
    if (!motivoRifiuto.trim()) {
      toast.error('Inserisci il motivo del rifiuto');
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get dipendente_id from user
      const { data: dipendenteData } = await supabase
        .from('dipendenti')
        .select('id, tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!dipendenteData) throw new Error('Dipendente not found');

      // Call RPC function
      const { error: rpcError } = await supabase.rpc('rifiuta_nota_spesa', {
        p_nota_spesa_id: notaSpesa.id,
        p_rifiutato_da: dipendenteData.id,
        p_motivo: motivoRifiuto
      });

      if (rpcError) throw rpcError;

      toast.success('Nota spesa rifiutata');
      onSuccess();
    } catch (error: any) {
      console.error('Error rejecting nota spesa:', error);
      toast.error(error?.message || 'Errore nel rifiuto della nota spesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto rounded-xl border-2 border-border bg-card shadow-lg animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Approvazione Nota Spesa</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {notaSpesa.numero_nota}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 border-2"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Riepilogo Nota Spesa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Riepilogo</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Dipendente</p>
                <p className="font-semibold">{getUserDisplayName()}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Data</p>
                <p className="font-semibold">{formatDate(notaSpesa.data_nota)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Categoria</p>
                <p className="font-semibold">{notaSpesa.categoria}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Importo</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(notaSpesa.importo)}</p>
              </div>

              {notaSpesa.descrizione && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Descrizione</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{notaSpesa.descrizione}</p>
                  </div>
                </div>
              )}

              {notaSpesa.allegati && notaSpesa.allegati.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Allegati</p>
                  <p className="text-sm font-medium">{notaSpesa.allegati.length} file allegat{notaSpesa.allegati.length === 1 ? 'o' : 'i'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Azione Selection */}
          {!azione && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Azione</h3>
              <p className="text-sm text-muted-foreground">
                Seleziona un'azione per questa nota spesa:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={() => setAzione('approva')}
                  className="h-auto py-6 flex flex-col gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-8 w-8" />
                  <span className="text-lg font-semibold">Approva</span>
                </Button>

                <Button
                  onClick={() => setAzione('rifiuta')}
                  variant="destructive"
                  className="h-auto py-6 flex flex-col gap-2"
                >
                  <XCircle className="h-8 w-8" />
                  <span className="text-lg font-semibold">Rifiuta</span>
                </Button>
              </div>
            </div>
          )}

          {/* Conferma Approvazione */}
          {azione === 'approva' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900 mb-1">
                    Conferma Approvazione
                  </p>
                  <p className="text-sm text-green-700">
                    Stai per approvare questa nota spesa. L'importo di <strong>{formatCurrency(notaSpesa.importo)}</strong> verrà registrato e il dipendente ne sarà notificato.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAzione(null)}
                  disabled={loading}
                  className="border-2 h-11 px-6 font-semibold"
                >
                  Indietro
                </Button>
                <Button
                  onClick={handleApprova}
                  disabled={loading}
                  className="h-11 px-6 font-semibold gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading ? 'Approvazione in corso...' : 'Conferma Approvazione'}
                </Button>
              </div>
            </div>
          )}

          {/* Form Rifiuto */}
          {azione === 'rifiuta' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Rifiuta Nota Spesa
                  </p>
                  <p className="text-sm text-red-700">
                    Il dipendente sarà notificato del rifiuto. Inserisci il motivo per aiutarlo a capire come correggere la nota spesa.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="motivo" className="text-foreground font-medium text-sm mb-2 block">
                  Motivo del Rifiuto <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="motivo"
                  placeholder="Spiega il motivo del rifiuto..."
                  value={motivoRifiuto}
                  onChange={(e) => setMotivoRifiuto(e.target.value)}
                  className="border-2 border-border bg-background resize-none min-h-[120px]"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAzione(null);
                    setMotivoRifiuto('');
                  }}
                  disabled={loading}
                  className="border-2 h-11 px-6 font-semibold"
                >
                  Indietro
                </Button>
                <Button
                  onClick={handleRifiuta}
                  disabled={loading || !motivoRifiuto.trim()}
                  variant="destructive"
                  className="h-11 px-6 font-semibold gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  {loading ? 'Rifiuto in corso...' : 'Conferma Rifiuto'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
}
