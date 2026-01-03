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
  onReload?: () => void;
}

type TabType = 'all' | 'emesse' | 'ricevute';

export function MovimentiTab({ commessaId, fattureAttive, fatturePassive, riepilogo, onReload }: MovimentiTabProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
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
  const [bustePagaDettaglio, setBustePagaDettaglio] = useState<any[]>([]);
  const [f24Dettaglio, setF24Dettaglio] = useState<any[]>([]);

  // Carica dettagli buste paga per la commessa
  useEffect(() => {
    const loadBustePagaDettaglio = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('buste_paga_dettaglio')
        .select(`
          *,
          buste_paga (
            mese,
            anno,
            dipendente_id
          )
        `)
        .eq('commessa_id', commessaId);

      if (!error && data) {
        setBustePagaDettaglio(data);
      }
    };

    loadBustePagaDettaglio();
  }, [commessaId]);

  // Carica dettagli F24 per la commessa
  useEffect(() => {
    const loadF24Dettaglio = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('f24_dettaglio')
        .select(`
          *,
          f24 (
            mese,
            anno,
            importo_f24
          )
        `)
        .eq('commessa_id', commessaId);

      if (!error && data) {
        setF24Dettaglio(data);
      }
    };

    loadF24Dettaglio();
  }, [commessaId]);

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

    // Filter by tab (all/emesse/ricevute)
    if (activeTab === 'emesse') {
      filtered = filtered.filter(f => 'cliente' in f);
    } else if (activeTab === 'ricevute') {
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
  }, [allFatture, activeTab, statoFattura, searchQuery, dateFrom, dateTo]);

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
        {/* Toggle Buttons per tipo fattura */}
        <div className="inline-flex rounded-md border border-border bg-background p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Tutte
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'all'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-green-100 text-green-700'
            }`}>
              {allFatture.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('emesse')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'emesse'
                ? 'bg-green-100 text-green-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Emesse
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'emesse'
                ? 'bg-green-200 text-green-800'
                : 'bg-green-100 text-green-700'
            }`}>
              {fattureAttive.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ricevute')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'ricevute'
                ? 'bg-red-100 text-red-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ArrowDownCircle className="h-4 w-4" />
            Ricevute
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              activeTab === 'ricevute'
                ? 'bg-red-200 text-red-800'
                : 'bg-green-100 text-green-700'
            }`}>
              {fatturePassive.length}
            </span>
          </button>
        </div>

        <div className="hidden lg:block h-8 w-px bg-border"></div>
        {/* Search field */}
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
          <Input
            placeholder="Cerca per numero fattura, cliente, fornitore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground w-full"
          />
        </div>

        <div className="flex-1"></div>

        {/* Bulk delete button */}
        {selectedFatture.size > 0 && (
          <Button
            variant="outline"
            className="h-11 gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Add bulk delete handler
              toast.info('Funzionalità in sviluppo');
            }}
          >
            <Trash2 className="h-4 w-4" />
            Elimina ({selectedFatture.size})
          </Button>
        )}

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

      {/* Dashboard Economico - Card dinamiche in base al tab */}
      {riepilogoFiltrato && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${activeTab === 'all' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {/* TAB "TUTTE" - Mostra tutte e 4 le card */}
          {activeTab === 'all' && (
            <>
              {/* Card Fatture Emesse */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-base">Fatture Emesse</span>
                </div>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(riepilogoFiltrato.ricavi_totali)}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Imponibile:</span>
                      <span className="text-sm font-semibold">{formatCurrency(riepilogoFiltrato.ricavi_imponibile)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">IVA:</span>
                      <span className="text-sm font-semibold">{formatCurrency(riepilogoFiltrato.ricavi_iva)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Fatture Ricevute */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-red-100">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="font-semibold text-base">Totale Costi</span>
                </div>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency((riepilogoFiltrato.costi_totali || 0) + (riepilogoFiltrato.costi_buste_paga || 0) + (riepilogoFiltrato.costi_f24 || 0))}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Fatture:</span>
                      <span className="text-sm font-semibold">{formatCurrency(riepilogoFiltrato.costi_imponibile)}</span>
                    </div>
                    {(riepilogoFiltrato.costi_buste_paga || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Buste Paga:</span>
                        <span className="text-sm font-semibold text-yellow-600">{formatCurrency(riepilogoFiltrato.costi_buste_paga || 0)}</span>
                      </div>
                    )}
                    {(riepilogoFiltrato.costi_f24 || 0) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">F24:</span>
                        <span className="text-sm font-semibold text-orange-600">{formatCurrency(riepilogoFiltrato.costi_f24 || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">IVA:</span>
                      <span className="text-sm font-semibold">{formatCurrency(riepilogoFiltrato.costi_iva)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Margine Lordo */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${riepilogoFiltrato.margine_lordo >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <FileText className={`h-5 w-5 ${riepilogoFiltrato.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                  </div>
                  <span className="font-semibold text-base">Margine Lordo</span>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${riepilogoFiltrato.margine_lordo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(riepilogoFiltrato.margine_lordo)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Imponibile ricavi - Imponibile costi
                  </div>
                </div>
              </div>

              {/* Card Saldo IVA */}
              <div className={`rounded-xl border-2 bg-card p-6 ${
                (riepilogoFiltrato.saldo_iva || 0) === 0
                  ? 'border-green-300 bg-green-50/30'
                  : (riepilogoFiltrato.saldo_iva || 0) > 0
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-green-300 bg-green-50/30'
              }`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${
                    (riepilogoFiltrato.saldo_iva || 0) === 0
                      ? 'bg-green-100'
                      : (riepilogoFiltrato.saldo_iva || 0) > 0
                      ? 'bg-red-100'
                      : 'bg-green-100'
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      (riepilogoFiltrato.saldo_iva || 0) === 0
                        ? 'text-green-600'
                        : (riepilogoFiltrato.saldo_iva || 0) > 0
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`} />
                  </div>
                  <span className="font-semibold text-base">Saldo IVA</span>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${
                    (riepilogoFiltrato.saldo_iva || 0) === 0
                      ? 'text-green-600'
                      : (riepilogoFiltrato.saldo_iva || 0) > 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {formatCurrency(
                      (riepilogoFiltrato.saldo_iva || 0) === 0
                        ? 0
                        : (riepilogoFiltrato.saldo_iva || 0) > 0
                        ? -(riepilogoFiltrato.saldo_iva || 0)
                        : -(riepilogoFiltrato.saldo_iva || 0)
                    )}
                  </div>
                  <div className={`text-sm font-medium ${
                    (riepilogoFiltrato.saldo_iva || 0) === 0
                      ? 'text-green-700'
                      : (riepilogoFiltrato.saldo_iva || 0) > 0
                      ? 'text-red-700'
                      : 'text-green-700'
                  }`}>
                    {(riepilogoFiltrato.saldo_iva || 0) === 0 ? 'Neutra' : (riepilogoFiltrato.saldo_iva || 0) > 0 ? 'IVA a debito' : 'IVA a credito'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    IVA ricavi - IVA costi
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB "EMESSE" - 3 card specifiche per fatture emesse */}
          {activeTab === 'emesse' && riepilogo && (
            <>
              {/* Card Totale Fatturato */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-base">Totale Fatturato</span>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(riepilogo.ricavi_totali)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Somma di tutte le fatture emesse
                  </div>
                </div>
              </div>

              {/* Card Imponibile */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-base">Imponibile</span>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-700">
                    {formatCurrency(riepilogo.ricavi_imponibile)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Totale imponibile fatture emesse
                  </div>
                </div>
              </div>

              {/* Card IVA a versare */}
              <div className={`rounded-xl border-2 bg-card p-6 ${riepilogo.ricavi_iva > 0 ? 'border-red-300 bg-red-50/30' : 'border-green-300 bg-green-50/30'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${riepilogo.ricavi_iva > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                    <FileText className={`h-5 w-5 ${riepilogo.ricavi_iva > 0 ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                  <span className="font-semibold text-base">IVA a versare</span>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${riepilogo.ricavi_iva > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(riepilogo.ricavi_iva)}
                  </div>
                  <div className={`text-sm font-medium ${riepilogo.ricavi_iva > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    {riepilogo.ricavi_iva > 0 ? 'IVA a debito' : 'Nessuna IVA'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    IVA sulle fatture emesse
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB "RICEVUTE" - 3 card specifiche per fatture ricevute */}
          {activeTab === 'ricevute' && riepilogo && (
            <>
              {/* Card Totale Costi */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-red-100">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="font-semibold text-base">Totale Costi</span>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-red-600">
                    {formatCurrency(riepilogo.costi_totali)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Somma di tutte le fatture ricevute
                  </div>
                </div>
              </div>

              {/* Card Totale Costi */}
              <div className="rounded-xl border-2 border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-base">Totale Costi</span>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-700">
                    {formatCurrency((riepilogo.costi_imponibile || 0) + (riepilogo.costi_buste_paga || 0) + (riepilogo.costi_f24 || 0))}
                  </div>
                  <div className="space-y-1 mt-2 pt-2 border-t border-border">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Fatture:</span>
                      <span className="font-semibold">{formatCurrency(riepilogo.costi_imponibile)}</span>
                    </div>
                    {(riepilogo.costi_buste_paga || 0) > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Buste Paga:</span>
                        <span className="font-semibold text-yellow-600">{formatCurrency(riepilogo.costi_buste_paga)}</span>
                      </div>
                    )}
                    {(riepilogo.costi_f24 || 0) > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">F24:</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(riepilogo.costi_f24)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card IVA detraibile */}
              <div className={`rounded-xl border-2 bg-card p-6 ${riepilogo.costi_iva > 0 ? 'border-green-300 bg-green-50/30' : 'border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-lg ${riepilogo.costi_iva > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <FileText className={`h-5 w-5 ${riepilogo.costi_iva > 0 ? 'text-green-600' : 'text-gray-600'}`} />
                  </div>
                  <span className="font-semibold text-base">IVA detraibile</span>
                </div>
                <div className="space-y-2">
                  <div className={`text-3xl font-bold ${riepilogo.costi_iva > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    {formatCurrency(riepilogo.costi_iva)}
                  </div>
                  <div className={`text-sm font-medium ${riepilogo.costi_iva > 0 ? 'text-green-700' : 'text-gray-600'}`}>
                    {riepilogo.costi_iva > 0 ? 'IVA a credito' : 'Nessuna IVA'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    IVA sulle fatture ricevute
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
              onClose={() => setIsSheetOpen(false)}
              onOpenFile={handleOpenFile}
              onDelete={() => setShowDeleteConfirm(true)}
              onUpdate={() => {
                if (onReload) {
                  onReload();
                }
                setIsSheetOpen(false);
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
