'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NuovaRichiestaPage() {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mobile/richieste">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuova Richiesta</h1>
          <p className="text-sm text-gray-500">In arrivo prossimamente</p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="p-12 text-center border-2 border-gray-200">
        <div className="text-6xl mb-4">🚧</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Funzionalità in arrivo
        </h3>
        <p className="text-sm text-gray-500">
          La gestione richieste sarà disponibile a breve
        </p>
      </Card>
    </div>
  );
}
