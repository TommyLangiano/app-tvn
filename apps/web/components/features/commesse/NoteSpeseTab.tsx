'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Receipt, CheckCircle, XCircle, Download, Grid3x3, List, X, ChevronRight, User, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MonthNavigator } from '@/components/ui/month-navigator';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { NotaSpesa } from '@/types/nota-spesa';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils/currency';
import { NuovaNotaSpesaModal } from '@/components/features/note-spesa/NuovaNotaSpesaModal';
import { InfoNotaSpesaModal } from '@/components/features/note-spesa/InfoNotaSpesaModal';
import { DeleteNotaSpesaModal } from '@/components/features/note-spesa/DeleteNotaSpesaModal';

type User = {
  id: string;
  email: string;
  role: string;
  dipendente_id?: string;
  user_metadata?: {
    full_name?: string;
  };
};

type Commessa = {
  id: string;
  nome_commessa: string;
};

type TabType = 'da_approvare' | 'approvate' | 'rifiutate';

interface NoteSpeseTabProps {
  commessaId: string;
  commessaNome: string;
}

export function NoteSpeseTab({ commessaId, commessaNome }: NoteSpeseTabProps) {
  const [loading, setLoading] = useState(true);
  const [noteSpese, setNoteSpese] = useState<NotaSpesa[]>([]);
  const [noteSpeseDaApprovare, setNoteSpeseDaApprovare] = useState<NotaSpesa[]>([]);
  const [noteSpeseRifiutate, setNoteSpeseRifiutate] = useState<NotaSpesa[]>([]);

  // Data for modals
  const [users, setUsers] = useState<User[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroUtente, setFiltroUtente] = useState<string>('');

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('da_approvare');

  // DataTable sorting states
  const [sortField, setSortField] = useState<string>('data_nota');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNuovaModal, setShowNuovaModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Multi-selection states
  const [selectedNoteSpese, setSelectedNoteSpese] = useState<Set<string>>(new Set());

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadInitialData(),
          loadNoteSpese(),
          loadNoteSpeseDaApprovare(),
          loadNoteSpeseRifiutate()
        ]);
      } finally {
        setLoading(false);
      }
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      loadNoteSpese();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear]);

  const loadInitialData = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
    if (!userTenant) return;

    // Load SOLO dipendenti del team della commessa
    const { data: teamData } = await supabase
      .from('commesse_team')
      .select('dipendente_id')
      .eq('commessa_id', commessaId)
      .eq('tenant_id', userTenant.tenant_id);

    if (teamData && teamData.length > 0) {
      const teamDipendenteIds = teamData.map(t => t.dipendente_id);

      const { data: dipendentiData } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome, email, user_id')
        .eq('tenant_id', userTenant.tenant_id)
        .in('id', teamDipendenteIds)
        .order('cognome');

      if (dipendentiData) {
        const dipendentiUsers: User[] = dipendentiData.map(dip => ({
          id: dip.user_id || dip.id,
          email: dip.email || '',
          role: 'dipendente',
          dipendente_id: dip.id,
          user_metadata: {
            full_name: `${dip.nome} ${dip.cognome}`
          }
        }));
        setUsers(dipendentiUsers);
      }
    } else {
      setUsers([]);
    }

    // Set commessa corrente
    setCommesse([{
      id: commessaId,
      nome_commessa: commessaNome
    }]);
  };

  const loadNoteSpese = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
    if (!userTenant) {
      return;
    }

    // Calculate date range for the selected month
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data: noteSpeseData, error } = await supabase
      .from('note_spesa')
      .select(`
        *,
        commesse!note_spesa_commessa_id_fkey (
          titolo,
          slug
        ),
        dipendenti!note_spesa_dipendente_id_fkey (
          id,
          nome,
          cognome,
          email
        ),
        approvatore:dipendenti!note_spesa_approvato_da_fkey (
          nome,
          cognome
        )
      `)
      .eq('tenant_id', userTenant.tenant_id)
      .eq('commessa_id', commessaId)
      .gte('data_nota', startDateStr)
      .lte('data_nota', endDateStr)
      .eq('stato', 'approvato')
      .order('data_nota', { ascending: false });

    if (error) {
      console.error('Error loading note spese:', error);
      toast.error('Errore nel caricamento delle note spese');
      return;
    }

    setNoteSpese(noteSpeseData || []);
  };

  const loadNoteSpeseDaApprovare = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
    if (!userTenant) return;

    const { data } = await supabase
      .from('note_spesa')
      .select(`
        *,
        commesse!note_spesa_commessa_id_fkey (
          titolo,
          slug
        ),
        dipendenti!note_spesa_dipendente_id_fkey (
          id,
          nome,
          cognome,
          email
        ),
        approvatore:dipendenti!note_spesa_approvato_da_fkey (
          nome,
          cognome
        )
      `)
      .eq('tenant_id', userTenant.tenant_id)
      .eq('commessa_id', commessaId)
      .eq('stato', 'da_approvare')
      .order('data_nota', { ascending: false });

    setNoteSpeseDaApprovare(data || []);
  };

  const loadNoteSpeseRifiutate = async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
    if (!userTenant) return;

    const { data } = await supabase
      .from('note_spesa')
      .select(`
        *,
        commesse!note_spesa_commessa_id_fkey (
          titolo,
          slug
        ),
        dipendenti!note_spesa_dipendente_id_fkey (
          id,
          nome,
          cognome,
          email
        ),
        approvatore:dipendenti!note_spesa_approvato_da_fkey (
          nome,
          cognome
        )
      `)
      .eq('tenant_id', userTenant.tenant_id)
      .eq('commessa_id', commessaId)
      .eq('stato', 'rifiutato')
      .order('data_nota', { ascending: false });

    setNoteSpeseRifiutate(data || []);
  };

  const handleMonthChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const getUserDisplayName = (notaSpesa: NotaSpesa) => {
    if (notaSpesa.dipendenti) {
      return `${notaSpesa.dipendenti.nome} ${notaSpesa.dipendenti.cognome}`;
    }
    return 'Utente';
  };

  // Filtri e ordinamento
  const noteSpeseFiltrate = useMemo(() => {
    let filtered = (activeTab as TabType) === 'da_approvare'
      ? [...noteSpeseDaApprovare]
      : (activeTab as TabType) === 'rifiutate'
      ? [...noteSpeseRifiutate]
      : [...noteSpese];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(n =>
        getUserDisplayName(n).toLowerCase().includes(searchLower) ||
        n.numero_nota.toLowerCase().includes(searchLower) ||
        n.categoria.toLowerCase().includes(searchLower) ||
        n.descrizione?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro Utente
    if (filtroUtente && filtroUtente !== 'all') {
      filtered = filtered.filter(n => n.dipendente_id === filtroUtente);
    }

    // Ordinamento
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'data_nota':
          aVal = new Date(a.data_nota).getTime();
          bVal = new Date(b.data_nota).getTime();
          break;
        case 'importo':
          aVal = a.importo;
          bVal = b.importo;
          break;
        case 'numero_nota':
          aVal = a.numero_nota;
          bVal = b.numero_nota;
          break;
        case 'dipendente':
          aVal = getUserDisplayName(a);
          bVal = getUserDisplayName(b);
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [noteSpese, noteSpeseDaApprovare, noteSpeseRifiutate, activeTab, searchTerm, filtroUtente, sortField, sortDirection]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      da_approvare: noteSpeseDaApprovare.length,
      approvate: noteSpese.length,
      rifiutate: noteSpeseRifiutate.length,
    };
  }, [noteSpese, noteSpeseDaApprovare, noteSpeseRifiutate]);

  // Paginazione
  const totalPages = Math.ceil(noteSpeseFiltrate.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const noteSpesePaginate = noteSpeseFiltrate.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroUtente, itemsPerPage]);

  // Count active filters
  const activeFiltersCount = [
    filtroUtente && filtroUtente !== 'all' ? filtroUtente : null
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setFiltroUtente('');
  };

  // Calcola totale importo
  const totaleImporto = noteSpeseFiltrate.reduce((sum, n) => sum + n.importo, 0);

  // DataTable columns
  const columns: DataTableColumn<NotaSpesa>[] = [
    {
      key: 'numero_nota',
      label: 'Numero',
      sortable: true,
      width: 'w-32',
      render: (notaSpesa) => (
        <span className="text-sm text-foreground font-medium">
          {notaSpesa.numero_nota}
        </span>
      ),
    },
    {
      key: 'dipendente',
      label: 'Dipendente',
      sortable: true,
      render: (notaSpesa) => (
        <span className="text-sm text-foreground font-medium">
          {getUserDisplayName(notaSpesa)}
        </span>
      ),
    },
    {
      key: 'data_nota',
      label: 'Data',
      sortable: true,
      render: (notaSpesa) => (
        <span className="text-sm text-muted-foreground">
          {new Date(notaSpesa.data_nota).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      sortable: true,
      render: (notaSpesa) => (
        <span className="text-sm text-foreground">
          {notaSpesa.categoria}
        </span>
      ),
    },
    {
      key: 'importo',
      label: 'Importo',
      sortable: true,
      width: 'w-32',
      render: (notaSpesa) => (
        <span className="text-base text-foreground font-bold">
          {formatCurrency(notaSpesa.importo)}
        </span>
      ),
    },
    {
      key: 'allegati',
      label: 'Allegati',
      sortable: false,
      width: 'w-24',
      render: (notaSpesa) => (
        <div className="flex items-center gap-1">
          {notaSpesa.allegati && notaSpesa.allegati.length > 0 ? (
            <>
              <Paperclip className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground font-medium">{notaSpesa.allegati.length}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: false,
      width: 'w-32',
      render: (notaSpesa) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
          notaSpesa.stato === 'approvato' ? 'bg-green-100 text-green-700' :
          notaSpesa.stato === 'da_approvare' ? 'bg-yellow-100 text-yellow-700' :
          notaSpesa.stato === 'rifiutato' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {notaSpesa.stato === 'approvato' ? 'Approvata' :
           notaSpesa.stato === 'da_approvare' ? 'Da Approvare' :
           notaSpesa.stato === 'rifiutato' ? 'Rifiutata' :
           'Bozza'}
        </span>
      ),
    },
    {
      key: 'arrow',
      label: '',
      sortable: false,
      width: 'w-12',
      render: () => (
        <div className="flex justify-end">
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      ),
    },
  ];

  const handleRowClick = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setShowInfoModal(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleNotaSpesaCreated = () => {
    loadNoteSpese();
    loadNoteSpeseDaApprovare();
    loadNoteSpeseRifiutate();
  };

  const handleNotaSpesaUpdated = () => {
    loadNoteSpese();
    loadNoteSpeseDaApprovare();
    loadNoteSpeseRifiutate();
  };

  const handleNotaSpesaDeleted = () => {
    loadNoteSpese();
    loadNoteSpeseDaApprovare();
    loadNoteSpeseRifiutate();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Caricamento note spese...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: Tabs e Nuova Nota Spesa */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Tabs - Inline style come Fatture */}
        <div className="inline-flex rounded-md border border-border bg-background p-1">
          <button
            onClick={() => setActiveTab('da_approvare')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeTab as TabType) === 'da_approvare'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-4 w-4" />
            Da Approvare
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeTab as TabType) === 'da_approvare'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {tabCounts.da_approvare}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('approvate')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeTab as TabType) === 'approvate'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            Approvate
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeTab as TabType) === 'approvate'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-green-100 text-green-700'
            }`}>
              {tabCounts.approvate}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rifiutate')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeTab as TabType) === 'rifiutate'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <XCircle className="h-4 w-4" />
            Rifiutate
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeTab as TabType) === 'rifiutate'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-red-100 text-red-700'
            }`}>
              {tabCounts.rifiutate}
            </span>
          </button>
        </div>

        <div className="flex-1" />

        {/* Nuova Nota Spesa */}
        <Button
          onClick={() => setShowNuovaModal(true)}
          className="gap-2 h-10 rounded-sm"
        >
          <Plus className="h-4 w-4" />
          Nuova Nota Spesa
        </Button>
      </div>

      {/* Search Bar and Filters */}
      <div className="space-y-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Bar */}
          <div className="relative w-full lg:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
            <Input
              placeholder="Cerca per numero, dipendente, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>

          {/* Spazio flessibile per spingere i filtri a destra */}
          <div className="flex-1"></div>

          {/* Filtro Dipendente */}
          <Select value={filtroUtente || undefined} onValueChange={(value) => setFiltroUtente(value)}>
            <SelectTrigger className="h-11 w-full lg:w-[200px] border-2 border-border rounded-sm bg-white">
              <SelectValue placeholder="Tutti i dipendenti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i dipendenti</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.dipendente_id || user.id}>
                  {user.user_metadata?.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {activeFiltersCount > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={clearAllFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Azzera filtri
            </Button>
          </div>
        )}
      </div>

      {/* Month Navigator + Export e View Toggle - Solo per tab approvate */}
      {(activeTab as TabType) === 'approvate' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1" />
          <MonthNavigator
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={handleMonthChange}
          />
          <div className="flex items-center gap-3 flex-1 justify-end">
            <Button
              onClick={() => toast.info('Esportazione in sviluppo')}
              variant="outline"
              className="gap-2 h-10 rounded-sm border-2"
            >
              <Download className="h-4 w-4" />
              Esporta
            </Button>

            {/* View Toggle */}
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-10 w-10 rounded-sm border-2"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-10 w-10 rounded-sm border-2"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* DataTable - List view */}
      {viewMode === 'list' && (
        <div className="!mt-0">
          <DataTable<NotaSpesa>
            columns={columns}
            data={noteSpesePaginate}
            totalItems={noteSpeseFiltrate.length}
            currentPage={currentPage}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={(value: number) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
            onRowClick={handleRowClick}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            selectedRows={selectedNoteSpese}
            onSelectionChange={setSelectedNoteSpese}
          />
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (activeTab as TabType) === 'approvate' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {noteSpesePaginate.map((notaSpesa) => (
            <div
              key={notaSpesa.id}
              onClick={() => handleRowClick(notaSpesa)}
              className={`rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                notaSpesa.stato === 'approvato' ? 'border-green-200 bg-green-50/50' :
                notaSpesa.stato === 'da_approvare' ? 'border-yellow-200 bg-yellow-50/50' :
                notaSpesa.stato === 'rifiutato' ? 'border-red-200 bg-red-50/50' :
                'border-gray-200 bg-gray-50/50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">{notaSpesa.numero_nota}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  notaSpesa.stato === 'approvato' ? 'bg-green-100 text-green-700' :
                  notaSpesa.stato === 'da_approvare' ? 'bg-yellow-100 text-yellow-700' :
                  notaSpesa.stato === 'rifiutato' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {notaSpesa.stato === 'approvato' ? 'Approvata' :
                   notaSpesa.stato === 'da_approvare' ? 'Da Approvare' :
                   notaSpesa.stato === 'rifiutato' ? 'Rifiutata' :
                   'Bozza'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{getUserDisplayName(notaSpesa)}</span>
                </div>

                <div className="text-sm text-muted-foreground">
                  {new Date(notaSpesa.data_nota).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-muted-foreground">{notaSpesa.categoria}</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(notaSpesa.importo)}</span>
                </div>

                {notaSpesa.allegati && notaSpesa.allegati.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground pt-1">
                    <Paperclip className="h-4 w-4" />
                    <span>{notaSpesa.allegati.length} allegat{notaSpesa.allegati.length === 1 ? 'o' : 'i'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showInfoModal && selectedNotaSpesa && (
        <InfoNotaSpesaModal
          notaSpesa={selectedNotaSpesa}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedNotaSpesa(null);
          }}
          onUpdate={handleNotaSpesaUpdated}
          onDelete={() => {
            setShowInfoModal(false);
            setShowDeleteModal(true);
          }}
        />
      )}

      {showDeleteModal && selectedNotaSpesa && (
        <DeleteNotaSpesaModal
          notaSpesa={selectedNotaSpesa}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedNotaSpesa(null);
          }}
          onDelete={handleNotaSpesaDeleted}
        />
      )}

      {showNuovaModal && (
        <NuovaNotaSpesaModal
          onClose={() => setShowNuovaModal(false)}
          onSuccess={handleNotaSpesaCreated}
          commessaId={commessaId}
        />
      )}
    </div>
  );
}
