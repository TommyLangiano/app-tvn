'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Receipt, CheckCircle, XCircle, ChevronRight, FileText, Clock } from 'lucide-react';
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
import type { NotaSpesa } from '@/types/nota-spesa';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils/currency';
import { InfoNotaSpesaModal } from '@/components/features/note-spesa/InfoNotaSpesaModal';
import { DeleteNotaSpesaModal } from '@/components/features/note-spesa/DeleteNotaSpesaModal';
import { ConfermaNotaSpesaModal } from '@/components/features/note-spesa/ConfermaNotaSpesaModal';
import { DateRangePicker } from '@/components/ui/date-range-picker';

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
  noteSpese: NotaSpesa[];
  noteSpeseDaApprovare: NotaSpesa[];
  noteSpeseRifiutate: NotaSpesa[];
  onReload?: () => void;
}

export function NoteSpeseTab({
  commessaId,
  commessaNome,
  noteSpese: noteSpeseProp,
  noteSpeseDaApprovare: noteSpeseDaApprovareProp,
  noteSpeseRifiutate: noteSpeseRifiutateProp,
  onReload
}: NoteSpeseTabProps) {
  // Data for modals
  const [users, setUsers] = useState<User[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroUtente, setFiltroUtente] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('approvate');

  // DataTable sorting states
  const [sortField, setSortField] = useState<string>('data_nota');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalTipo, setModalTipo] = useState<'approva' | 'rifiuta' | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Multi-selection states
  const [selectedNoteSpese, setSelectedNoteSpese] = useState<Set<string>>(new Set());

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Reload function that calls parent's onReload
  const reloadNoteSpese = () => {
    if (onReload) {
      onReload();
    }
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
      ? [...noteSpeseDaApprovareProp]
      : (activeTab as TabType) === 'rifiutate'
      ? [...noteSpeseRifiutateProp]
      : [...noteSpeseProp];

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

    // Filtro Date Range
    if (dateFrom && dateTo) {
      filtered = filtered.filter(n => n.data_nota >= dateFrom && n.data_nota <= dateTo);
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
  }, [noteSpeseProp, noteSpeseDaApprovareProp, noteSpeseRifiutateProp, activeTab, searchTerm, filtroUtente, dateFrom, dateTo, sortField, sortDirection]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      da_approvare: noteSpeseDaApprovareProp.length,
      approvate: noteSpeseProp.length,
      rifiutate: noteSpeseRifiutateProp.length,
    };
  }, [noteSpeseProp, noteSpeseDaApprovareProp, noteSpeseRifiutateProp]);

  // Paginazione
  const totalPages = Math.ceil(noteSpeseFiltrate.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const noteSpesePaginate = noteSpeseFiltrate.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroUtente, dateFrom, dateTo, itemsPerPage]);

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
    setIsSheetOpen(true);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };


  const handleNotaSpesaUpdated = () => {
    reloadNoteSpese();
  };

  const handleNotaSpesaDeleted = () => {
    reloadNoteSpese();
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
      reloadNoteSpese();

      // Close modal
      setModalTipo(null);
      setSelectedNotaSpesa(null);
    } catch (error: any) {
      console.error('Error processing nota spesa:', error);
      toast.error(error?.message || 'Errore nell\'elaborazione della nota spesa');
      throw error; // Re-throw to let modal handle it
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs + Search and Filters sulla stessa riga */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Tabs - Inline style */}
        <div className="inline-flex rounded-md border border-border bg-background p-1">
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
            onClick={() => setActiveTab('da_approvare')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeTab as TabType) === 'da_approvare'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            Da approvare
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeTab as TabType) === 'da_approvare'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {tabCounts.da_approvare}
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

        {/* Divider */}
        <div className="hidden lg:block h-8 w-px bg-border"></div>

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

        {/* Date Range Picker */}
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onRangeChange={handleDateRangeChange}
          placeholder="Seleziona Intervallo"
          className="w-full lg:w-auto"
        />
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
      {isSheetOpen && selectedNotaSpesa && (
        <InfoNotaSpesaModal
          notaSpesa={selectedNotaSpesa}
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onUpdate={handleNotaSpesaUpdated}
          onDelete={() => {
            setIsSheetOpen(false);
            setTimeout(() => setShowDeleteModal(true), 200);
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
