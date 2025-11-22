'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, User, Briefcase, Clock, FileText, Edit, Trash2 } from 'lucide-react';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { getSignedUrl } from '@/lib/utils/storage';
import type { Rapportino } from '@/types/rapportino';

interface InfoRapportinoModalProps {
  rapportino: Rapportino;
  rapportini?: Rapportino[];
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function InfoRapportinoModal({ rapportino, rapportini, onClose, onEdit, onDelete }: InfoRapportinoModalProps) {
  const [allegatoUrl, setAllegatoUrl] = useState<string | null>(null);
  const allRapportini = rapportini && rapportini.length > 0 ? rapportini : [rapportino];
  const isSingleRapportino = allRapportini.length === 1;

  useEffect(() => {
    if (rapportino.allegato_url) {
      getSignedUrl(rapportino.allegato_url).then(setAllegatoUrl);
    }
  }, [rapportino.allegato_url]);

  const getUserDisplayName = (rapp: Rapportino) => {
    return rapp.user_name || rapp.user_email?.split('@')[0] || 'Utente';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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

  return (
    <ModalWrapper onClose={onClose}>
      <div className="bg-background rounded-xl border-2 border-border max-w-4xl mx-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isSingleRapportino ? 'Rapportino' : `${allRapportini.length} Rapportini`}
              </h2>
              <p className="text-sm text-muted-foreground">Dettagli Lavoro</p>
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
          {allRapportini.map((rapp, index) => (
            <div key={rapp.id} className={index > 0 ? 'mt-8 pt-8 border-t-2 border-border' : ''}>
              {!isSingleRapportino && (
                <h3 className="text-lg font-semibold text-primary mb-5">
                  Rapportino #{index + 1}
                </h3>
              )}

              <div className="grid grid-cols-3 gap-x-8 gap-y-5">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Operaio</p>
                    <p className="font-semibold break-words">{getUserDisplayName(rapp)}</p>
                    {rapp.user_email && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rapp.user_email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Data Rapportino</p>
                    <p className="font-semibold">{formatDate(rapp.data_rapportino)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Commessa</p>
                    <p className="font-semibold break-words">{rapp.commesse?.titolo || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">Ore Lavorate</p>
                    <p className="text-lg font-bold text-green-600">
                      {rapp.ore_lavorate}h {rapp.tempo_pausa > 0 && <span className="text-xs font-normal text-muted-foreground">({rapp.tempo_pausa}')</span>}
                    </p>
                  </div>
                </div>

                {rapp.tempo_pausa !== null && rapp.tempo_pausa !== undefined && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Pausa</p>
                      <p className="font-semibold">{rapp.tempo_pausa} min</p>
                    </div>
                  </div>
                )}

                {(rapp.orario_inizio || rapp.orario_fine) && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">Orario</p>
                      <p className="font-semibold">
                        {rapp.orario_inizio || '—'} - {rapp.orario_fine || '—'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {rapp.note && (
                <div className="mt-6 rounded-xl border-2 border-border bg-background p-5">
                  <p className="text-sm text-muted-foreground mb-2">Note</p>
                  <p className="text-base whitespace-pre-wrap">{rapp.note}</p>
                </div>
              )}

              {rapp.allegato_url && (
                <div className="mt-5 flex items-start gap-3">
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
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t-2 border-border">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {rapportino.created_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>Aggiunto il {formatDateTime(rapportino.created_at)}</span>
              </div>
            )}
            {rapportino.updated_at && rapportino.updated_at !== rapportino.created_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>Modificato il {formatDateTime(rapportino.updated_at)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {isSingleRapportino && onEdit && (
              <button
                onClick={onEdit}
                className="h-10 px-4 flex items-center gap-2 bg-orange-100 border border-orange-300 rounded-lg hover:border-orange-400 hover:bg-orange-200 transition-all text-orange-700 font-medium"
              >
                <Edit className="h-4 w-4" />
                Modifica
              </button>
            )}
            {isSingleRapportino && onDelete && (
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
