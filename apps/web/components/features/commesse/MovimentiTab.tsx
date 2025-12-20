'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpCircle, ArrowDownCircle, FileText, Info, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { FatturaAttiva, FatturaPassiva } from '@/types/fattura';
import { InfoMovimentoModal } from '@/components/features/commesse/InfoMovimentoModal';
import { EditMovimentoModal } from '@/components/features/commesse/EditMovimentoModal';
import { DeleteMovimentoModal } from '@/components/features/commesse/DeleteMovimentoModal';
import { BulkDeleteMovimentiModal } from '@/components/features/commesse/BulkDeleteMovimentiModal';
import { getSignedUrl } from '@/lib/utils/storage';

// Tipo unificato per i movimenti
type Movimento = {
  id: string;
  tipo: 'ricavo' | 'costo';
  categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
  numero?: string;
  cliente_fornitore: string;
  tipologia?: string;
  data_emissione: string;
  data_pagamento?: string;
  importo_imponibile?: number;
  importo_iva?: number;
  aliquota_iva?: number;
  percentuale_iva?: number;
  importo_totale: number;
  stato_pagamento?: string;
  modalita_pagamento?: string;
  allegato_url: string | null;
  created_at?: string;
  updated_at?: string;
};

interface MovimentiTabProps {
  commessaId: string;
}

export function MovimentiTab({ commessaId }: MovimentiTabProps) {
  const [loading, setLoading] = useState(true);
  const [movimenti, setMovimenti] = useState<Movimento[]>([]);

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'tutti' | 'ricavo' | 'costo'>('tutti');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('tutte');
  const [statoPagamentoFiltro, setStatoPagamentoFiltro] = useState<string>('tutti');
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('tutti');
  const [rangeImportoFiltro, setRangeImportoFiltro] = useState<string>('tutti');

  // Ordinamento
  const [ordinamento, setOrdinamento] = useState<'data_desc' | 'data_asc' | 'importo_desc' | 'importo_asc' | 'cliente_asc' | 'cliente_desc' | 'stato_asc' | 'stato_desc'>('data_desc');

  // Modal states
  const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Multi-selection states
  const [selectedMovimenti, setSelectedMovimenti] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtri toggle
  const [showFilters, setShowFilters] = useState(false);

  // Handle allegato click with signed URL
  const handleAllegatoClick = async (path: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    if (!path) return;

    try {
      const signedUrl = await getSignedUrl(path);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast.error('Impossibile aprire l\'allegato');
      }
    } catch {
      toast.error('Errore nell\'apertura dell\'allegato');
    }
  };

  useEffect(() => {
    loadMovimenti();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commessaId]);

  const loadMovimenti = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      if (!commessaId) {
        setLoading(false);
        return;
      }

      // Load fatture attive (ricavi)
      const { data: fattureData } = await supabase
        .from('fatture_attive')
        .select('*')
        .eq('commessa_id', commessaId)
        .order('data_fattura', { ascending: false });

      // Load fatture passive (costi - fatture)
      const { data: fatturePassiveData } = await supabase
        .from('fatture_passive')
        .select('*')
        .eq('commessa_id', commessaId)
        .order('data_fattura', { ascending: false });

      // Unisci tutti i movimenti
      const allMovimenti: Movimento[] = [
        ...(fattureData || []).map((f: FatturaAttiva) => ({
          id: f.id,
          tipo: 'ricavo' as const,
          categoria: 'fattura_attiva' as const,
          numero: f.numero_fattura,
          cliente_fornitore: f.cliente,
          data_emissione: f.data_fattura,
          data_pagamento: f.data_pagamento || undefined,
          importo_imponibile: f.importo_imponibile,
          importo_iva: f.importo_iva,
          aliquota_iva: f.aliquota_iva,
          percentuale_iva: f.aliquota_iva,
          importo_totale: f.importo_totale,
          stato_pagamento: f.stato_pagamento,
          modalita_pagamento: f.modalita_pagamento || undefined,
          allegato_url: f.allegato_url,
          created_at: f.created_at,
          updated_at: f.updated_at,
        })),
        ...(fatturePassiveData || []).map((f: FatturaPassiva) => ({
          id: f.id,
          tipo: 'costo' as const,
          categoria: 'fattura_passiva' as const,
          numero: f.numero_fattura,
          cliente_fornitore: f.fornitore,
          data_emissione: f.data_fattura,
          data_pagamento: f.data_pagamento || undefined,
          importo_imponibile: f.importo_imponibile,
          importo_iva: f.importo_iva,
          aliquota_iva: f.aliquota_iva,
          percentuale_iva: f.aliquota_iva,
          importo_totale: f.importo_totale,
          stato_pagamento: f.stato_pagamento,
          modalita_pagamento: f.modalita_pagamento || undefined,
          allegato_url: f.allegato_url,
          created_at: f.created_at,
          updated_at: f.updated_at,
        })),
      ];

      // Ordina per data (più recenti prima)
      const movimentiOrdinati = allMovimenti.sort((a, b) =>
        new Date(b.data_emissione).getTime() - new Date(a.data_emissione).getTime()
      );

      setMovimenti(movimentiOrdinati);

    } catch {
      toast.error('Errore nel caricamento dei movimenti');
    } finally {
      setLoading(false);
    }
  };

  // Helper per calcolare range date
  const getDateRange = (periodo: string) => {
    const today = new Date();
    const start = new Date(today);

    switch (periodo) {
      case 'oggi':
        start.setHours(0, 0, 0, 0);
        return { start, end: today };
      case 'settimana':
        start.setDate(today.getDate() - 7);
        return { start, end: today };
      case 'mese':
        start.setMonth(today.getMonth() - 1);
        return { start, end: today };
      case 'trimestre':
        start.setMonth(today.getMonth() - 3);
        return { start, end: today };
      case 'anno':
        start.setFullYear(today.getFullYear() - 1);
        return { start, end: today };
      default:
        return null;
    }
  };

  // Filtra e ordina movimenti
  const movimentiFiltrati = useMemo(() => {
    const filtered = movimenti.filter(movimento => {
      // Filtro tipo (ricavo/costo)
      if (tipoFiltro !== 'tutti' && movimento.tipo !== tipoFiltro) {
        return false;
      }

      // Filtro categoria
      if (categoriaFiltro !== 'tutte' && movimento.categoria !== categoriaFiltro) {
        return false;
      }

      // Filtro stato pagamento
      if (statoPagamentoFiltro !== 'tutti' && movimento.stato_pagamento !== statoPagamentoFiltro) {
        return false;
      }

      // Filtro periodo date
      if (periodoFiltro !== 'tutti') {
        const dateRange = getDateRange(periodoFiltro);
        if (dateRange) {
          const dataEmissione = new Date(movimento.data_emissione);
          if (dataEmissione < dateRange.start || dataEmissione > dateRange.end) {
            return false;
          }
        }
      }

      // Filtro range importo
      if (rangeImportoFiltro !== 'tutti') {
        const importo = movimento.importo_totale;
        switch (rangeImportoFiltro) {
          case '0-1000':
            if (importo < 0 || importo > 1000) return false;
            break;
          case '1000-5000':
            if (importo < 1000 || importo > 5000) return false;
            break;
          case '5000-10000':
            if (importo < 5000 || importo > 10000) return false;
            break;
          case '10000+':
            if (importo < 10000) return false;
            break;
        }
      }

      // Filtro ricerca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          movimento.cliente_fornitore.toLowerCase().includes(searchLower) ||
          movimento.tipologia?.toLowerCase().includes(searchLower) ||
          movimento.numero?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });

    // Applica ordinamento
    filtered.sort((a, b) => {
      switch (ordinamento) {
        case 'data_desc':
          return new Date(b.data_emissione).getTime() - new Date(a.data_emissione).getTime();
        case 'data_asc':
          return new Date(a.data_emissione).getTime() - new Date(b.data_emissione).getTime();
        case 'importo_desc':
          return b.importo_totale - a.importo_totale;
        case 'importo_asc':
          return a.importo_totale - b.importo_totale;
        case 'cliente_asc':
          return a.cliente_fornitore.localeCompare(b.cliente_fornitore);
        case 'cliente_desc':
          return b.cliente_fornitore.localeCompare(a.cliente_fornitore);
        case 'stato_asc':
          return (a.stato_pagamento || '').localeCompare(b.stato_pagamento || '');
        case 'stato_desc':
          return (b.stato_pagamento || '').localeCompare(a.stato_pagamento || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [movimenti, tipoFiltro, categoriaFiltro, statoPagamentoFiltro, periodoFiltro, rangeImportoFiltro, searchTerm, ordinamento]);

  // Calcola paginazione
  const totalItems = movimentiFiltrati.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const movimentiPaginati = movimentiFiltrati.slice(startIndex, endIndex);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [tipoFiltro, categoriaFiltro, statoPagamentoFiltro, periodoFiltro, rangeImportoFiltro, searchTerm, ordinamento]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento movimenti...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtri */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Cerca e Filtri</h3>
            {showFilters ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
              setTipoFiltro('tutti');
              setCategoriaFiltro('tutte');
              setStatoPagamentoFiltro('tutti');
              setPeriodoFiltro('tutti');
              setRangeImportoFiltro('tutti');
              setOrdinamento('data_desc');
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Azzera filtri
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per cliente, fornitore, numero..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-lg border-2 border-border bg-background"
                  />
                </div>
              </div>

              <div>
                <Select value={tipoFiltro} onValueChange={(value) => setTipoFiltro(value as 'tutti' | 'ricavo' | 'costo')}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti i tipi</SelectItem>
                    <SelectItem value="ricavo">Solo Ricavi</SelectItem>
                    <SelectItem value="costo">Solo Costi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutte">Tutte le categorie</SelectItem>
                    <SelectItem value="fattura_attiva">Fatture Attive</SelectItem>
                    <SelectItem value="fattura_passiva">Fatture Passive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Select value={statoPagamentoFiltro} onValueChange={setStatoPagamentoFiltro}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue placeholder="Stato Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli stati</SelectItem>
                    <SelectItem value="Pagato">Pagato</SelectItem>
                    <SelectItem value="Non Pagato">Non Pagato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue placeholder="Periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti i periodi</SelectItem>
                    <SelectItem value="oggi">Oggi</SelectItem>
                    <SelectItem value="settimana">Ultima settimana</SelectItem>
                    <SelectItem value="mese">Ultimo mese</SelectItem>
                    <SelectItem value="trimestre">Ultimo trimestre</SelectItem>
                    <SelectItem value="anno">Ultimo anno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Range Importo */}
              <div>
                <Select value={rangeImportoFiltro} onValueChange={setRangeImportoFiltro}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue placeholder="Range Importo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli importi</SelectItem>
                    <SelectItem value="0-1000">0€ - 1.000€</SelectItem>
                    <SelectItem value="1000-5000">1.000€ - 5.000€</SelectItem>
                    <SelectItem value="5000-10000">5.000€ - 10.000€</SelectItem>
                    <SelectItem value="10000+">Oltre 10.000€</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedMovimenti.size > 0 && (
        <div className="rounded-xl border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {selectedMovimenti.size} {selectedMovimenti.size === 1 ? 'movimento selezionato' : 'movimenti selezionati'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSelectedMovimenti(new Set())}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Deseleziona tutto
              </Button>
              <Button
                onClick={() => setShowBulkDeleteModal(true)}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Elimina selezionati
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabella Movimenti */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background border-b-2 border-border">
              <tr>
                <th className="text-center p-4 w-12">
                  <input
                    type="checkbox"
                    checked={movimentiFiltrati.length > 0 && selectedMovimenti.size === movimentiFiltrati.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMovimenti(new Set(movimentiFiltrati.map(m => m.id)));
                      } else {
                        setSelectedMovimenti(new Set());
                      }
                    }}
                    className="h-5 w-5 rounded border-2 border-border cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-sm">Tipo</th>
                <th className="text-left p-4 font-semibold text-sm">N. Fattura</th>

                {/* Cliente/Fornitore - Sortable */}
                <th className="text-left p-4 font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <span>Cliente/Fornitore</span>
                    <button
                      onClick={() => {
                        setOrdinamento(ordinamento === 'cliente_asc' ? 'cliente_desc' : 'cliente_asc');
                      }}
                      className="p-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {ordinamento === 'cliente_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'cliente_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                <th className="text-left p-4 font-semibold text-sm">Tipologia</th>

                {/* Data Emissione - Sortable */}
                <th className="text-left p-4 font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <span>Data Emissione</span>
                    <button
                      onClick={() => {
                        setOrdinamento(ordinamento === 'data_desc' ? 'data_asc' : 'data_desc');
                      }}
                      className="p-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {ordinamento === 'data_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'data_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                {/* Totale - Sortable */}
                <th className="text-right p-4 font-semibold text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <span>Totale</span>
                    <button
                      onClick={() => {
                        setOrdinamento(ordinamento === 'importo_desc' ? 'importo_asc' : 'importo_desc');
                      }}
                      className="p-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {ordinamento === 'importo_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'importo_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                {/* Stato Pagamento - Sortable */}
                <th className="text-center p-4 font-semibold text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <span>Stato</span>
                    <button
                      onClick={() => {
                        setOrdinamento(ordinamento === 'stato_asc' ? 'stato_desc' : 'stato_asc');
                      }}
                      className="p-1 rounded hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {ordinamento === 'stato_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'stato_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                <th className="text-center p-4 font-semibold text-sm">Allegato</th>
                <th className="text-center p-4 font-semibold text-sm">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {movimentiPaginati.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    Nessun movimento trovato con i filtri selezionati
                  </td>
                </tr>
              ) : (
                movimentiPaginati.map((movimento) => (
                  <tr
                    key={movimento.id}
                    className="border-b border-border hover:bg-muted/10 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedMovimenti.has(movimento.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedMovimenti);
                          if (e.target.checked) {
                            newSelected.add(movimento.id);
                          } else {
                            newSelected.delete(movimento.id);
                          }
                          setSelectedMovimenti(newSelected);
                        }}
                        className="h-5 w-5 rounded border-2 border-border cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Tipo */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {movimento.tipo === 'ricavo' ? (
                          <div className="p-1.5 rounded bg-green-50">
                            <ArrowUpCircle className="h-4 w-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded bg-red-50">
                            <ArrowDownCircle className="h-4 w-4 text-red-600" />
                          </div>
                        )}
                        <span className={`text-xs font-medium ${
                          movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {movimento.tipo === 'ricavo' ? 'Ricavo' : 'Costo'}
                        </span>
                      </div>
                    </td>

                    {/* Numero */}
                    <td className="p-4">
                      <span className="text-sm font-medium">
                        {movimento.numero || '—'}
                      </span>
                    </td>

                    {/* Cliente/Fornitore */}
                    <td className="p-4">
                      <span className="text-sm">{movimento.cliente_fornitore}</span>
                    </td>

                    {/* Tipologia */}
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{movimento.tipologia}</span>
                    </td>

                    {/* Data Emissione */}
                    <td className="p-4">
                      <span className="text-sm">{formatDate(movimento.data_emissione)}</span>
                    </td>

                    {/* Totale */}
                    <td className="p-4 text-right">
                      <span className={`text-sm font-semibold ${
                        movimento.tipo === 'ricavo' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movimento.tipo === 'ricavo' ? '+' : '-'} {formatCurrency(movimento.importo_totale)}
                      </span>
                    </td>

                    {/* Stato Pagamento */}
                    <td className="p-4 text-center">
                      {movimento.stato_pagamento && (
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                          movimento.stato_pagamento === 'Pagato'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          {movimento.stato_pagamento}
                        </span>
                      )}
                    </td>

                    {/* Allegato */}
                    <td className="p-4 text-center">
                      {movimento.allegato_url ? (
                        <button
                          onClick={(e) => handleAllegatoClick(movimento.allegato_url, e)}
                          className="inline-flex items-center justify-center p-1.5 rounded hover:bg-muted transition-colors cursor-pointer"
                          title="Apri allegato"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Azioni */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedMovimento(movimento);
                            setShowInfoModal(true);
                          }}
                          className="p-2 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                          title="Info"
                        >
                          <Info className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMovimento(movimento);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                          title="Modifica"
                        >
                          <Pencil className="h-4 w-4 text-orange-600" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMovimento(movimento);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <>
            <hr className="border-border" />

            <div className="flex items-center justify-between px-4 py-4">
              {/* Left side - Info and Items per page */}
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} di {totalItems} elementi
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Elementi per pagina:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-9 rounded-lg border-2 border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right side - Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostra sempre prima pagina, ultima pagina, e pagine vicine a quella corrente
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      // Aggiungi "..." se c'è un gap
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-9 w-9 p-0"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showInfoModal && selectedMovimento && (
        <InfoMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedMovimento(null);
          }}
        />
      )}

      {showEditModal && selectedMovimento && (
        <EditMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMovimento(null);
          }}
          onSuccess={() => {
            loadMovimenti();
          }}
        />
      )}

      {showDeleteModal && selectedMovimento && (
        <DeleteMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedMovimento(null);
          }}
          onSuccess={() => {
            loadMovimenti();
          }}
        />
      )}

      {showBulkDeleteModal && (
        <BulkDeleteMovimentiModal
          movimenti={movimenti.filter(m => selectedMovimenti.has(m.id))}
          onClose={() => {
            setShowBulkDeleteModal(false);
            setSelectedMovimenti(new Set());
          }}
          onSuccess={() => {
            loadMovimenti();
            setSelectedMovimenti(new Set());
          }}
        />
      )}
    </div>
  );
}
