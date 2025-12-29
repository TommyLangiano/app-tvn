'use client';

import { CreditCard } from 'lucide-react';

export default function NoteSpesaPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Note Spesa</h1>
            <p className="text-sm text-muted-foreground">
              Gestisci le note spesa dei dipendenti
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border-2 border-border bg-card p-12">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Note Spesa</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Qui potrai gestire le note spesa dei dipendenti, approvarle e tracciarne i rimborsi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
