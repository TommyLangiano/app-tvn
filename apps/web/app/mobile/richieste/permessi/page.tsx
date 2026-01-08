'use client';

import { memo } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

const ComingSoon = memo(() => (
  <div className="p-12 text-center">
    <div className="flex justify-center mb-4">
      <div className="p-6 rounded-full bg-amber-100">
        <Clock className="w-16 h-16 text-amber-600" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-gray-900 mb-3">
      Permessi
    </h3>
    <p className="text-base text-gray-500 mb-2">
      La gestione dei permessi sarà disponibile a breve
    </p>
    <p className="text-sm text-gray-400">
      Potrai richiedere permessi, ROL e consultare il monte ore disponibile
    </p>
  </div>
));

ComingSoon.displayName = 'ComingSoon';

export default function PermessiPage() {
  return (
    <div className="space-y-6">
      {/* Header verde */}
      <div className="bg-emerald-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mobile/richieste" prefetch={true}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <ArrowLeft className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            </button>
          </Link>
          <h1 className="text-xl font-bold">Permessi</h1>
        </div>
      </div>

      {/* Contenuto */}
      <div className="relative z-10" style={{ marginTop: '-40px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100">
          <ComingSoon />
        </div>
      </div>
    </div>
  );
}
