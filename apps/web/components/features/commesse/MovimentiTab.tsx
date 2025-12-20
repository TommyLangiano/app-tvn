'use client';

import { useState, useMemo } from 'react';
import { Receipt, ArrowUpCircle, ArrowDownCircle, FileText, ChevronRight } from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getSignedUrl } from '@/lib/utils/storage';

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

interface MovimentiTabProps {
  commessaId: string;
  fattureAttive: FatturaAttiva[];
  fatturePassive: FatturaPassiva[];
  onReload?: () => void;
}

export function MovimentiTab({ commessaId, fattureAttive, fatturePassive, onReload }: MovimentiTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('data_fattura');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedFatture, setSelectedFatture] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedFatturaDetail, setSelectedFatturaDetail] = useState<FatturaAttiva | FatturaPassiva | null>(null);

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
      if (onReload) await onReload();
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
  }, [allFatture, searchQuery]);

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
      <DataTable<FatturaAttiva | FatturaPassiva>
          data={paginatedFatture}
          columns={columns}
          keyField="id"
          loading={false}
        searchable={true}
        searchPlaceholder="Cerca per numero fattura, cliente, fornitore..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
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
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                <SheetTitle className="text-xl font-bold">
                  Dettagli Fattura
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedFatturaDetail.numero_fattura}
                </p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {'cliente' in selectedFatturaDetail ? 'Cliente' : 'Fornitore'}
                    </label>
                    <p className="text-sm font-semibold mt-1">
                      {'cliente' in selectedFatturaDetail
                        ? selectedFatturaDetail.cliente
                        : (selectedFatturaDetail as FatturaPassiva).fornitore}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                    <p className="text-sm font-semibold mt-1">{selectedFatturaDetail.categoria}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data Emissione</label>
                    <p className="text-sm font-semibold mt-1">{formatDate(selectedFatturaDetail.data_fattura)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scadenza</label>
                    <p className="text-sm font-semibold mt-1">
                      {selectedFatturaDetail.scadenza_pagamento
                        ? formatDate(selectedFatturaDetail.scadenza_pagamento)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Importo Imponibile</label>
                    <p className="text-sm font-semibold mt-1">
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                        selectedFatturaDetail.importo_imponibile
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IVA ({selectedFatturaDetail.aliquota_iva}%)</label>
                    <p className="text-sm font-semibold mt-1">
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                        selectedFatturaDetail.importo_iva
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Importo Totale</label>
                    <p className="text-2xl font-bold mt-1">
                      {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                        selectedFatturaDetail.importo_totale
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stato Pagamento</label>
                    <p className="text-sm font-semibold mt-1">{selectedFatturaDetail.stato_pagamento}</p>
                  </div>
                  {selectedFatturaDetail.data_pagamento && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data Pagamento</label>
                      <p className="text-sm font-semibold mt-1">
                        {formatDate(selectedFatturaDetail.data_pagamento)}
                      </p>
                    </div>
                  )}
                  {selectedFatturaDetail.note && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Note</label>
                      <p className="text-sm mt-1">{selectedFatturaDetail.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
