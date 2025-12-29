'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Receipt, CheckCircle, XCircle, ChevronRight, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { NotaSpesa } from '@/types/nota-spesa';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils/currency';
import { NuovaNotaSpesaModal } from '@/components/features/note-spesa/NuovaNotaSpesaModal';
import { InfoNotaSpesaModal } from '@/components/features/note-spesa/InfoNotaSpesaModal';
import { DeleteNotaSpesaModal } from '@/components/features/note-spesa/DeleteNotaSpesaModal';
import { ConfermaNotaSpesaModal } from '@/components/features/note-spesa/ConfermaNotaSpesaModal';
import { TabsFilter } from '@/components/ui/tabs-filter';

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

export default function NoteSpesaPage() {
  const [loading, setLoading] = useState(true);
  const [noteSpese, setNoteSpese] = useState<NotaSpesa[]>([]);
  const [noteSpeseDaApprovare, setNoteSpeseDaApprovare] = useState<NotaSpesa[]>([]);
  const [noteSpeseRifiutate, setNoteSpeseRifiutate] = useState<NotaSpesa[]>([]);
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);

  // Data for filters
  const [users, setUsers] = useState<User[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroUtente, setFiltroUtente] = useState<string>('');
  const [filtroCommessa, setFiltroCommessa] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('approvate');

  // DataTable sorting states
  const [sortField, setSortField] = useState<string>('data_nota');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNuovaModal, setShowNuovaModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<'approva' | 'rifiuta' | null>(null);

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
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
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

    // Load tutti i dipendenti
    const { data: dipendentiData } = await supabase
      .from('dipendenti')
      .select('id, nome, cognome, email, user_id')
      .eq('tenant_id', userTenant.tenant_id)
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

    // Load tutte le commesse
    const { data: commesseData } = await supabase
      .from('commesse')
      .select('id, nome_commessa')
      .eq('tenant_id', userTenant.tenant_id)
      .order('nome_commessa');

    setCommesse(commesseData || []);
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
          id,
          nome_commessa,
          titolo,
          slug
        ),
        dipendenti!note_spesa_dipendente_id_fkey (
          id,
          nome,
          cognome,
          email
        ),
        categorie_note_spesa!note_spesa_categoria_fkey (
          id,
          nome,
          colore,
          icona
        )
      `)
      .eq('tenant_id', userTenant.tenant_id)
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
          id,
          nome_commessa,
          titolo,
          slug
        ),
        dipendenti!note_spesa_dipendente_id_fkey (
          id,
          nome,
          cognome,
          email
        ),
        categorie_note_spesa!note_spesa_categoria_fkey (
          id,
          nome,
          colore,
          icona
        )
      `)
      .eq('tenant_id', userTenant.tenant_id)
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
          id,
          nome_commessa,
          titolo,
          slug
        ),
        dipendenti!note_spesa_dipendente_id_fkey (
          id,
          nome,
          cognome,
          email
        ),
        categorie_note_spesa!note_spesa_categoria_fkey (
          id,
          nome,
          colore,
          icona
        )
      `)
      .eq('tenant_id', userTenant.tenant_id)
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

    // Filtro Commessa
    if (filtroCommessa && filtroCommessa !== 'all') {
      filtered = filtered.filter(n => n.commessa_id === filtroCommessa);
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
  }, [noteSpese, noteSpeseDaApprovare, noteSpeseRifiutate, activeTab, searchTerm, filtroUtente, filtroCommessa, sortField, sortDirection]);

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
  }, [searchTerm, filtroUtente, filtroCommessa, itemsPerPage]);

  // DataTable columns - Stile uguale a fatture
  const baseColumns: DataTableColumn<NotaSpesa>[] = [
    {
      key: 'descrizione',
      label: 'Descrizione',
      sortable: true,
      width: 'w-auto',
      render: (notaSpesa) => (
        <div className="flex items-center gap-3">
          <Receipt className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm text-foreground">{getUserDisplayName(notaSpesa)}</span>
            <span className="text-xs font-bold text-foreground">
              {notaSpesa.numero_nota}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'data_nota',
      label: 'Data',
      sortable: true,
      width: 'w-40',
      render: (notaSpesa) => (
        <div className="text-sm text-foreground">
          {new Date(notaSpesa.data_nota).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      ),
    },
    {
      key: 'importo',
      label: 'Importo',
      sortable: true,
      width: 'w-36',
      headerClassName: 'whitespace-nowrap',
      render: (notaSpesa) => (
        <div className="text-sm text-foreground font-bold">
          {formatCurrency(notaSpesa.importo)}
        </div>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      sortable: false,
      width: 'w-32',
      render: (notaSpesa) => (
        <div className="text-sm text-foreground">
          {notaSpesa.categorie_note_spesa?.nome || notaSpesa.categoria}
        </div>
      ),
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: false,
      width: 'w-36',
      render: (notaSpesa) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium ${
            notaSpesa.stato === 'approvato'
              ? 'bg-green-100 text-green-700'
              : notaSpesa.stato === 'da_approvare'
              ? 'bg-yellow-100 text-yellow-700'
              : notaSpesa.stato === 'rifiutato'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {notaSpesa.stato === 'approvato' ? 'Approvata' :
           notaSpesa.stato === 'da_approvare' ? 'Da Approvare' :
           notaSpesa.stato === 'rifiutato' ? 'Rifiutata' :
           'Bozza'}
        </span>
      ),
    },
    {
      key: 'allegati',
      label: 'Allegati',
      sortable: false,
      width: 'w-24',
      render: (notaSpesa) => (
        <>
          {notaSpesa.allegati && notaSpesa.allegati.length > 0 && (
            <button
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center hover:bg-primary/10 rounded-md p-2 transition-colors"
            >
              <FileText className="h-5 w-5 text-primary" />
            </button>
          )}
        </>
      ),
    },
  ];

  // Colonna azioni per tab "Da Approvare"
  const azioniColumn: DataTableColumn<NotaSpesa> = {
    key: 'azioni',
    label: 'Azioni',
    sortable: false,
    width: 'w-32',
    render: (notaSpesa) => (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleApprova(notaSpesa);
          }}
          className="inline-flex items-center justify-center bg-green-50 border-2 border-green-300 hover:bg-green-100 hover:border-green-400 rounded-md p-2.5 transition-all group"
          title="Approva"
        >
          <CheckCircle className="h-5 w-5 text-green-600 group-hover:text-green-700" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRifiuta(notaSpesa);
          }}
          className="inline-flex items-center justify-center bg-red-50 border-2 border-red-300 hover:bg-red-100 hover:border-red-400 rounded-md p-2.5 transition-all group"
          title="Rifiuta"
        >
          <XCircle className="h-5 w-5 text-red-600 group-hover:text-red-700" />
        </button>
      </div>
    ),
  };

  // Arrow column
  const arrowColumn: DataTableColumn<NotaSpesa> = {
    key: 'arrow',
    label: '',
    sortable: false,
    width: 'w-12',
    render: () => (
      <div className="flex items-center justify-end">
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    ),
  };

  // Costruisci le colonne in base al tab attivo
  const columns: DataTableColumn<NotaSpesa>[] = useMemo(() => {
    if (activeTab === 'da_approvare') {
      return [...baseColumns, azioniColumn, arrowColumn];
    }
    return [...baseColumns, arrowColumn];
  }, [activeTab]);

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

  const handleApprova = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setModalTipo('approva');
  };

  const handleRifiuta = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setModalTipo('rifiuta');
  };

  const handleConfirmAzione = async (motivo?: string) => {
    if (!selectedNotaSpesa || !modalTipo) return;

    try {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user tenant
      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1);

      const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
      if (!userTenant) throw new Error('Tenant not found');

      if (modalTipo === 'approva') {
        // Call RPC function for approval
        const { error: rpcError } = await supabase.rpc('approva_nota_spesa', {
          p_nota_spesa_id: selectedNotaSpesa.id,
          p_approvato_da: user.id
        });

        if (rpcError) throw rpcError;

        toast.success('Nota spesa approvata con successo');
      } else if (modalTipo === 'rifiuta') {
        if (!motivo) throw new Error('Motivo rifiuto obbligatorio');

        // Call RPC function for rejection
        const { error: rpcError } = await supabase.rpc('rifiuta_nota_spesa', {
          p_nota_spesa_id: selectedNotaSpesa.id,
          p_rifiutato_da: user.id,
          p_motivo: motivo
        });

        if (rpcError) throw rpcError;

        toast.success('Nota spesa rifiutata');
      }

      // Reload all lists
      await Promise.all([
        loadNoteSpese(),
        loadNoteSpeseDaApprovare(),
        loadNoteSpeseRifiutate()
      ]);

      // Close modal
      setModalTipo(null);
      setSelectedNotaSpesa(null);
    } catch (error: any) {
      console.error('Error processing nota spesa:', error);
      toast.error(error?.message || 'Errore nell\'elaborazione della nota spesa');
      throw error; // Re-throw to let modal handle it
    }
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
    <div className="space-y-6">
      {/* Bottone Nuova Nota Spesa nel Navbar */}
      {navbarActionsContainer && createPortal(
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNuovaModal(true)}
            className="gap-2 h-10 rounded-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Nota Spesa
          </Button>
        </div>,
        navbarActionsContainer
      )}

      {/* Tabs - Stile uguale a Fatture */}
      <TabsFilter<TabType>
        tabs={[
          {
            value: 'approvate',
            label: 'Approvate',
            icon: CheckCircle,
            count: tabCounts.approvate,
            activeColor: 'border-green-500 text-green-700',
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'da_approvare',
            label: 'Da approvare',
            icon: Clock,
            count: tabCounts.da_approvare,
            activeColor: 'border-yellow-500 text-yellow-700',
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'rifiutate',
            label: 'Rifiutate',
            icon: XCircle,
            count: tabCounts.rifiutate,
            activeColor: 'border-red-500 text-red-700',
            badgeClassName: 'bg-primary/10 text-primary',
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Search and Filters - Stile uguale a fatture */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search field */}
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
          <Input
            placeholder="Cerca per numero, dipendente, categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground w-full"
          />
        </div>

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

        {/* Filtro Commessa */}
        <Select value={filtroCommessa || undefined} onValueChange={(value) => setFiltroCommessa(value)}>
          <SelectTrigger className="h-11 w-full lg:w-[200px] border-2 border-border rounded-sm bg-white">
            <SelectValue placeholder="Tutte le commesse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le commesse</SelectItem>
            {commesse.map(commessa => (
              <SelectItem key={commessa.id} value={commessa.id}>
                {commessa.nome_commessa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DataTable */}
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

      {/* Modals */}
      <Sheet open={showInfoModal} onOpenChange={setShowInfoModal}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col [&>button]:hidden">
          {selectedNotaSpesa && (
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
        </SheetContent>
      </Sheet>

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
        />
      )}

      {modalTipo && selectedNotaSpesa && (
        <ConfermaNotaSpesaModal
          notaSpesa={selectedNotaSpesa}
          tipo={modalTipo}
          onClose={() => {
            setModalTipo(null);
            setSelectedNotaSpesa(null);
          }}
          onConfirm={handleConfirmAzione}
        />
      )}
    </div>
  );
}
