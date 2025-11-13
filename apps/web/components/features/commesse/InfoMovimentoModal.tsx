'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, FileText, CreditCard, User, Hash, Tag, CheckCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { getSignedUrl } from '@/lib/utils/storage';

type Movimento = {
  id: string;
  tipo: 'ricavo' | 'costo';
  categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
  numero?: string;
  cliente_fornitore: string;
  tipologia: string;
  data_emissione: string;
  data_pagamento?: string;
  importo_imponibile?: number;
  importo_iva?: number;
  aliquota_iva?: number;
  percentuale_iva?: number;
  importo_totale: number;
  stato_pagamento?: string;
  modalita_pagamento?: string;
  allegato_url: string | null;
  created_at?: string;
  updated_at?: string;
};

interface InfoMovimentoModalProps {
  movimento: Movimento;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function InfoMovimentoModal({ movimento, onClose, onEdit, onDelete }: InfoMovimentoModalProps) {
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (movimento.allegato_url) {
      getSignedUrl(movimento.allegato_url).then(setAllegatoUrl);
    }
  }, [movimento.allegato_url]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="bg-background rounded-xl border-2 border-border max-w-4xl mx-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              movimento.tipo === 'ricavo' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <FileText className={`h-5 w-5 ${
                movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{getCategoriaLabel(movimento.categoria)}</h2>
              <p className="text-sm text-muted-foreground">Dettagli Pagamento</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all flex-shrink-0"
            title="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-x-8 gap-y-5">
            {movimento.numero && (
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">N. Fattura</p>
                  <p className="font-semibold break-words">{movimento.numero}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">
                  {movimento.tipo === 'ricavo' ? 'Cliente' : 'Fornitore'}
                </p>
                <p className="font-semibold break-words">{movimento.cliente_fornitore}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Tipologia</p>
                <p className="font-semibold break-words">{movimento.tipologia}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Data Emissione</p>
                <p className="font-semibold">{formatDate(movimento.data_emissione)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Data Pagamento</p>
                <p className="font-semibold">
                  {movimento.data_pagamento ? formatDate(movimento.data_pagamento) : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Modalità Pagamento</p>
                <p className="font-semibold">{movimento.modalita_pagamento || '—'}</p>
              </div>
            </div>
          </div>

          {/* Sezione Importi in stile fattura */}
          {movimento.categoria !== 'scontrino' && (
            <div className="mt-6 rounded-xl border-2 border-border bg-background p-5 space-y-4">
              {movimento.importo_imponibile !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Imponibile</span>
                  <span className="text-lg font-semibold">{formatCurrency(movimento.importo_imponibile)}</span>
                </div>
              )}

              {(movimento.aliquota_iva !== undefined || movimento.percentuale_iva !== undefined) && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Aliquota IVA</span>
                  <span className="text-lg font-semibold">
                    {movimento.aliquota_iva || movimento.percentuale_iva}%
                  </span>
                </div>
              )}

              {movimento.importo_iva !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Importo IVA</span>
                  <span className="text-lg font-semibold">{formatCurrency(movimento.importo_iva)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t-2 border-border">
                <span className="text-base font-bold">Importo Totale</span>
                <span className={`text-2xl font-bold ${
                  movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(movimento.importo_totale)}
                </span>
              </div>
            </div>
          )}

          {/* Solo totale per scontrini */}
          {movimento.categoria === 'scontrino' && (
            <div className="mt-6 rounded-xl border-2 border-border bg-background p-5">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold">Importo Totale</span>
                <span className={`text-2xl font-bold ${
                  movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(movimento.importo_totale)}
                </span>
              </div>
            </div>
          )}

          {/* Altri campi */}
          <div className="grid grid-cols-3 gap-x-8 gap-y-5 mt-6">

            {movimento.allegato_url && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Allegato</p>
                  {allegatoUrl ? (
                    <a
                      href={allegatoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Visualizza Documento →
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">Caricamento...</span>
                  )}
                </div>
              </div>
            )}

            {movimento.stato_pagamento && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Stato Pagamento</p>
                  <span className={`inline-flex px-3 py-1 rounded text-sm font-semibold ${
                    movimento.stato_pagamento === 'Pagato'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-orange-50 text-orange-700'
                  }`}>
                    {movimento.stato_pagamento}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t-2 border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {movimento.created_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>Aggiunto il {formatDateTime(movimento.created_at)}</span>
              </div>
            )}
            {movimento.updated_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>Modificato il {formatDateTime(movimento.updated_at)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="h-10 px-4 flex items-center gap-2 bg-orange-100 border border-orange-300 rounded-lg hover:border-orange-400 hover:bg-orange-200 transition-all text-orange-700 font-medium"
              >
                <Edit className="h-4 w-4" />
                Modifica
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="h-10 px-4 flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg hover:border-red-400 hover:bg-red-200 transition-all text-red-700 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Elimina
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
