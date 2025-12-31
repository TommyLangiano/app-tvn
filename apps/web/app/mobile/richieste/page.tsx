'use client';

import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';

const EmptyState = memo(() => (
  <Card className="p-12 text-center border-2 border-dashed border-gray-300">
    <div className="flex justify-center mb-4">
      <div className="p-4 rounded-full bg-gray-100">
        <FileText className="w-12 h-12 text-gray-400" />
      </div>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      Nessuna richiesta
    </h3>
    <p className="text-sm text-gray-500 mb-6">
      Le tue richieste di permessi, ferie e malattie appariranno qui
    </p>
    <Link href="/mobile/richieste/nuova" prefetch={true}>
      <Button className="bg-emerald-600 hover:bg-emerald-700">
        <Plus className="w-4 h-4 mr-2" />
        Crea prima richiesta
      </Button>
    </Link>
  </Card>
));

EmptyState.displayName = 'EmptyState';

const InfoCards = memo(() => (
  <div className="grid grid-cols-2 gap-4">
    <Card className="p-4 border-2 border-gray-200">
      <p className="text-xs text-gray-500 mb-1">Ferie rimanenti</p>
      <p className="text-2xl font-bold text-gray-900">20</p>
      <p className="text-xs text-gray-400 mt-1">giorni</p>
    </Card>
    <Card className="p-4 border-2 border-gray-200">
      <p className="text-xs text-gray-500 mb-1">Permessi ROL</p>
      <p className="text-2xl font-bold text-gray-900">32</p>
      <p className="text-xs text-gray-400 mt-1">ore</p>
    </Card>
  </div>
));

InfoCards.displayName = 'InfoCards';

export default function RichiestePage() {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Richieste</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci permessi, ferie e malattie</p>
        </div>
        <Link href="/mobile/richieste/nuova" prefetch={true}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuova
          </Button>
        </Link>
      </div>

      <EmptyState />

      <InfoCards />
    </div>
  );
}
