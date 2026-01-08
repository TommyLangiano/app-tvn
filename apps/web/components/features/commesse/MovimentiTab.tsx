'use client';

import { useState, useMemo, useEffect } from 'react';
import { Receipt, ArrowUpCircle, ArrowDownCircle, FileText, ChevronRight, Search, Trash2, X, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl } from '@/lib/utils/storage';
import { FatturaDetailSheet } from '@/components/features/fatture/FatturaDetailSheet';
import { formatCurrency } from '@/lib/utils/currency';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';

interface FatturaAttiva {
  id: string;
  numero_fattura: string;
  cliente: string;
  cliente_id?: string;
  categoria: string;
  data_fattura: string;
  scadenza_pagamento: string | null;
  data_pagamento: string | null;
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;
  modalita_pagamento: string | null;
  stato_pagamento: string;
  note: string | null;
  commessa_id: string | null;
  allegato_url: string | null;
}

interface FatturaPassiva {
  id: string;
  numero_fattura: string;
  fornitore: string;
  fornitore_id?: string;
  categoria: string;
  data_fattura: string;
  scadenza_pagamento: string | null;
  data_pagamento: string | null;
  importo_imponibile: number;
  aliquota_iva: number;
  importo_iva: number;
  importo_totale: number;
  modalita_pagamento: string | null;
  banca_emissione: string | null;
  numero_conto: string | null;
  stato_pagamento: string;
  note: string | null;
  commessa_id: string | null;
  allegato_url: string | null;
}

interface RiepilogoEconomico {
  ricavi_imponibile: number;
  ricavi_iva: number;
  ricavi_totali: number;
  costi_imponibile: number;
  costi_iva: number;
  costi_totali: number;
  costi_buste_paga?: number;
  costi_f24?: number;
  margine_lordo: number;
  saldo_iva: number;
}

interface MovimentiTabProps {
  commessaId: string;
  fattureAttive: FatturaAttiva[];
  fatturePassive: FatturaPassiva[];
  riepilogo?: RiepilogoEconomico | null;
  bustePagaDettaglio: any[];
  f24Dettaglio: any[];
  onReload?: () => void;
  initialFatturaId?: string;
  onClearFatturaId?: () => void;
}

type TipoFattura = 'tutte' | 'emesse' | 'ricevute';

export function MovimentiTab({ commessaId, fattureAttive, fatturePassive, riepilogo, bustePagaDettaglio, f24Dettaglio, onReload, initialFatturaId, onClearFatturaId }: MovimentiTabProps) {
  const [tipoFattura, setTipoFattura] = useState<TipoFattura>('tutte');
  const [searchQuery, setSearchQuery] = useState('');
  const [statoFattura, setStatoFattura] = useState<string>('tutti');
  const [sortField, setSortField] = useState<string>('data_fattura');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedFatture, setSelectedFatture] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedFatturaDetail, setSelectedFatturaDetail] = useState<FatturaAttiva | FatturaPassiva | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Apri fattura se viene passato initialFatturaId
  useEffect(() => {
    if (initialFatturaId) {
      const fattura = [...fattureAttive, ...fatturePassive].find(f => f.id === initialFatturaId);
      if (fattura) {
        setSelectedFatturaDetail(fattura);
        setIsSheetOpen(true);
      }
    }
  }, [initialFatturaId, fattureAttive, fatturePassive]);

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleUpdateStatoPagamento = async (
    fattura: FatturaAttiva | FatturaPassiva,
    newStato: 'Pagato' | 'Non Pagato' | 'Da Incassare'
  ) => {
    try {
      const supabase = createClient();
      const isEmessa = 'cliente' in fattura;
      const table = isEmessa ? 'fatture_attive' : 'fatture_passive';

      const updateData: any = { stato_pagamento: newStato };
      if (newStato === 'Pagato') {
        updateData.data_pagamento = new Date().toISOString().split('T')[0];
      } else {
        updateData.data_pagamento = null;
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', fattura.id);

      if (error) throw error;

      toast.success('Stato aggiornato con successo');

      // Ricarica SOLO i dati delle fatture senza resettare la UI
      if (onReload) {
        await onReload();
      }
    } catch (error) {
      console.error('Error updating stato:', error);
      toast.error('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleOpenFile = async (path: string) => {
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

  const handleDeleteFattura = async () => {
    if (!selectedFatturaDetail) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const isEmessa = 'cliente' in selectedFatturaDetail;
      const tableName = isEmessa ? 'fatture_attive' : 'fatture_passive';

      // Elimina il file allegato se esiste
      if (selectedFatturaDetail.allegato_url) {
        try {
          await supabase.storage
            .from('app-storage')
            .remove([selectedFatturaDetail.allegato_url]);
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }

      // Elimina la fattura dal database
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', selectedFatturaDetail.id);

      if (error) throw error;

      toast.success('Fattura eliminata con successo');
      setShowDeleteConfirm(false);
      setSelectedFatturaDetail(null);

      // Ricarica i dati
      if (onReload) {
        onReload();
      }
    } catch (error) {
      console.error('Error deleting fattura:', error);
      toast.error('Errore nell\'eliminazione della fattura');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const allFatture: (FatturaAttiva | FatturaPassiva)[] = useMemo(() => {
    return [...fattureAttive, ...fatturePassive];
  }, [fattureAttive, fatturePassive]);

  const filteredFatture = useMemo(() => {
    let filtered = allFatture;

    // Filter by tipo (tutte/emesse/ricevute)
    if (tipoFattura === 'emesse') {
      filtered = filtered.filter(f => 'cliente' in f);
    } else if (tipoFattura === 'ricevute') {
      filtered = filtered.filter(f => 'fornitore' in f);
    }

    // Filter by date range
    if (dateFrom && dateTo) {
      filtered = filtered.filter(f => {
        return f.data_fattura >= dateFrom && f.data_fattura <= dateTo;
      });
    }

    // Filter by stato
    if (statoFattura !== 'tutti') {
      filtered = filtered.filter(f => f.stato_pagamento === statoFattura);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((f) => {
        const clienteFornitore = 'cliente' in f ? f.cliente : f.fornitore;
        return (
          f.numero_fattura.toLowerCase().includes(query) ||
          clienteFornitore.toLowerCase().includes(query) ||
          f.categoria?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [allFatture, tipoFattura, statoFattura, searchQuery, dateFrom, dateTo]);

  const sortedFatture = useMemo(() => {
    const sorted = [...filteredFatture];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'data_fattura':
          aValue = new Date(a.data_fattura).getTime();
          bValue = new Date(b.data_fattura).getTime();
          break;
        case 'scadenza_pagamento':
          aValue = a.scadenza_pagamento ? new Date(a.scadenza_pagamento).getTime() : 0;
          bValue = b.scadenza_pagamento ? new Date(b.scadenza_pagamento).getTime() : 0;
          break;
        case 'importo_totale':
          aValue = a.importo_totale;
          bValue = b.importo_totale;
          break;
        case 'cliente_fornitore':
          aValue = 'cliente' in a ? a.cliente : (a as FatturaPassiva).fornitore;
          bValue = 'cliente' in b ? b.cliente : (b as FatturaPassiva).fornitore;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return sorted;
  }, [filteredFatture, sortField, sortDirection]);

  const paginatedFatture = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedFatture.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedFatture, currentPage, itemsPerPage]);

  // Calcola il totale delle fatture filtrate
  const totaleFattureVisualizzate = useMemo(() => {
    return sortedFatture.reduce((sum, fattura) => sum + fattura.importo_totale, 0);
  }, [sortedFatture]);

  // Calcola riepilogo filtrato per date range
  const riepilogoFiltrato = useMemo(() => {
    // Filtra fatture attive per date (se presenti)
    const fattureAttiveFiltrate = dateFrom && dateTo
      ? fattureAttive.filter(f => f.data_fattura >= dateFrom && f.data_fattura <= dateTo)
      : fattureAttive;

    // Filtra fatture passive per date (se presenti)
    const fatturePassiveFiltrate = dateFrom && dateTo
      ? fatturePassive.filter(f => f.data_fattura >= dateFrom && f.data_fattura <= dateTo)
      : fatturePassive;

    // Filtra buste paga per date range (se presenti)
    const bustePagaFiltrate = dateFrom && dateTo
      ? bustePagaDettaglio.filter(dettaglio => {
          if (!dettaglio.buste_paga) return false;
          const { mese, anno } = dettaglio.buste_paga;
          const bustaPagaDate = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
          return bustaPagaDate >= dateFrom && bustaPagaDate <= dateTo;
        })
      : bustePagaDettaglio;

    // Filtra F24 per date range (se presenti)
    const f24Filtrate = dateFrom && dateTo
      ? f24Dettaglio.filter(dettaglio => {
          if (!dettaglio.f24) return false;
          const { mese, anno } = dettaglio.f24;
          const f24Date = format(new Date(anno, mese - 1, 1), 'yyyy-MM-dd');
          return f24Date >= dateFrom && f24Date <= dateTo;
        })
      : f24Dettaglio;

    // Calcola totali sempre basandosi sulle fatture filtrate
    const ricavi_imponibile = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const ricavi_iva = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const ricavi_totali = fattureAttiveFiltrate.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_imponibile = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_imponibile || 0), 0);
    const costi_iva = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_iva || 0), 0);
    const costi_totali = fatturePassiveFiltrate.reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costi_buste_paga = bustePagaFiltrate.reduce((sum, d) => sum + (Number(d.importo_commessa) || 0), 0);
    const costi_f24 = f24Filtrate.reduce((sum, d) => sum + (Number(d.valore_f24_commessa) || 0), 0);

    const margine_lordo = ricavi_imponibile - costi_imponibile - costi_buste_paga - costi_f24;
    const saldo_iva = ricavi_iva - costi_iva;

    return {
      ricavi_imponibile,
      ricavi_iva,
      ricavi_totali,
      costi_imponibile,
      costi_iva,
      costi_totali,
      costi_buste_paga,
      costi_f24,
      margine_lordo,
      saldo_iva,
    };
  }, [dateFrom, dateTo, fattureAttive, fatturePassive, bustePagaDettaglio, f24Dettaglio]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (fattura: FatturaAttiva | FatturaPassiva) => {
    setSelectedFatturaDetail(fattura);
    setIsSheetOpen(true);
  };

  const columns: DataTableColumn<FatturaAttiva | FatturaPassiva>[] = [
    {
      key: 'descrizione',
      label: 'Descrizione',
      sortable: true,
      width: 'w-auto',
      render: (fattura) => {
        const isEmessa = 'cliente' in fattura;
        const nomeCompleto = isEmessa ? fattura.cliente : (fattura as FatturaPassiva).fornitore;
        return (
          <div className="flex items-center gap-3">
            {isEmessa ? (
              <ArrowUpCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            )}
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{nomeCompleto}</span>
              <span className="text-xs font-bold text-foreground">
                {fattura.numero_fattura}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'data_fattura',
      label: 'Data Emissione',
      sortable: true,
      width: 'w-40',
      render: (fattura) => (
        <div className="text-sm text-foreground">
          {formatDate(fattura.data_fattura)}
        </div>
      ),
    },
    {
      key: 'scadenza_pagamento',
      label: 'Data Scadenza',
      sortable: true,
      width: 'w-40',
      render: (fattura) => (
        <div className={`text-sm ${
          fattura.scadenza_pagamento && new Date(fattura.scadenza_pagamento) < new Date() && fattura.stato_pagamento !== 'Pagato'
            ? 'text-red-600 font-semibold'
            : 'text-foreground'
        }`}>
          {fattura.scadenza_pagamento ? formatDate(fattura.scadenza_pagamento) : '-'}
        </div>
      ),
    },
    {
      key: 'importo_totale',
      label: 'Importo Totale',
      sortable: true,
      width: 'w-36',
      headerClassName: 'whitespace-nowrap',
      render: (fattura) => (
        <div className="text-sm text-foreground font-bold">
          {new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
          }).format(fattura.importo_totale)}
        </div>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      sortable: false,
      width: 'w-32',
      render: (fattura) => (
        <div className="text-sm text-foreground">
          {fattura.categoria}
        </div>
      ),
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: false,
      width: 'w-36',
      render: (fattura) => (
        <Select
          value={fattura.stato_pagamento}
          onValueChange={(value: 'Pagato' | 'Non Pagato' | 'Da Incassare') =>
            handleUpdateStatoPagamento(fattura, value)
          }
        >
          <SelectTrigger
            className={`inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium border-0 h-7 w-auto ${
              fattura.stato_pagamento === 'Pagato'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <SelectValue>
              {fattura.stato_pagamento === 'Pagato'
                ? 'Pagato'
                : ('cliente' in fattura ? 'Da Incassare' : 'Non Pagato')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent onClick={(e) => e.stopPropagation()}>
            {'cliente' in fattura ? (
              <>
                <SelectItem value="Da Incassare">Da Incassare</SelectItem>
                <SelectItem value="Pagato">Pagato</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="Non Pagato">Non Pagato</SelectItem>
                <SelectItem value="Pagato">Pagato</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'allegato',
      label: 'Allegato',
      sortable: false,
      width: 'w-24',
      render: (fattura) => (
        <>
          {fattura.allegato_url && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenFile(fattura.allegato_url!);
              }}
              className="inline-flex items-center justify-center hover:bg-primary/10 rounded-md p-2 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
            </button>
          )}
        </>
      ),
    },
    {
      key: 'arrow',
      label: '',
      sortable: false,
      width: 'w-12',
      render: () => (
        <div className="flex items-center justify-end">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search field */}
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
          <Input
            placeholder="Cerca per numero fattura, cliente, fornitore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground w-full"
          />
        </div>

        {/* Tipo Fattura filter */}
        <Select value={tipoFattura} onValueChange={(value) => setTipoFattura(value as TipoFattura)}>
          <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
            <SelectValue>
              {tipoFattura === 'tutte' ? 'Tipo: Tutte' :
               tipoFattura === 'emesse' ? 'Tipo: Emesse' :
               'Tipo: Ricevute'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte ({allFatture.length})</SelectItem>
            <SelectItem value="emesse">Emesse ({fattureAttive.length})</SelectItem>
            <SelectItem value="ricevute">Ricevute ({fatturePassive.length})</SelectItem>
          </SelectContent>
        </Select>

        {/* Stato filter */}
        <Select value={statoFattura} onValueChange={setStatoFattura}>
          <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
            <SelectValue>
              {statoFattura === 'tutti' ? 'Stato: Tutti' :
               statoFattura === 'Pagato' ? 'Stato: Pagato' :
               statoFattura === 'Non Pagato' ? 'Stato: Non Pagato' :
               'Stato: Da Incassare'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti</SelectItem>
            <SelectItem value="Pagato">Pagato</SelectItem>
            <SelectItem value="Non Pagato">Non Pagato</SelectItem>
            <SelectItem value="Da Incassare">Da Incassare</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onRangeChange={handleDateRangeChange}
          placeholder="Seleziona Intervallo"
          className="w-full lg:w-auto"
        />
      </div>

      <DataTable<FatturaAttiva | FatturaPassiva>
        data={paginatedFatture}
        columns={columns}
        keyField="id"
        loading={false}
        sortField={sortField}
        sortDirection={sortDirection as 'asc' | 'desc'}
        onSort={handleSort}
        selectedRows={selectedFatture}
        onSelectionChange={setSelectedFatture}
        currentPage={currentPage}
        pageSize={itemsPerPage}
        totalItems={sortedFatture.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setItemsPerPage}
        onRowClick={handleRowClick}
        emptyIcon={Receipt}
        emptyTitle="Nessuna fattura trovata"
        emptyDescription={searchQuery ? 'Prova con una ricerca diversa' : 'Nessuna fattura associata a questa commessa'}
      />

      {/* Sheet Modal per dettagli fattura */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col [&>button]:hidden">
          {selectedFatturaDetail && (
            <FatturaDetailSheet
              fattura={selectedFatturaDetail}
              onClose={() => {
                setIsSheetOpen(false);
                if (onClearFatturaId) {
                  onClearFatturaId();
                }
              }}
              onOpenFile={handleOpenFile}
              onDelete={() => setShowDeleteConfirm(true)}
              onUpdate={() => {
                if (onReload) {
                  onReload();
                }
                setIsSheetOpen(false);
                if (onClearFatturaId) {
                  onClearFatturaId();
                }
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Modal di conferma eliminazione */}
      {showDeleteConfirm && selectedFatturaDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Elimina Fattura
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Sei sicuro di voler eliminare la fattura{' '}
                  <span className="font-semibold">{selectedFatturaDetail.numero_fattura}</span>?
                  Questa azione non può essere annullata.
                </p>
                <div className="mt-3 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">
                      {'cliente' in selectedFatturaDetail ? 'Cliente:' : 'Fornitore:'}
                    </span>{' '}
                    {'cliente' in selectedFatturaDetail
                      ? selectedFatturaDetail.cliente
                      : (selectedFatturaDetail as FatturaPassiva).fornitore}
                  </p>
                  <p>
                    <span className="font-medium">Data:</span>{' '}
                    {new Date(selectedFatturaDetail.data_fattura).toLocaleDateString('it-IT')}
                  </p>
                  <p>
                    <span className="font-medium">Importo:</span>{' '}
                    {new Intl.NumberFormat('it-IT', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(selectedFatturaDetail.importo_totale)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteFattura}
                disabled={isDeleting}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Eliminazione...' : 'Elimina'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
