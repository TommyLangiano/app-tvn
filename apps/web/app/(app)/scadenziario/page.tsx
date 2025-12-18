'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

export default function ScadenziarioPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Scadenziario</h1>
            <p className="text-sm text-muted-foreground">
              Gestisci scadenze e pagamenti
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-border bg-card/50">
        <div className="text-center space-y-3">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-medium">Scadenziario</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Qui potrai gestire tutte le scadenze e i pagamenti
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
