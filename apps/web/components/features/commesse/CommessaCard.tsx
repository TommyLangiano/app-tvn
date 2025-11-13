'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
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

  const getStatusText = () => {
    if (!commessa.data_inizio) return 'Da Iniziare';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'Da Iniziare';
    if (endDate && today > endDate) return 'Completata';
    return 'In Corso';
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

  // Google Maps Static API URL
  const getStaticMapUrl = () => {
    const address = buildAddress();
    if (!address) return null;

    // Usa NEXT_PUBLIC_GOOGLE_MAPS_API_KEY se disponibile
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    // Parametri per mappa statica - ALTA QUALITÀ
    const center = encodeURIComponent(address);
    const zoom = 15;
    const size = '200x200'; // Dimensione base
    const scale = 2; // Max allowed by Google Maps API
    const maptype = 'roadmap';
    const markers = `color:red%7C${center}`;

    // Style to hide POI (points of interest) and labels
    const style = 'style=feature:poi|visibility:off&style=feature:transit|visibility:off';

    return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=${maptype}&${style}&markers=${markers}&key=${apiKey}`;
  };

  // URL per aprire Google Maps sulla posizione (non indicazioni)
  const openGoogleMapsLocation = (e: React.MouseEvent) => {
    e.stopPropagation(); // Non far scattare il click sulla card
    const address = buildAddress();
    if (!address) return;

    // URL per aprire Google Maps sulla posizione specifica
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const hasAddress = commessa.via || commessa.citta || commessa.provincia || commessa.cap;
  const mapUrl = hasAddress ? getStaticMapUrl() : null;

  const formatMargine = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  // Genera asterischi in base alla lunghezza del numero
  const getMaskedMargine = (value: number) => {
    const formatted = formatMargine(value).replace('€', '').trim();
    const length = formatted.replace(/\./g, '').replace(',', '').length; // Conta solo cifre
    return '*'.repeat(length);
  };

  const formatImporto = (value?: number) => {
    if (!value) return 'N/D';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div
      onClick={() => router.push(`/commesse/${commessa.slug}`)}
      className="group relative flex rounded-xl border-2 border-border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/30 overflow-hidden"
    >
      {/* Linea colorata laterale */}
      <div className={`w-1.5 flex-shrink-0 ${getStatusColor()}`} />

      {/* Mappa statica a sinistra - INFINITY EDGE */}
      {mapUrl ? (
        <div
          className="relative w-[200px] flex-shrink-0 bg-muted cursor-pointer transition-all group/map"
          onClick={openGoogleMapsLocation}
          title="Clicca per aprire la posizione in Google Maps"
        >
          <img
            src={mapUrl}
            alt={`Mappa di ${buildAddress()}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Overlay hover per indicare che è cliccabile */}
          <div className="absolute inset-0 bg-black/0 group-hover/map:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover/map:opacity-100 transition-opacity bg-white/90 rounded-lg px-3 py-2 text-xs font-medium text-gray-900">
              Apri in Maps
            </div>
          </div>
        </div>
      ) : (
        <div className="w-[200px] flex-shrink-0 bg-muted flex items-center justify-center">
          <MapPin className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}

      {/* Contenuto destro */}
      <div className="flex-1 p-5 space-y-3 min-w-0">
        {/* Header: Codice + Nome + Badge Stato */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Codice commessa */}
            {commessa.codice_commessa && (
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {commessa.codice_commessa}
              </div>
            )}
            {/* Nome commessa */}
            <h3 className="font-bold text-lg leading-tight break-words">
              {commessa.nome_commessa}
            </h3>
          </div>

          {/* Badge Stato */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
            getStatusColor() === 'bg-green-500' ? 'bg-green-100 text-green-700' :
            getStatusColor() === 'bg-yellow-500' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {getStatusText()}
          </div>
        </div>

        {/* Indirizzo */}
        {hasAddress && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="break-words">{buildAddress()}</span>
          </div>
        )}

        {/* Tipologia e Tipo */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tipologia: </span>
            <span className="font-medium">{commessa.tipologia_cliente}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tipo: </span>
            <span className="font-medium">{commessa.tipologia_commessa}</span>
          </div>
        </div>

        {/* Margine Lordo con hover - SOTTO */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">Margine Lordo:</span>
          <div className="flex items-baseline gap-1">
            <span className={`font-bold text-lg ${
              margineLordo >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              €
            </span>
            <span
              className={`font-bold text-lg tabular-nums ${
                margineLordo >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
              onMouseEnter={() => setShowMargine(true)}
              onMouseLeave={() => setShowMargine(false)}
              onClick={(e) => e.stopPropagation()}
            >
              {showMargine ? formatMargine(margineLordo).replace('€', '').trim() : getMaskedMargine(margineLordo)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
