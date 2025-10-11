'use client';

import { X, Calendar, User, Briefcase, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import type { Rapportino } from '@/types/rapportino';

interface InfoRapportinoModalProps {
  rapportino: Rapportino;
  onClose: () => void;
}

export function InfoRapportinoModal({ rapportino, onClose }: InfoRapportinoModalProps) {
  const getUserDisplayName = () => {
    if (!rapportino.user) return 'Utente';
    const metadata = rapportino.user.user_metadata;
    return metadata?.full_name || rapportino.user.email?.split('@')[0] || 'Utente';
  };

  return (
    <ModalWrapper onClose={onClose}>
      <div className="bg-background rounded-xl border-2 border-border max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <h2 className="text-2xl font-bold">Dettagli Rapportino</h2>
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
        <div className="p-6 space-y-6">
          {/* Operaio */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              <span className="font-semibold">Operaio</span>
            </div>
            <p className="text-lg pl-6">{getUserDisplayName()}</p>
            {rapportino.user?.email && (
              <p className="text-sm text-muted-foreground pl-6">{rapportino.user.email}</p>
            )}
          </div>

          {/* Data */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">Data Rapportino</span>
            </div>
            <p className="text-lg pl-6">
              {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Commessa */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Briefcase className="h-4 w-4" />
              <span className="font-semibold">Commessa</span>
            </div>
            <p className="text-lg pl-6">{rapportino.commessa?.titolo || 'N/A'}</p>
          </div>

          {/* Ore Lavorate */}
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="font-semibold">Ore Lavorate</span>
            </div>
            <p className="text-lg pl-6 font-semibold text-emerald-600 dark:text-emerald-400">
              {rapportino.ore_lavorate} ore
            </p>
          </div>

          {/* Note */}
          {rapportino.note && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-semibold">Note</span>
              </div>
              <p className="text-base pl-6 whitespace-pre-wrap">{rapportino.note}</p>
            </div>
          )}

          {/* Allegato */}
          {rapportino.allegato_url && (
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                <span className="font-semibold">Allegato</span>
              </div>
              <div className="pl-6">
                <Button variant="outline" size="sm">
                  Visualizza Documento →
                </Button>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Creato il {new Date(rapportino.created_at).toLocaleString('it-IT')}
            </p>
            {rapportino.updated_at !== rapportino.created_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Modificato il {new Date(rapportino.updated_at).toLocaleString('it-IT')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-border">
          <Button onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
