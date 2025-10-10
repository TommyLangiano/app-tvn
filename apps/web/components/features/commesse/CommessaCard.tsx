'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ExternalLink } from 'lucide-react';
import type { Commessa } from '@/types/commessa';

interface CommessaCardProps {
  commessa: Commessa;
  margineLordo?: number;
}

export function CommessaCard({ commessa, margineLordo = 0 }: CommessaCardProps) {
  const router = useRouter();
  const [showMargine, setShowMargine] = useState(false);

  const getStatusColor = () => {
    if (!commessa.data_inizio) return 'bg-yellow-500'; // Da avviare

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'bg-yellow-500'; // Da avviare
    if (endDate && today > endDate) return 'bg-red-500'; // Terminata/Scaduta
    return 'bg-green-500'; // Avviata/In corso
  };

  const buildAddress = () => {
    const parts = [];
    if (commessa.via) {
      parts.push(commessa.via);
      if (commessa.numero_civico) {
        parts[0] = `${parts[0]} ${commessa.numero_civico}`;
      }
    }
    if (commessa.cap && commessa.citta) {
      parts.push(`${commessa.cap} ${commessa.citta}`);
    } else if (commessa.citta) {
      parts.push(commessa.citta);
    }
    if (commessa.provincia) parts.push(commessa.provincia);
    return parts.join(', ');
  };

  const getGoogleMapsUrl = () => {
    const address = buildAddress();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const hasAddress = commessa.via || commessa.citta || commessa.provincia || commessa.cap;
  const showGoogleMapsLink = commessa.citta; // Mostra link solo se c'è almeno la città

  const formatMargine = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <div
      onClick={() => router.push(`/commesse/${commessa.slug}`)}
      className="group relative flex items-start gap-4 rounded-xl border-2 border-border bg-card p-5 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/30"
    >
      {/* Linea colorata laterale */}
      <div className={`w-1 h-full rounded-full ${getStatusColor()}`} />

      {/* Contenuto */}
      <div className="flex-1 space-y-2 min-w-0">
        {/* Codice commessa - Nome commessa */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          {commessa.codice_commessa && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {commessa.codice_commessa}
              </span>
              <span className="text-muted-foreground hidden sm:inline">-</span>
            </div>
          )}
          <span className="font-bold text-base break-words">
            {commessa.nome_commessa}
          </span>
        </div>

        {/* Indirizzo completo con link a Google Maps */}
        {hasAddress && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 flex items-start gap-1.5">
              <span className="break-words">{buildAddress()}</span>
              {showGoogleMapsLink && (
                <a
                  href={getGoogleMapsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Margine Lordo con asterischi */}
      <div
        className="flex flex-col items-end justify-start flex-shrink-0"
        onMouseEnter={() => setShowMargine(true)}
        onMouseLeave={() => setShowMargine(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-muted-foreground mb-1">Margine Lordo</span>
        <span className={`font-bold text-lg transition-all duration-200 min-w-[100px] text-right ${
          margineLordo >= 0 ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {showMargine ? formatMargine(margineLordo) : '€ *******'}
        </span>
      </div>
    </div>
  );
}
