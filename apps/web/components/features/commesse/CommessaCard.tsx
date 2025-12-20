'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ExternalLink, MoreVertical, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Commessa } from '@/types/commessa';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CommessaCardProps {
  commessa: Commessa;
  margine?: number;
}

export const CommessaCard = memo(function CommessaCard({ commessa, margine = 0 }: CommessaCardProps) {
  const router = useRouter();
  const [showMargine, setShowMargine] = useState(false);

  const getStatusColor = useCallback(() => {
    if (!commessa.data_inizio) return 'bg-yellow-500'; // Da avviare

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'bg-blue-500'; // Da avviare
    if (endDate && today > endDate) return 'bg-yellow-500'; // Terminata/Scaduta
    return 'bg-green-500'; // Avviata/In corso
  }, [commessa.data_inizio, commessa.data_fine_prevista]);

  const getStatusText = useCallback(() => {
    if (!commessa.data_inizio) return 'Da Iniziare';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'Da Iniziare';
    if (endDate && today > endDate) return 'Completata';
    return 'In Corso';
  }, [commessa.data_inizio, commessa.data_fine_prevista]);

  const buildAddress = useCallback(() => {
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
  }, [commessa.via, commessa.numero_civico, commessa.cap, commessa.citta, commessa.provincia]);

  // Google Maps Static API URL
  const getStaticMapUrl = useCallback(() => {
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
  }, [buildAddress]);

  // URL per aprire Google Maps sulla posizione (non indicazioni)
  const openGoogleMapsLocation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Non far scattare il click sulla card
    const address = buildAddress();
    if (!address) return;

    // URL per aprire Google Maps sulla posizione specifica
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }, [buildAddress]);

  const hasAddress = commessa.via || commessa.citta || commessa.provincia || commessa.cap;
  const mapUrl = hasAddress ? getStaticMapUrl() : null;
  const statusColor = getStatusColor();
  const statusText = getStatusText();

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


  return (
    <div
      onClick={() => router.push(`/commesse/${commessa.slug}`)}
      className="group relative flex rounded-xl border-2 border-border bg-card hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary/30 overflow-hidden hover:-translate-y-0.5"
    >
      {/* Linea colorata laterale */}
      <div className={cn("w-1.5 flex-shrink-0", statusColor)} />

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

          {/* Badge Stato + Dropdown Menu */}
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "border whitespace-nowrap",
              statusColor === 'bg-green-500' ? 'bg-green-100 text-green-700 border-green-200' :
              statusColor === 'bg-blue-500' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              'bg-yellow-100 text-yellow-700 border-yellow-200'
            )}>
              {statusText}
            </Badge>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/commesse/${commessa.slug}`); }}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Visualizza
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/commesse/${commessa.slug}/modifica`); }}>
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/commesse/${commessa.slug}/movimenti`); }}>
                  Movimenti
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              margine >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              €
            </span>
            <span
              className={`font-bold text-lg tabular-nums ${
                margine >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
              onMouseEnter={() => setShowMargine(true)}
              onMouseLeave={() => setShowMargine(false)}
              onClick={(e) => e.stopPropagation()}
            >
              {showMargine ? formatMargine(margine).replace('€', '').trim() : getMaskedMargine(margine)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
