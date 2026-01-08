'use client';

import { memo } from 'react';
import { Plus, Receipt, Plane, Clock } from 'lucide-react';
import Link from 'next/link';

interface TipologiaRichiestaCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href: string;
  iconBgColor: string;
  iconColor: string;
}

const TipologiaRichiestaCard = memo(({ icon, title, subtitle, href, iconBgColor, iconColor }: TipologiaRichiestaCardProps) => (
  <Link href={href} prefetch={true}>
    <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-emerald-500 transition-all cursor-pointer mb-3">
      <div className="flex items-center gap-4">
        <div className="text-emerald-600">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  </Link>
));

TipologiaRichiestaCard.displayName = 'TipologiaRichiestaCard';

export default function RichiestePage() {
  return (
    <div className="space-y-6">
      {/* Header verde */}
      <div className="bg-emerald-600 px-6 py-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Richieste</h1>
          <Link href="/mobile/richieste/nuova" prefetch={true}>
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
              <Plus className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            </button>
          </Link>
        </div>
      </div>

      {/* Contenuto */}
      <div className="relative z-10" style={{ marginTop: '-40px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div>
          <TipologiaRichiestaCard
            icon={<Receipt className="w-8 h-8" />}
            title="Note Spesa"
            subtitle="Visualizza e gestisci le note spesa"
            href="/mobile/richieste/note-spesa"
            iconBgColor=""
            iconColor=""
          />

          <TipologiaRichiestaCard
            icon={<Plane className="w-8 h-8" />}
            title="Ferie"
            subtitle="Richiedi e consulta le ferie"
            href="/mobile/richieste/ferie"
            iconBgColor=""
            iconColor=""
          />

          <TipologiaRichiestaCard
            icon={<Clock className="w-8 h-8" />}
            title="Permessi"
            subtitle="Gestisci permessi e ROL"
            href="/mobile/richieste/permessi"
            iconBgColor=""
            iconColor=""
          />
        </div>
      </div>
    </div>
  );
}
