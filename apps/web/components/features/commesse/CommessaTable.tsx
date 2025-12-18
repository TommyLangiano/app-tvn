'use client';

import { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ExternalLink } from 'lucide-react';
import type { Commessa } from '@/types/commessa';

interface CommessaTableProps {
  commesse: Commessa[];
  marginiLordi: Record<string, number>;
}

export const CommessaTable = memo(function CommessaTable({ commesse, marginiLordi }: CommessaTableProps) {
  const router = useRouter();
  const [showMargini, setShowMargini] = useState<Record<string, boolean>>({});

  const getStatusColor = useCallback((commessa: Commessa) => {
    if (!commessa.data_inizio) return 'bg-blue-500';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'bg-blue-500';
    if (endDate && today > endDate) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  const getStatusText = useCallback((commessa: Commessa) => {
    if (!commessa.data_inizio) return 'Da Iniziare';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'Da Iniziare';
    if (endDate && today > endDate) return 'Completata';
    return 'In Corso';
  }, []);

  const getStatusBadgeStyle = useCallback((commessa: Commessa) => {
    if (!commessa.data_inizio) return 'bg-blue-100 text-blue-700';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'bg-blue-100 text-blue-700';
    if (endDate && today > endDate) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }, []);

  const buildAddress = useCallback((commessa: Commessa) => {
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
  }, []);

  const formatMargine = useCallback((value: number, commessaId: string) => {
    if (showMargini[commessaId]) {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
    }
    return '*'.repeat(8);
  }, [showMargini]);

  const getMargineColor = useCallback((value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  }, []);

  const toggleMargine = useCallback((commessaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMargini(prev => ({
      ...prev,
      [commessaId]: !prev[commessaId]
    }));
  }, []);

  return (
    <div className="w-full border-2 border-border rounded-sm overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-border">
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border w-24">COD</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Nome</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Indirizzo</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border">Cliente</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border w-28">Tipologia</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground border-r border-border w-32">Margine Lordo</th>
            <th className="px-4 py-6 text-left text-sm font-semibold text-foreground w-28">Stato</th>
            <th className="px-4 py-6 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {commesse.map((commessa) => {
            const margineLordo = marginiLordi[commessa.id] || 0;
            const statusColor = getStatusColor(commessa);
            const statusText = getStatusText(commessa);

            return (
              <tr
                key={commessa.id}
                onClick={() => router.push(`/commesse/${commessa.slug}`)}
                className="border-b border-border hover:bg-primary/10 cursor-pointer transition-colors relative"
              >
                {/* Codice */}
                <td className="relative px-4 py-5 w-24">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${statusColor}`} />
                  <div className="text-sm text-foreground font-medium truncate">
                    {commessa.codice_commessa || '-'}
                  </div>
                </td>

                {/* Nome */}
                <td className="px-4 py-5">
                  <div className="text-sm text-foreground font-medium truncate">
                    {commessa.nome_commessa}
                  </div>
                </td>

                {/* Indirizzo */}
                <td className="px-4 py-5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      {buildAddress(commessa) || '-'}
                    </span>
                    {buildAddress(commessa) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildAddress(commessa))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>

                {/* Cliente */}
                <td className="px-4 py-5">
                  <div className="text-sm text-foreground truncate">
                    {(commessa as any).cliente_nome_completo || commessa.cliente_commessa}
                  </div>
                </td>

                {/* Tipologia */}
                <td className="px-4 py-5 w-28">
                  <div className="text-sm text-muted-foreground">
                    {commessa.tipologia_cliente}
                  </div>
                </td>

                {/* Margine Lordo */}
                <td className="px-4 py-5 w-32">
                  <div
                    className={`text-sm font-medium cursor-pointer ${getMargineColor(margineLordo)}`}
                    onMouseEnter={() => setShowMargini(prev => ({ ...prev, [commessa.id]: true }))}
                    onMouseLeave={() => setShowMargini(prev => ({ ...prev, [commessa.id]: false }))}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {formatMargine(margineLordo, commessa.id)}
                  </div>
                </td>

                {/* Stato */}
                <td className="px-4 py-5 w-28">
                  <span className={`inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium ${getStatusBadgeStyle(commessa)}`}>
                    {statusText}
                  </span>
                </td>

                {/* Arrow */}
                <td className="px-4 py-5 w-12">
                  <div className="flex items-center justify-end">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});
