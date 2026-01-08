'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { Receipt, Plus, Search, ArrowUpCircle, ArrowDownCircle, FileText, X, Edit, Save, XCircle, ChevronsUpDown, Check, CloudUpload, Trash2, Filter, ArrowUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TabsFilter, TabItem } from '@/components/ui/tabs-filter';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FatturaDetailSheet } from '@/components/features/fatture/FatturaDetailSheet';

type TabType = 'all' | 'emesse' | 'ricevute';

type SortField = 'data_fattura' | 'scadenza_pagamento' | 'importo_totale' | 'cliente_fornitore';
type SortDirection = 'asc' | 'desc';

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
  commesse?: {
    nome_commessa: string;
  };
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
  commesse?: {
    nome_commessa: string;
  };
}

interface Cliente {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore?: string;
  aliquota_iva_predefinita?: number;
  modalita_pagamento_preferita?: string;
}

interface Fornitore {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore?: string;
}

interface Commessa {
  id: string;
  nome_commessa: string;
  codice_commessa?: string;
}

export default function FatturePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [fattureAttive, setFattureAttive] = useState<FatturaAttiva[]>([]);
  const [fatturePassive, setFatturePassive] = useState<FatturaPassiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);

  // Helper per formattare le date come "23 Luglio 2025"
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Stati per filtri
  const [tipoFattura, setTipoFattura] = useState<'tutte' | 'attive' | 'passive'>('tutte');
  const [statoFattura, setStatoFattura] = useState<string>('tutti');
  const [dateFromEmissione, setDateFromEmissione] = useState<string>('');
  const [dateToEmissione, setDateToEmissione] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtri avanzati
  const [dateFromScadenza, setDateFromScadenza] = useState<string>('');
  const [dateToScadenza, setDateToScadenza] = useState<string>('');
  const [metodoPagamento, setMetodoPagamento] = useState<string>('tutti');
  const [annoFiscale, setAnnoFiscale] = useState<string>('tutti');
  const [importoDa, setImportoDa] = useState('');
  const [importoA, setImportoA] = useState('');

  // Stati per ordinamento
  const [sortField, setSortField] = useState<SortField>('data_fattura');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedFatture, setSelectedFatture] = useState<Set<string>>(new Set());
  const [selectedFatturaDetail, setSelectedFatturaDetail] = useState<FatturaAttiva | FatturaPassiva | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<FatturaAttiva | FatturaPassiva>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Stati per i dropdown di modifica
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [openClienteCombo, setOpenClienteCombo] = useState(false);
  const [openFornitoreCombo, setOpenFornitoreCombo] = useState(false);
  const [openCommessaCombo, setOpenCommessaCombo] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [selectedFornitoreId, setSelectedFornitoreId] = useState<string>('');
  const [selectedCommessaId, setSelectedCommessaId] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');

  // Stati per gestione allegati
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deleteCurrentFile, setDeleteCurrentFile] = useState(false);

  // Stati per eliminazione fattura
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stati per eliminazione multipla
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    loadFatture();
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
  }, []);

  // Carica fattura specifica dall'URL direttamente dal DB (più veloce)
  useEffect(() => {
    const fatturaId = searchParams.get('fattura');
    if (!fatturaId) return;

    const loadFatturaById = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (!tenants) return;

        // Cerca prima nelle fatture passive (più comune da panoramica)
        const { data: fatturaPassiva } = await supabase
          .from('fatture_passive')
          .select('*, commesse(nome_commessa)')
          .eq('id', fatturaId)
          .eq('tenant_id', tenants.tenant_id)
          .maybeSingle();

        if (fatturaPassiva) {
          setSelectedFatturaDetail(fatturaPassiva as FatturaPassiva);
          setIsSheetOpen(true);
          setActiveTab('ricevute');
          return;
        }

        // Se non trovata, cerca nelle attive
        const { data: fatturaAttiva } = await supabase
          .from('fatture_attive')
          .select('*, commesse(nome_commessa)')
          .eq('id', fatturaId)
          .eq('tenant_id', tenants.tenant_id)
          .maybeSingle();

        if (fatturaAttiva) {
          setSelectedFatturaDetail(fatturaAttiva as FatturaAttiva);
          setIsSheetOpen(true);
          setActiveTab('emesse');
        }
      } catch (error) {
        console.error('Errore caricamento fattura:', error);
      }
    };

    loadFatturaById();
  }, [searchParams]);

  const loadFatture = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenants = tenants && tenants.length > 0 ? tenants[0] : null;
      if (!userTenants) return;

      setTenantId(userTenants.tenant_id);

      // Load fatture attive (emesse)
      const { data: attive } = await supabase
        .from('fatture_attive')
        .select('*, commesse(nome_commessa)')
        .eq('tenant_id', userTenants.tenant_id)
        .order('data_fattura', { ascending: false });

      // Load fatture passive (ricevute)
      const { data: passive } = await supabase
        .from('fatture_passive')
        .select('*, commesse(nome_commessa)')
        .eq('tenant_id', userTenants.tenant_id)
        .order('data_fattura', { ascending: false });

      setFattureAttive(attive || []);
      setFatturePassive(passive || []);
    } catch (error) {
      console.error('Error loading fatture:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClienti = async () => {
    if (!tenantId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clienti')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore, aliquota_iva_predefinita, modalita_pagamento_preferita')
        .eq('tenant_id', tenantId)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;
      setClienti(data || []);
    } catch (error) {
      console.error('Error loading clienti:', error);
    }
  };

  const loadFornitori = async () => {
    if (!tenantId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fornitori')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore')
        .eq('tenant_id', tenantId)
        .order('ragione_sociale, cognome, nome');

      if (error) throw error;
      setFornitori(data || []);
    } catch (error) {
      console.error('Error loading fornitori:', error);
    }
  };

  const loadCommesse = async () => {
    if (!tenantId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('commesse')
        .select('id, nome_commessa, codice_commessa')
        .eq('tenant_id', tenantId)
        .order('nome_commessa');

      if (error) throw error;
      setCommesse(data || []);
    } catch (error) {
      console.error('Error loading commesse:', error);
    }
  };

  const getClienteDisplayName = (cliente: Cliente) => {
    if (cliente.forma_giuridica === 'persona_fisica') {
      return `${cliente.cognome || ''} ${cliente.nome || ''}`.trim();
    }
    return cliente.ragione_sociale || '';
  };

  const getFornitoreDisplayName = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      return `${fornitore.cognome || ''} ${fornitore.nome || ''}`.trim();
    }
    return fornitore.ragione_sociale || '';
  };

  const handleSelectCliente = (clienteId: string) => {
    const cliente = clienti.find(c => c.id === clienteId);
    if (cliente) {
      setSelectedClienteId(clienteId);
      setEditedData(prev => ({
        ...prev,
        cliente_id: clienteId,
        cliente: getClienteDisplayName(cliente),
        // Auto-compila i dati dal cliente
        aliquota_iva: cliente.aliquota_iva_predefinita || prev.aliquota_iva,
        modalita_pagamento: cliente.modalita_pagamento_preferita || prev.modalita_pagamento,
        categoria: cliente.tipologia_settore || prev.categoria,
      }));
      setOpenClienteCombo(false);
    }
  };

  const handleSelectFornitore = (fornitoreId: string) => {
    const fornitore = fornitori.find(f => f.id === fornitoreId);
    if (fornitore) {
      setSelectedFornitoreId(fornitoreId);
      setEditedData(prev => ({
        ...prev,
        fornitore_id: fornitoreId,
        fornitore: getFornitoreDisplayName(fornitore),
        // Auto-compila i dati dal fornitore
        categoria: fornitore.tipologia_settore || prev.categoria,
      }));
      setOpenFornitoreCombo(false);
    }
  };

  const handleSelectCommessa = (commessaId: string) => {
    const commessa = commesse.find(c => c.id === commessaId);
    if (commessa) {
      setSelectedCommessaId(commessaId);
      setEditedData(prev => ({
        ...prev,
        commessa_id: commessaId,
      }));
      setOpenCommessaCombo(false);
    }
  };

  // Funzione per gestire ordinamento
  const handleSort = (field: string) => {
    // Map DataTable column keys to SortField
    const sortFieldMap: Record<string, SortField> = {
      'descrizione': 'cliente_fornitore',
      'data_fattura': 'data_fattura',
      'scadenza_pagamento': 'scadenza_pagamento',
      'importo_totale': 'importo_totale',
    };

    const mappedField = sortFieldMap[field] || field as SortField;

    if (sortField === mappedField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(mappedField);
      setSortDirection('asc');
    }
  };

  // Funzione per resettare i filtri avanzati
  const resetAdvancedFilters = () => {
    setDateFromScadenza('');
    setDateToScadenza('');
    setMetodoPagamento('tutti');
    setAnnoFiscale('tutti');
    setImportoDa('');
    setImportoA('');
  };

  // Calcola anni fiscali disponibili
  const getAvailableYears = () => {
    const years = new Set<number>();
    [...fattureAttive, ...fatturePassive].forEach(f => {
      years.add(new Date(f.data_fattura).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // Controlla se una fattura è scaduta
  const isScaduta = (fattura: FatturaAttiva | FatturaPassiva) => {
    if (!fattura.scadenza_pagamento || fattura.stato_pagamento === 'Pagato') {
      return false;
    }
    return new Date(fattura.scadenza_pagamento) < new Date();
  };

  // Filter fatture based on active tab, search and filters
  const filteredFatture = () => {
    let fatture: Array<FatturaAttiva | FatturaPassiva> = [];

    // Filtro per tab
    if (activeTab === 'all') {
      fatture = [...fattureAttive, ...fatturePassive];
    } else if (activeTab === 'emesse') {
      fatture = fattureAttive;
    } else if (activeTab === 'ricevute') {
      fatture = fatturePassive;
    }

    // Filtro ricerca testuale (numero fattura, cliente/fornitore, commessa)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      fatture = fatture.filter((f) => {
        const searchFields = [
          f.numero_fattura,
          'cliente' in f ? f.cliente : (f as FatturaPassiva).fornitore,
          f.commesse?.nome_commessa,
        ].filter(Boolean);

        return searchFields.some((field) =>
          field?.toLowerCase().includes(query)
        );
      });
    }

    // Filtro stato pagamento
    if (statoFattura !== 'tutti') {
      if (statoFattura === 'scaduta') {
        fatture = fatture.filter(f => isScaduta(f));
      } else {
        fatture = fatture.filter(f => f.stato_pagamento === statoFattura);
      }
    }

    // Filtro data emissione
    if (dateFromEmissione) {
      fatture = fatture.filter(f => f.data_fattura >= dateFromEmissione);
    }
    if (dateToEmissione) {
      fatture = fatture.filter(f => f.data_fattura <= dateToEmissione);
    }

    // Filtri avanzati
    if (dateFromScadenza) {
      fatture = fatture.filter(f => f.scadenza_pagamento && f.scadenza_pagamento >= dateFromScadenza);
    }
    if (dateToScadenza) {
      fatture = fatture.filter(f => f.scadenza_pagamento && f.scadenza_pagamento <= dateToScadenza);
    }
    if (metodoPagamento !== 'tutti') {
      fatture = fatture.filter(f => f.modalita_pagamento?.toLowerCase() === metodoPagamento.toLowerCase());
    }
    if (annoFiscale !== 'tutti') {
      fatture = fatture.filter(f => new Date(f.data_fattura).getFullYear() === parseInt(annoFiscale));
    }
    if (importoDa) {
      fatture = fatture.filter(f => f.importo_totale >= parseFloat(importoDa));
    }
    if (importoA) {
      fatture = fatture.filter(f => f.importo_totale <= parseFloat(importoA));
    }

    // Ordinamento
    fatture.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'data_fattura':
          aVal = new Date(a.data_fattura).getTime();
          bVal = new Date(b.data_fattura).getTime();
          break;
        case 'scadenza_pagamento':
          aVal = a.scadenza_pagamento ? new Date(a.scadenza_pagamento).getTime() : 0;
          bVal = b.scadenza_pagamento ? new Date(b.scadenza_pagamento).getTime() : 0;
          break;
        case 'importo_totale':
          aVal = a.importo_totale;
          bVal = b.importo_totale;
          break;
        case 'cliente_fornitore':
          aVal = ('cliente' in a ? a.cliente : (a as FatturaPassiva).fornitore).toLowerCase();
          bVal = ('cliente' in b ? b.cliente : (b as FatturaPassiva).fornitore).toLowerCase();
          break;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return fatture;
  };

  // Pagination logic
  const allFilteredFatture = filteredFatture();
  const totalFatture = allFilteredFatture.length;
  const totalPages = Math.ceil(totalFatture / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFatture = allFilteredFatture.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  const counts = {
    all: fattureAttive.length + fatturePassive.length,
    emesse: fattureAttive.length,
    ricevute: fatturePassive.length,
  };

  // Helper per aggiornare lo stato di una fattura
  const handleUpdateStatoPagamento = async (
    fattura: FatturaAttiva | FatturaPassiva,
    value: 'Pagato' | 'Non Pagato' | 'Da Incassare'
  ) => {
    try {
      const supabase = createClient();
      const isEmessa = 'cliente' in fattura;
      const tableName = isEmessa ? 'fatture_attive' : 'fatture_passive';

      // Aggiorna ottimisticamente la UI
      const updatedFatture = isEmessa ? [...fattureAttive] : [...fatturePassive];
      const index = updatedFatture.findIndex(f => f.id === fattura.id);
      if (index !== -1) {
        updatedFatture[index] = {
          ...updatedFatture[index],
          stato_pagamento: value,
          data_pagamento: value === 'Pagato' ? new Date().toISOString().split('T')[0] : null
        };
        if (isEmessa) {
          setFattureAttive(updatedFatture as FatturaAttiva[]);
        } else {
          setFatturePassive(updatedFatture as FatturaPassiva[]);
        }
      }

      const { error } = await supabase
        .from(tableName)
        .update({
          stato_pagamento: value,
          data_pagamento: value === 'Pagato' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', fattura.id);

      if (error) throw error;

      toast.success('Stato aggiornato');
    } catch (error) {
      toast.error('Errore nell\'aggiornamento');
      await loadFatture();
    }
  };

  // Configurazione colonne per DataTable
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
                {fattura.commesse?.nome_commessa && (
                  <span className="font-bold text-foreground"> - {fattura.commesse.nome_commessa}</span>
                )}
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

  const toggleSelectAll = () => {
    const allIds = paginatedFatture.map(f => f.id);
    if (selectedFatture.size === allIds.length) {
      setSelectedFatture(new Set());
    } else {
      setSelectedFatture(new Set(allIds));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedFatture);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFatture(newSelected);
  };

  const handleRowClick = (fattura: FatturaAttiva | FatturaPassiva) => {
    setSelectedFatturaDetail(fattura);
    setEditedData(fattura);
    setIsEditing(false);

    // Reset selezioni
    setSelectedClienteId('cliente_id' in fattura ? fattura.cliente_id || '' : '');
    setSelectedFornitoreId('fornitore_id' in fattura ? fattura.fornitore_id || '' : '');
    setSelectedCommessaId(fattura.commessa_id || '');

    setIsSheetOpen(true);
  };

  const handleEdit = async () => {
    setIsEditing(true);

    // Carica i dati per i dropdown quando si entra in modalità modifica
    if (tenantId) {
      await Promise.all([
        loadClienti(),
        loadFornitori(),
        loadCommesse(),
      ]);
    }
  };

  const handleCancelEdit = () => {
    setEditedData(selectedFatturaDetail || {});
    setIsEditing(false);
    setNewFile(null);
    setDeleteCurrentFile(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Valida dimensione (10MB max)
      if (file.size > 10485760) {
        toast.error('Il file è troppo grande. Massimo 10MB');
        return;
      }

      // Valida tipo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Tipo di file non supportato. Usa PDF o immagini');
        return;
      }

      setNewFile(file);
      setDeleteCurrentFile(false); // Se carica nuovo file, non eliminare quello vecchio
    }
  };

  const uploadFile = async (fatturaId: string): Promise<string | null> => {
    if (!newFile || !tenantId) return null;

    try {
      setUploadingFile(true);
      const supabase = createClient();

      const isEmessa = 'cliente' in selectedFatturaDetail!;
      // Mantieni il nome originale del file
      const originalFileName = newFile.name;
      const filePath = `${tenantId}/fatture/${isEmessa ? 'attive' : 'passive'}/${fatturaId}/${originalFileName}`;

      const { data, error } = await supabase.storage
        .from('app-storage')
        .upload(filePath, newFile, {
          cacheControl: '3600',
          upsert: true, // Sovrascrivi se esiste già
        });

      if (error) throw error;

      // Salva solo il path, non l'URL pubblico (per sicurezza)
      // L'URL firmato verrà generato al momento della visualizzazione

      // Elimina il file vecchio se esiste e se è diverso dal nuovo
      if (selectedFatturaDetail?.allegato_url && selectedFatturaDetail.allegato_url !== data.path) {
        await supabase.storage.from('app-storage').remove([selectedFatturaDetail.allegato_url]);
      }

      return data.path;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Errore durante il caricamento del file');
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const deleteFile = async (): Promise<void> => {
    if (!selectedFatturaDetail?.allegato_url) return;

    try {
      const supabase = createClient();
      const filePath = selectedFatturaDetail.allegato_url;

      const { error } = await supabase.storage
        .from('app-storage')
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Errore durante l\'eliminazione del file');
    }
  };

  // Apri file in modo sicuro tramite API protetta
  const handleOpenFile = (filePath: string) => {
    // Usa la nostra API protetta che verifica autenticazione e permessi
    const secureUrl = `/api/storage/download?path=${encodeURIComponent(filePath)}`;
    window.open(secureUrl, '_blank');
  };

  const handleSave = async () => {
    if (!selectedFatturaDetail) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const isEmessa = 'cliente' in selectedFatturaDetail;
      const tableName = isEmessa ? 'fatture_attive' : 'fatture_passive';

      // Gestione allegato
      let allegato_url = selectedFatturaDetail.allegato_url;

      // Se c'è un nuovo file, caricalo
      if (newFile) {
        const uploadedPath = await uploadFile(selectedFatturaDetail.id);
        if (uploadedPath) {
          allegato_url = uploadedPath;
        }
      }
      // Se è richiesta l'eliminazione del file corrente e non c'è un nuovo file
      else if (deleteCurrentFile && allegato_url) {
        await deleteFile();
        allegato_url = null;
      }

      // Calcola importo_iva se cambiano imponibile o aliquota
      const importo_imponibile = parseFloat(editedData.importo_imponibile?.toString() || '0');
      const aliquota_iva = parseFloat(editedData.aliquota_iva?.toString() || '0');
      const importo_iva = (importo_imponibile * aliquota_iva / 100);

      const dataToUpdate = {
        numero_fattura: editedData.numero_fattura,
        categoria: editedData.categoria,
        data_fattura: editedData.data_fattura,
        scadenza_pagamento: editedData.scadenza_pagamento,
        data_pagamento: editedData.data_pagamento,
        importo_imponibile,
        aliquota_iva,
        importo_iva,
        modalita_pagamento: editedData.modalita_pagamento,
        stato_pagamento: editedData.stato_pagamento,
        note: editedData.note,
        commessa_id: editedData.commessa_id,
        allegato_url,
      };

      // Aggiungi campi specifici per fatture attive
      if (isEmessa && 'cliente' in editedData) {
        Object.assign(dataToUpdate, {
          cliente: editedData.cliente,
          cliente_id: editedData.cliente_id,
        });
      }

      // Aggiungi campi specifici per fatture passive
      if (!isEmessa && 'fornitore' in editedData) {
        Object.assign(dataToUpdate, {
          fornitore: editedData.fornitore,
          fornitore_id: editedData.fornitore_id,
          banca_emissione: 'banca_emissione' in editedData ? editedData.banca_emissione : undefined,
          numero_conto: 'numero_conto' in editedData ? editedData.numero_conto : undefined,
        });
      }

      const { error } = await supabase
        .from(tableName)
        .update(dataToUpdate)
        .eq('id', selectedFatturaDetail.id);

      if (error) throw error;

      toast.success('Fattura aggiornata con successo');
      setIsEditing(false);
      setNewFile(null);
      setDeleteCurrentFile(false);

      // Ricarica i dati
      await loadFatture();

      // Aggiorna i dati visualizzati nel modal
      const updatedFattura = { ...selectedFatturaDetail, ...editedData, importo_iva, allegato_url };
      setSelectedFatturaDetail(updatedFattura as FatturaAttiva | FatturaPassiva);

    } catch (error) {
      console.error('Error updating fattura:', error);
      toast.error('Errore nell\'aggiornamento della fattura');
    } finally {
      setIsSaving(false);
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
          // Continua comunque con l'eliminazione della fattura
        }
      }

      // Elimina la fattura dal database
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', selectedFatturaDetail.id);

      if (error) throw error;

      toast.success('Fattura eliminata con successo');
      setIsSheetOpen(false);
      setShowDeleteConfirm(false);

      // Ricarica i dati
      await loadFatture();

    } catch (error) {
      console.error('Error deleting fattura:', error);
      toast.error('Errore nell\'eliminazione della fattura');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portal: Bottoni nella Navbar */}
      {navbarActionsContainer && createPortal(
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push('/fatture/nuova-emessa')}
            variant="outline"
            className="gap-2 h-10 rounded-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Emessa
          </Button>
          <Button
            onClick={() => router.push('/fatture/nuova-ricevuta')}
            className="gap-2 h-10 rounded-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Ricevuta
          </Button>
        </div>,
        navbarActionsContainer
      )}

      {/* Tabs */}
      <TabsFilter<TabType>
          tabs={[
            {
              value: 'all',
              label: 'Tutte',
              icon: Receipt,
              count: counts.all,
              badgeClassName: 'bg-primary/10 text-primary',
            },
            {
              value: 'emesse',
              label: 'Emesse',
              icon: ArrowUpCircle,
              count: counts.emesse,
              activeColor: 'border-green-500 text-green-700',
              badgeClassName: 'bg-primary/10 text-primary',
            },
            {
              value: 'ricevute',
              label: 'Ricevute',
              icon: ArrowDownCircle,
              count: counts.ricevute,
              activeColor: 'border-red-500 text-red-700',
              badgeClassName: 'bg-primary/10 text-primary',
            },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Campo ricerca */}
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
          <Input
            placeholder="Cerca per codice, cliente/fornitore, commessa"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>

        {/* Spazio vuoto al posto del filtro Tipo */}
        <div className="h-11 w-full lg:w-[180px]"></div>

        {/* Spazio flessibile per spingere a destra */}
        <div className="flex-1"></div>

        {/* Pulsante elimina selezionate */}
        {selectedFatture.size > 0 && (
          <Button
            onClick={() => setShowBulkDeleteModal(true)}
            variant="outline"
            className="h-11 gap-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Elimina ({selectedFatture.size})
          </Button>
        )}

        {/* Stato */}
        <Select value={statoFattura} onValueChange={setStatoFattura}>
          <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
            <SelectValue>
              {statoFattura === 'tutti' ? 'Stato: Tutti' :
               statoFattura === 'Pagato' ? 'Stato: Pagato' :
               statoFattura === 'Non Pagato' ? 'Stato: Non Pagato' :
               statoFattura === 'Da Incassare' ? 'Stato: Da Incassare' : 'Stato'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti</SelectItem>
            <SelectItem value="Pagato">Pagato</SelectItem>
            <SelectItem value="Non Pagato">Non Pagato</SelectItem>
            <SelectItem value="Da Incassare">Da Incassare</SelectItem>
          </SelectContent>
        </Select>

        {/* Periodo emissione */}
        <DateRangePicker
          from={dateFromEmissione}
          to={dateToEmissione}
          onRangeChange={(from, to) => {
            setDateFromEmissione(from);
            setDateToEmissione(to);
          }}
          placeholder="Periodo"
          className="w-full lg:w-[240px]"
        />

        {/* Pulsante filtri avanzati */}
        <Button
          onClick={() => setShowAdvancedFilters(true)}
          variant="outline"
          className="h-11 w-11 border-2 border-border rounded-sm relative bg-white"
          size="icon"
        >
          <Filter className="h-4 w-4" />
          {(dateFromScadenza || dateToScadenza || metodoPagamento !== 'tutti' || annoFiscale !== 'tutti' || importoDa || importoA) && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
          )}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filteredFatture().length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed border-border bg-card/50">
          <div className="text-center space-y-3">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-medium">Nessuna fattura trovata</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {searchQuery ? 'Prova con una ricerca diversa' : 'Inizia creando una nuova fattura'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <DataTable<FatturaAttiva | FatturaPassiva>
          data={allFilteredFatture}
          columns={columns}
          keyField="id"
          loading={loading}
          searchable={false}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedRows={selectedFatture}
          onSelectionChange={setSelectedFatture}
          currentPage={currentPage}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setItemsPerPage}
          onRowClick={handleRowClick}
          emptyIcon={Receipt}
          emptyTitle="Nessuna fattura trovata"
          emptyDescription={searchQuery ? 'Prova con una ricerca diversa' : 'Inizia creando una nuova fattura'}
        />
      )}

      {/* Sheet Modal per dettagli fattura */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col [&>button]:hidden">
          {selectedFatturaDetail && (
            <>
              {/* Header fisso */}
              <div className="px-6 py-4 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {'cliente' in selectedFatturaDetail ? (
                      <>
                        <ArrowUpCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                        <SheetTitle className="text-2xl font-bold truncate">
                          Dettagli Fattura Emessa
                        </SheetTitle>
                      </>
                    ) : (
                      <>
                        <ArrowDownCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                        <SheetTitle className="text-2xl font-bold truncate">
                          Dettagli Fattura Ricevuta
                        </SheetTitle>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isEditing ? (
                      <>
                        <Button
                          onClick={() => {
                            setIsSheetOpen(false);
                            // Aspetta che il modal si chiuda prima di aprire la conferma
                            setTimeout(() => setShowDeleteConfirm(true), 200);
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Elimina
                        </Button>
                        <Button
                          onClick={handleEdit}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Modifica
                        </Button>
                        <Button
                          onClick={() => setIsSheetOpen(false)}
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-2"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={isSaving}
                        >
                          <XCircle className="h-4 w-4" />
                          Annulla
                        </Button>
                        <Button
                          onClick={handleSave}
                          size="sm"
                          className="gap-2"
                          disabled={isSaving}
                        >
                          <Save className="h-4 w-4" />
                          {isSaving ? 'Salvataggio...' : 'Salva'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenuto scrollabile */}
              <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
                <div className="space-y-6">
                {/* Dati Fattura */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Dati Fattura</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Numero Fattura</p>
                      {isEditing ? (
                        <Input
                          value={editedData.numero_fattura || ''}
                          onChange={(e) => setEditedData({...editedData, numero_fattura: e.target.value})}
                          className="h-11 border-2 border-border bg-white"
                        />
                      ) : (
                        <p className="font-bold">{selectedFatturaDetail.numero_fattura}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {'cliente' in selectedFatturaDetail ? 'Cliente' : 'Fornitore'}
                      </p>
                      {isEditing ? (
                        'cliente' in selectedFatturaDetail ? (
                          <Popover open={openClienteCombo} onOpenChange={setOpenClienteCombo}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openClienteCombo}
                                className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                              >
                                {'cliente' in editedData ? editedData.cliente || "Seleziona cliente..." : "Seleziona cliente..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                              <Command>
                                <CommandInput
                                  placeholder="Cerca cliente..."
                                  value={'cliente' in editedData ? editedData.cliente || '' : ''}
                                  onValueChange={(value) => {
                                    if ('cliente' in editedData) {
                                      setEditedData({ ...editedData, cliente: value });
                                    }
                                    setSelectedClienteId('');
                                  }}
                                />
                                <CommandEmpty>
                                  <div className="p-2 text-sm text-muted-foreground">
                                    Nessun cliente trovato
                                  </div>
                                </CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-auto">
                                  {clienti.map((cliente) => (
                                    <CommandItem
                                      key={cliente.id}
                                      value={getClienteDisplayName(cliente)}
                                      onSelect={() => handleSelectCliente(cliente.id)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedClienteId === cliente.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{getClienteDisplayName(cliente)}</span>
                                        {cliente.tipologia_settore && (
                                          <span className="text-xs text-muted-foreground">{cliente.tipologia_settore}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Popover open={openFornitoreCombo} onOpenChange={setOpenFornitoreCombo}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openFornitoreCombo}
                                className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                              >
                                {(editedData as FatturaPassiva).fornitore || "Seleziona fornitore..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                              <Command>
                                <CommandInput
                                  placeholder="Cerca fornitore..."
                                  value={(editedData as FatturaPassiva).fornitore || ''}
                                  onValueChange={(value) => {
                                    setEditedData({ ...editedData, fornitore: value });
                                    setSelectedFornitoreId('');
                                  }}
                                />
                                <CommandEmpty>
                                  <div className="p-2 text-sm text-muted-foreground">
                                    Nessun fornitore trovato
                                  </div>
                                </CommandEmpty>
                                <CommandGroup className="max-h-[200px] overflow-auto">
                                  {fornitori.map((fornitore) => (
                                    <CommandItem
                                      key={fornitore.id}
                                      value={getFornitoreDisplayName(fornitore)}
                                      onSelect={() => handleSelectFornitore(fornitore.id)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedFornitoreId === fornitore.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{getFornitoreDisplayName(fornitore)}</span>
                                        {fornitore.tipologia_settore && (
                                          <span className="text-xs text-muted-foreground">{fornitore.tipologia_settore}</span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )
                      ) : (
                        <p className="font-medium">
                          {'cliente' in selectedFatturaDetail
                            ? selectedFatturaDetail.cliente
                            : (selectedFatturaDetail as FatturaPassiva).fornitore}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Categoria</p>
                      {isEditing ? (
                        <Input
                          value={editedData.categoria || ''}
                          onChange={(e) => setEditedData({...editedData, categoria: e.target.value})}
                          className="h-11 border-2 border-border bg-white"
                        />
                      ) : (
                        <p className="font-medium">{selectedFatturaDetail.categoria || '-'}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Data Fattura</p>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editedData.data_fattura || ''}
                          onChange={(e) => setEditedData({...editedData, data_fattura: e.target.value})}
                          className="h-11 border-2 border-border bg-white"
                        />
                      ) : (
                        <p className="font-medium">
                          {formatDate(selectedFatturaDetail.data_fattura)}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Scadenza Pagamento</p>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            type="date"
                            value={editedData.scadenza_pagamento || ''}
                            onChange={(e) => setEditedData({...editedData, scadenza_pagamento: e.target.value})}
                            className="h-11 border-2 border-border bg-white pr-10"
                          />
                          {editedData.scadenza_pagamento && (
                            <button
                              type="button"
                              onClick={() => setEditedData({...editedData, scadenza_pagamento: null})}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className={`font-medium ${
                          selectedFatturaDetail.scadenza_pagamento &&
                          new Date(selectedFatturaDetail.scadenza_pagamento) < new Date() &&
                          selectedFatturaDetail.stato_pagamento !== 'Pagato'
                            ? 'text-red-600'
                            : ''
                        }`}>
                          {selectedFatturaDetail.scadenza_pagamento
                            ? formatDate(selectedFatturaDetail.scadenza_pagamento)
                            : '-'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Importi integrati */}
                  <div className="bg-primary/5 p-6 rounded-lg mt-4">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Importo Imponibile</p>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editedData.importo_imponibile || ''}
                            onChange={(e) => setEditedData({...editedData, importo_imponibile: parseFloat(e.target.value)})}
                            className="h-11 border-2 border-border bg-white"
                          />
                        ) : (
                          <p className="text-xl font-bold text-foreground">
                            {new Intl.NumberFormat('it-IT', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(selectedFatturaDetail.importo_imponibile)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          IVA {isEditing ? '' : `(${selectedFatturaDetail.aliquota_iva}%)`}
                        </p>
                        {isEditing ? (
                          <Select
                            value={editedData.aliquota_iva?.toString() || '22'}
                            onValueChange={(value) => setEditedData({...editedData, aliquota_iva: parseFloat(value)})}
                          >
                            <SelectTrigger className="h-11 border-2 border-border bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="4">4%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="22">22%</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-xl font-bold text-foreground">
                            {new Intl.NumberFormat('it-IT', {
                              style: 'currency',
                              currency: 'EUR'
                            }).format(selectedFatturaDetail.importo_iva)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Totale</p>
                        <p className="text-xl font-bold text-foreground">
                          {new Intl.NumberFormat('it-IT', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(
                            isEditing
                              ? (parseFloat(editedData.importo_imponibile?.toString() || '0') * (1 + parseFloat(editedData.aliquota_iva?.toString() || '0') / 100))
                              : selectedFatturaDetail.importo_totale
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stato Pagamento */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Stato Pagamento</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Modalità di Pagamento</p>
                      {isEditing ? (
                        <Input
                          value={editedData.modalita_pagamento || ''}
                          onChange={(e) => setEditedData({...editedData, modalita_pagamento: e.target.value})}
                          placeholder="es. Bonifico bancario"
                          className="h-11 border-2 border-border bg-white"
                        />
                      ) : (
                        <p className="font-medium">{selectedFatturaDetail.modalita_pagamento || '-'}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Stato Pagamento</p>
                      {isEditing ? (
                        <Select
                          value={editedData.stato_pagamento || selectedFatturaDetail.stato_pagamento}
                          onValueChange={(value) => {
                            setEditedData({
                              ...editedData,
                              stato_pagamento: value,
                              // Elimina data pagamento se si cambia a Non Pagato/Da Incassare
                              data_pagamento: value === 'Pagato' ? editedData.data_pagamento : null
                            });
                          }}
                        >
                          <SelectTrigger className="h-11 border-2 border-border bg-white">
                            <SelectValue>
                              {(editedData.stato_pagamento || selectedFatturaDetail.stato_pagamento) === 'Pagato'
                                ? 'Pagato'
                                : ('cliente' in selectedFatturaDetail ? 'Da Incassare' : 'Non Pagato')}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {'cliente' in selectedFatturaDetail ? (
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
                      ) : (
                        <span className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                          selectedFatturaDetail.stato_pagamento === 'Pagato'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {selectedFatturaDetail.stato_pagamento === 'Pagato'
                            ? 'Pagato'
                            : ('cliente' in selectedFatturaDetail ? 'Da Incassare' : 'Non Pagato')}
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Data Pagamento</p>
                      {isEditing ? (
                        <div className="relative">
                          <Input
                            type="date"
                            value={editedData.data_pagamento || ''}
                            onChange={(e) => setEditedData({...editedData, data_pagamento: e.target.value})}
                            disabled={editedData.stato_pagamento !== 'Pagato'}
                            className={`h-11 border-2 border-border pr-10 ${
                              editedData.stato_pagamento !== 'Pagato'
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white'
                            }`}
                          />
                          {editedData.data_pagamento && editedData.stato_pagamento === 'Pagato' && (
                            <button
                              type="button"
                              onClick={() => setEditedData({...editedData, data_pagamento: null})}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="font-medium">
                          {selectedFatturaDetail.data_pagamento
                            ? formatDate(selectedFatturaDetail.data_pagamento)
                            : '-'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dati Bancari (solo per fatture passive) */}
                {'banca_emissione' in selectedFatturaDetail && (selectedFatturaDetail.banca_emissione || selectedFatturaDetail.numero_conto || isEditing) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Dati Bancari</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Banca Emissione</p>
                        {isEditing ? (
                          <Input
                            value={(editedData as FatturaPassiva).banca_emissione || ''}
                            onChange={(e) => setEditedData({...editedData, banca_emissione: e.target.value})}
                            placeholder="es. Intesa Sanpaolo"
                            className="h-11 border-2 border-border bg-white"
                          />
                        ) : (
                          <p className="font-medium">{selectedFatturaDetail.banca_emissione || '-'}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Numero Conto</p>
                        {isEditing ? (
                          <Input
                            value={(editedData as FatturaPassiva).numero_conto || ''}
                            onChange={(e) => setEditedData({...editedData, numero_conto: e.target.value})}
                            placeholder="es. IT60X0542811101000000123456"
                            className="h-11 border-2 border-border bg-white"
                          />
                        ) : (
                          <p className="font-medium">{selectedFatturaDetail.numero_conto || '-'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Commessa Collegata */}
                {(selectedFatturaDetail.commesse?.nome_commessa || isEditing) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Collegamento Aziendale</h3>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Commessa</p>
                      {isEditing ? (
                        <Popover open={openCommessaCombo} onOpenChange={setOpenCommessaCombo}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openCommessaCombo}
                              className="w-full justify-between h-11 border-2 border-border bg-white font-normal"
                            >
                              {commesse.find(c => c.id === selectedCommessaId)?.nome_commessa || selectedFatturaDetail.commesse?.nome_commessa || "Seleziona commessa..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
                            <Command>
                              <CommandInput
                                placeholder="Cerca commessa..."
                              />
                              <CommandEmpty>
                                <div className="p-2 text-sm text-muted-foreground">
                                  Nessuna commessa trovata
                                </div>
                              </CommandEmpty>
                              <CommandGroup className="max-h-[200px] overflow-auto">
                                <CommandItem
                                  value="nessuna-commessa"
                                  onSelect={() => {
                                    setSelectedCommessaId('');
                                    setEditedData(prev => ({ ...prev, commessa_id: null }));
                                    setOpenCommessaCombo(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !selectedCommessaId ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="text-muted-foreground italic">Nessuna commessa</span>
                                </CommandItem>
                                {commesse.map((commessa) => (
                                  <CommandItem
                                    key={commessa.id}
                                    value={commessa.nome_commessa}
                                    onSelect={() => handleSelectCommessa(commessa.id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCommessaId === commessa.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{commessa.nome_commessa}</span>
                                      {commessa.codice_commessa && (
                                        <span className="text-xs text-muted-foreground">{commessa.codice_commessa}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <p className="font-bold">{selectedFatturaDetail.commesse?.nome_commessa || '-'}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Note Interne */}
                {(selectedFatturaDetail.note || isEditing) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Note Interne</h3>
                    {isEditing ? (
                      <Textarea
                        value={editedData.note || ''}
                        onChange={(e) => setEditedData({...editedData, note: e.target.value})}
                        placeholder="Inserisci eventuali note..."
                        rows={4}
                        className="resize-none border-2 border-border bg-white"
                      />
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{selectedFatturaDetail.note}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Allegato */}
                {(selectedFatturaDetail.allegato_url || isEditing) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">Documento</h3>

                    {isEditing ? (
                      <div className="space-y-3">
                        {/* File corrente */}
                        {selectedFatturaDetail.allegato_url && !deleteCurrentFile && !newFile && (
                          <div className="flex items-center gap-3 p-3 border-2 border-border rounded-lg bg-gray-50">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">File corrente</p>
                              <button
                                onClick={() => handleOpenFile(selectedFatturaDetail.allegato_url!)}
                                className="text-xs text-primary hover:underline"
                              >
                                Visualizza
                              </button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteCurrentFile(true)}
                              className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Elimina
                            </Button>
                          </div>
                        )}

                        {/* Stato eliminazione */}
                        {deleteCurrentFile && !newFile && (
                          <div className="flex items-center gap-3 p-3 border-2 border-red-200 rounded-lg bg-red-50">
                            <Trash2 className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-600">File verrà eliminato al salvataggio</p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteCurrentFile(false)}
                              className="border-2"
                            >
                              Annulla
                            </Button>
                          </div>
                        )}

                        {/* Nuovo file selezionato */}
                        {newFile && (
                          <div className="flex items-center gap-3 p-3 border-2 border-green-200 rounded-lg bg-green-50">
                            <FileText className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{newFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(newFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNewFile(null)}
                              className="border-2"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rimuovi
                            </Button>
                          </div>
                        )}

                        {/* Bottone per caricare nuovo file */}
                        {!newFile && (
                          <div>
                            <input
                              type="file"
                              id="file-upload-edit"
                              accept=".pdf,image/*"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            <label htmlFor="file-upload-edit">
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full border-2 border-border"
                                onClick={() => document.getElementById('file-upload-edit')?.click()}
                              >
                                <CloudUpload className="h-4 w-4 mr-2" />
                                {selectedFatturaDetail.allegato_url && !deleteCurrentFile
                                  ? 'Sostituisci file'
                                  : 'Carica file'}
                              </Button>
                            </label>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              PDF, JPG, PNG, WEBP (max 10MB)
                            </p>
                          </div>
                        )}
                      </div>
                    ) : selectedFatturaDetail.allegato_url ? (
                      <button
                        onClick={() => handleOpenFile(selectedFatturaDetail.allegato_url!)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <FileText className="h-5 w-5" />
                        Visualizza Allegato
                      </button>
                    ) : null}
                  </div>
                )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal Filtri Avanzati */}
      {showAdvancedFilters && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 space-y-6 relative animate-in zoom-in-95 duration-200 border-2 border-border max-h-[90vh] overflow-y-auto" style={{ zIndex: 10000 }}>
            <div className="flex items-start justify-between gap-4 sticky top-0 bg-white pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Filter className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Filtri Avanzati
                </h3>
              </div>
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                variant="outline"
                size="icon"
                className="h-8 w-8 border-2 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Scadenza */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Scadenza</label>
                <DateRangePicker
                  from={dateFromScadenza}
                  to={dateToScadenza}
                  onRangeChange={(from, to) => {
                    setDateFromScadenza(from);
                    setDateToScadenza(to);
                  }}
                  placeholder="Seleziona periodo scadenza"
                  className="w-full"
                />
              </div>

              {/* Metodo Pagamento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Metodo Pagamento</label>
                <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                  <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                    <SelectValue placeholder="Seleziona metodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti</SelectItem>
                    <SelectItem value="bonifico">Bonifico</SelectItem>
                    <SelectItem value="riba">RiBa</SelectItem>
                    <SelectItem value="contanti">Contanti</SelectItem>
                    <SelectItem value="assegno">Assegno</SelectItem>
                    <SelectItem value="carta">Carta di Credito</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Anno Fiscale */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Anno Fiscale</label>
                <Select value={annoFiscale} onValueChange={setAnnoFiscale}>
                  <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                    <SelectValue placeholder="Seleziona anno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti</SelectItem>
                    {getAvailableYears().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Importo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Importo (€)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Da"
                    value={importoDa}
                    onChange={(e) => setImportoDa(e.target.value)}
                    className="h-11 border-2 border-border rounded-sm bg-white"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="A"
                    value={importoA}
                    onChange={(e) => setImportoA(e.target.value)}
                    className="h-11 border-2 border-border rounded-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t sticky bottom-0 bg-white">
              <Button
                onClick={() => {
                  resetAdvancedFilters();
                }}
                variant="outline"
                className="border-2"
              >
                Resetta Filtri
              </Button>
              <Button
                onClick={() => setShowAdvancedFilters(false)}
                className="bg-primary hover:bg-primary/90"
              >
                Applica Filtri
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal di conferma eliminazione - usando portale per evitare conflitti */}
      {showDeleteConfirm && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4 relative animate-in zoom-in-95 duration-200 border-2 border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Elimina Fattura
                </h3>
              </div>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                size="icon"
                className="h-8 w-8 border-2 flex-shrink-0"
                disabled={isDeleting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Sei sicuro di voler eliminare questa fattura?
              </p>
              {selectedFatturaDetail && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Numero:</span>
                    <span className="font-semibold">{selectedFatturaDetail.numero_fattura}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {'cliente' in selectedFatturaDetail ? 'Cliente:' : 'Fornitore:'}
                    </span>
                    <span className="font-semibold">
                      {'cliente' in selectedFatturaDetail
                        ? selectedFatturaDetail.cliente
                        : (selectedFatturaDetail as FatturaPassiva).fornitore}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data:</span>
                    <span className="font-semibold">
                      {new Date(selectedFatturaDetail.data_fattura).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Importo:</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(selectedFatturaDetail.importo_totale)}
                    </span>
                  </div>
                  {selectedFatturaDetail.commesse?.nome_commessa && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commessa:</span>
                      <span className="font-semibold">{selectedFatturaDetail.commesse.nome_commessa}</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm text-red-600 font-medium">
                Questa azione non può essere annullata.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                disabled={isDeleting}
                className="border-2"
              >
                Annulla
              </Button>
              <Button
                onClick={handleDeleteFattura}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⏳</span>
                    Eliminazione...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Eliminazione Multipla */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBulkDeleteModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Elimina Fatture</h2>
                  <p className="text-sm text-muted-foreground">Stai per eliminare {selectedFatture.size} fattura/e</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="h-8 w-8 rounded-md hover:bg-gray-100 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista fatture */}
            <div className="px-6 py-4 overflow-y-auto max-h-[400px]">
              <p className="text-sm text-muted-foreground mb-4">Le seguenti fatture verranno eliminate definitivamente:</p>
              <div className="divide-y divide-border">
                {Array.from(selectedFatture).map((id) => {
                  const fattura = [...fattureAttive, ...fatturePassive].find(f => f.id === id);
                  if (!fattura) return null;
                  const isEmessa = 'cliente' in fattura;
                  const nomeCompleto = isEmessa ? fattura.cliente : (fattura as FatturaPassiva).fornitore;

                  return (
                    <div key={id} className="py-4 flex items-center gap-4">
                      {/* Icona tipo fattura */}
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isEmessa ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <ArrowUpCircle className={`h-4 w-4 ${isEmessa ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                      </div>

                      {/* Contenuto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-foreground">{fattura.numero_fattura}</span>
                          <span className="font-bold text-foreground">{nomeCompleto}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatDate(fattura.data_fattura)}</p>
                      </div>

                      {/* Importo */}
                      <div className="font-bold text-foreground flex-shrink-0">
                        {new Intl.NumberFormat('it-IT', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(fattura.importo_totale)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-gray-50">
              <p className="text-sm text-red-600 font-medium">
                Questa azione non può essere annullata
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBulkDeleteModal(false)}
                  variant="outline"
                  disabled={isDeletingBulk}
                >
                  Annulla
                </Button>
                <Button
                  onClick={async () => {
                    setIsDeletingBulk(true);
                    try {
                      const supabase = createClient();
                      const idsToDelete = Array.from(selectedFatture);

                      // Separa emesse e ricevute
                      const fattureToDelete = [...fattureAttive, ...fatturePassive].filter(f => idsToDelete.includes(f.id));
                      const idsEmesse = fattureToDelete.filter(f => 'cliente' in f).map(f => f.id);
                      const idsRicevute = fattureToDelete.filter(f => 'fornitore' in f).map(f => f.id);

                      // Elimina emesse
                      if (idsEmesse.length > 0) {
                        const { error } = await supabase
                          .from('fatture_attive')
                          .delete()
                          .in('id', idsEmesse);
                        if (error) throw error;
                      }

                      // Elimina ricevute
                      if (idsRicevute.length > 0) {
                        const { error } = await supabase
                          .from('fatture_passive')
                          .delete()
                          .in('id', idsRicevute);
                        if (error) throw error;
                      }

                      toast.success(`${selectedFatture.size} fattura/e eliminate con successo`);
                      setSelectedFatture(new Set());
                      setShowBulkDeleteModal(false);
                      await loadFatture();
                    } catch (error) {
                      toast.error('Errore nell\'eliminazione delle fatture');
                    } finally {
                      setIsDeletingBulk(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={isDeletingBulk}
                >
                  {isDeletingBulk ? 'Eliminazione...' : `Elimina ${selectedFatture.size} Fattura/e`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
