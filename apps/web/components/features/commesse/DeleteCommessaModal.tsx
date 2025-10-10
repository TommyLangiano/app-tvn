'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface DeleteCommessaModalProps {
  commessaNome: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteCommessaModal({
  commessaNome,
  onConfirm,
  onCancel,
}: DeleteCommessaModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [showFinalConfirm, setShowFinalConfirm] = useState(false);
  const isValid = inputValue === commessaNome;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      setShowFinalConfirm(true);
    }
  };

  const handleFinalConfirm = () => {
    onConfirm();
  };

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
            <div>
              <h2 className="text-xl font-bold text-red-600">Elimina commessa</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Azione irreversibile
              </p>
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
            {!showFinalConfirm ? (
              <>
                <p className="text-sm text-foreground">
                  Stai andando ad eliminare la commessa <strong>{commessaNome}</strong> in modo definitivo.
                  I dati saranno cancellati e non sarà più possibile recuperarli.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="confirm-name" className="text-sm font-medium">
                      Per confermare, inserisci esattamente il nome della commessa:
                    </Label>
                    <Input
                      id="confirm-name"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={commessaNome}
                      className="border-2"
                      autoComplete="off"
                    />
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
                      type="submit"
                      disabled={!isValid}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continua
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="bg-red-50 border-2 border-red-600 rounded-lg p-4">
                  <p className="text-base font-bold text-red-600 text-center uppercase">
                    SEI PROPRIO SICURO?
                  </p>
                  <p className="text-sm text-red-600 text-center mt-2">
                    TUTTI I DATI ANDRANNO PERSI PERMANENTEMENTE
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFinalConfirm(false)}
                    className="border-2 border-border bg-white text-foreground hover:bg-white/90"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFinalConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    ELIMINA DEFINITIVAMENTE
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
