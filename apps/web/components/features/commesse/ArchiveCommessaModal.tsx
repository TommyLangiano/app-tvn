'use client';

import { Button } from '@/components/ui/button';
import { X, Archive } from 'lucide-react';

interface ArchiveCommessaModalProps {
  commessaNome: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ArchiveCommessaModal({
  commessaNome,
  onConfirm,
  onCancel,
}: ArchiveCommessaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg animate-in zoom-in-95 duration-200">
        <div className="rounded-xl border-2 border-border bg-card p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Archive className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Archivia commessa</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Spostamento temporaneo
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 border-2 border-border bg-white text-foreground hover:bg-white/90"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Stai per archiviare la commessa <strong>{commessaNome}</strong>.
            </p>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>I dati non andranno persi</strong> ma verranno spostati nell&apos;archivio in modo temporaneo.
                Potrai decidere in seguito se riportarla nelle commesse attive o eliminarla definitivamente.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-2 border-border bg-white text-foreground hover:bg-white/90"
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={onConfirm}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Archivia commessa
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
