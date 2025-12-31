'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ClipboardCheck, ClipboardList, ClipboardX, Download, Grid3x3, List, X, ChevronRight, User, FileText, CheckCircle, XCircle } from 'lucide-react';
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
import type { Rapportino } from '@/types/rapportino';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { InfoRapportinoModal } from '@/components/features/registro-presenze/InfoRapportinoModal';
import { DeleteRapportinoModal } from '@/components/features/registro-presenze/DeleteRapportinoModal';
import { NuovoRapportinoModal } from '@/components/features/registro-presenze/NuovoRapportinoModal';
import { EditRapportinoModal } from '@/components/features/registro-presenze/EditRapportinoModal';
import { ExportRapportiniModal } from '@/components/features/registro-presenze/ExportRapportiniModal';

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

type TabType = 'approvate' | 'da_approvare' | 'rifiutate';

interface RapportiniTabProps {
  commessaId: string;
  commessaNome: string;
  rapportini: Rapportino[];
  rapportiniDaApprovare: Rapportino[];
  rapportiniRifiutati: Rapportino[];
  onReload?: () => void;
}

export function RapportiniTab({
  commessaId,
  commessaNome,
  rapportini: rapportiniProp,
  rapportiniDaApprovare: rapportiniDaApprovareProp,
  rapportiniRifiutati: rapportiniRifiutatiProp,
  onReload
}: RapportiniTabProps) {

  // Data for modals
  const [users, setUsers] = useState<User[]>([]);
  const [modalitaCalcoloRapportini, setModalitaCalcoloRapportini] = useState<'ore_totali' | 'orari'>('ore_totali');
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
  const [activeRapportiniTab, setActiveRapportiniTab] = useState<TabType>('approvate');

  // DataTable sorting states
  const [sortField, setSortField] = useState<string>('data_rapportino');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNuovoModal, setShowNuovoModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [prefilledUserId, setPrefilledUserId] = useState<string>('');
  const [prefilledDate, setPrefilledDate] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Multi-selection states
  const [selectedRapportini, setSelectedRapportini] = useState<Set<string>>(new Set());
  const [selectedRapportiniForInfo, setSelectedRapportiniForInfo] = useState<Rapportino[]>([]);

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

    // Load modalita calcolo from tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('modalita_calcolo_rapportini')
      .eq('id', userTenant.tenant_id)
      .single();

    if (tenantData) {
      setModalitaCalcoloRapportini(tenantData.modalita_calcolo_rapportini || 'ore_totali');
    }

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
          dipendente_id: dip.id, // SEMPRE il dipendente_id per il match
          user_metadata: {
            full_name: `${dip.nome} ${dip.cognome}`
          }
        }));
        setUsers(dipendentiUsers);
      }
    } else {
      // Se non ci sono membri nel team, mostra array vuoto
      setUsers([]);
    }

    // Set commessa corrente
    setCommesse([{
      id: commessaId,
      nome_commessa: commessaNome
    }]);
  };

  // Reload function that calls parent's onReload
  const reloadRapportini = () => {
    if (onReload) {
      onReload();
    }
  };

  const handleMonthChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const getUserDisplayName = (rapportino: Rapportino) => {
    if (rapportino.dipendenti) {
      return `${rapportino.dipendenti.nome} ${rapportino.dipendenti.cognome}`;
    }
    return rapportino.user_name || rapportino.user_email?.split('@')[0] || 'Utente';
  };

  // Filtri e ordinamento
  const rapportiniFiltrati = useMemo(() => {
    // Seleziona la lista base
    let filtered = (activeRapportiniTab as TabType) === 'da_approvare'
      ? [...rapportiniDaApprovareProp]
      : (activeRapportiniTab as TabType) === 'rifiutate'
      ? [...rapportiniRifiutatiProp]
      : [...rapportiniProp];

    // Filtro per mese (solo per tab approvate)
    if ((activeRapportiniTab as TabType) === 'approvate') {
      const startDate = new Date(currentYear, currentMonth, 1);
      const endDate = new Date(currentYear, currentMonth + 1, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      filtered = filtered.filter(r => {
        return r.data_rapportino >= startDateStr && r.data_rapportino <= endDateStr;
      });
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        getUserDisplayName(r).toLowerCase().includes(searchLower) ||
        r.commesse?.titolo.toLowerCase().includes(searchLower) ||
        r.note?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro Utente
    if (filtroUtente && filtroUtente !== 'all') {
      filtered = filtered.filter(r => r.user_id === filtroUtente || r.dipendente_id === filtroUtente);
    }

    // Ordinamento
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'data_rapportino':
          aVal = new Date(a.data_rapportino).getTime();
          bVal = new Date(b.data_rapportino).getTime();
          break;
        case 'ore_lavorate':
          aVal = a.ore_lavorate;
          bVal = b.ore_lavorate;
          break;
        case 'user_name':
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
  }, [rapportiniProp, rapportiniDaApprovareProp, rapportiniRifiutatiProp, activeRapportiniTab, searchTerm, filtroUtente, sortField, sortDirection, currentMonth, currentYear]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      approvate: rapportiniProp.length,
      da_approvare: rapportiniDaApprovareProp.length,
      rifiutate: rapportiniRifiutatiProp.length,
    };
  }, [rapportiniProp, rapportiniDaApprovareProp, rapportiniRifiutatiProp]);

  // Paginazione
  const totalPages = Math.ceil(rapportiniFiltrati.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const rapportiniPaginati = rapportiniFiltrati.slice(startIndex, endIndex);

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

  // Calcola totale ore
  const totaleOre = rapportiniFiltrati.reduce((sum, r) => sum + r.ore_lavorate, 0);

  // Handlers for inline approval/rejection
  const handleApprova = async (rapportino: Rapportino) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('rapportini')
        .update({ stato: 'approvato' })
        .eq('id', rapportino.id);

      if (error) throw error;

      toast.success('Rapportino approvato');

      // Reload all lists
      reloadRapportini();
    } catch (error) {
      toast.error('Errore nell\'approvazione');
      console.error(error);
    }
  };

  const handleRifiuta = async (rapportino: Rapportino) => {
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('rapportini')
        .update({ stato: 'rifiutato' })
        .eq('id', rapportino.id);

      if (error) throw error;

      toast.success('Rapportino rifiutato');

      // Reload all lists
      reloadRapportini();
    } catch (error) {
      toast.error('Errore nel rifiuto');
      console.error(error);
    }
  };

  // Base columns
  const baseColumns: DataTableColumn<Rapportino>[] = [
    {
      key: 'user_name',
      label: 'Dipendente',
      sortable: true,
      render: (rapportino) => (
        <span className="text-sm text-foreground font-medium">
          {getUserDisplayName(rapportino)}
        </span>
      ),
    },
    {
      key: 'data_rapportino',
      label: 'Data',
      sortable: true,
      render: (rapportino) => (
        <span className="text-sm text-muted-foreground">
          {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      key: 'ore_lavorate',
      label: 'Ore',
      sortable: true,
      width: 'w-24',
      render: (rapportino) => (
        <span className="text-base text-foreground font-bold">
          {rapportino.ore_lavorate}h
        </span>
      ),
    },
  ];

  // Colonna azioni per tab "Da Approvare"
  const azioniColumn: DataTableColumn<Rapportino> = {
    key: 'azioni',
    label: 'Azioni',
    sortable: false,
    width: 'w-32',
    render: (rapportino) => (
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleApprova(rapportino);
          }}
          className="inline-flex items-center justify-center bg-green-50 border-2 border-green-300 hover:bg-green-100 hover:border-green-400 rounded-md p-2.5 transition-all group"
          title="Approva"
        >
          <CheckCircle className="h-5 w-5 text-green-600 group-hover:text-green-700" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRifiuta(rapportino);
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
  const arrowColumn: DataTableColumn<Rapportino> = {
    key: 'arrow',
    label: '',
    sortable: false,
    width: 'w-12',
    render: () => (
      <div className="flex justify-end">
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    ),
  };

  // Costruisci le colonne in base al tab attivo
  const columns: DataTableColumn<Rapportino>[] = useMemo(() => {
    if (activeRapportiniTab === 'da_approvare') {
      return [...baseColumns, azioniColumn, arrowColumn];
    }
    return [...baseColumns, arrowColumn];
  }, [activeRapportiniTab]);

  const handleRowClick = (rapportino: Rapportino) => {
    setSelectedRapportino(rapportino);
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

  const handleRapportinoCreated = () => {
    reloadRapportini();
  };

  const handleRapportinoUpdated = () => {
    reloadRapportini();
  };

  const handleRapportinoDeleted = () => {
    reloadRapportini();
  };

  return (
    <div className="space-y-4">
      {/* Header: Tabs + Search + Filtro su stessa riga */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Tabs - Inline style come Fatture */}
        <div className="inline-flex rounded-md border border-border bg-background p-1">
          <button
            onClick={() => setActiveRapportiniTab('approvate')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeRapportiniTab as TabType) === 'approvate'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" />
            Approvate
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeRapportiniTab as TabType) === 'approvate'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-green-100 text-green-700'
            }`}>
              {tabCounts.approvate}
            </span>
          </button>
          <button
            onClick={() => setActiveRapportiniTab('da_approvare' as TabType)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeRapportiniTab as TabType) === 'da_approvare'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Da Approvare
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeRapportiniTab as TabType) === 'da_approvare'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-green-100 text-green-700'
            }`}>
              {tabCounts.da_approvare}
            </span>
          </button>
          <button
            onClick={() => setActiveRapportiniTab('rifiutate' as TabType)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              (activeRapportiniTab as TabType) === 'rifiutate'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardX className="h-4 w-4" />
            Rifiutate
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              (activeRapportiniTab as TabType) === 'rifiutate'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-green-100 text-green-700'
            }`}>
              {tabCounts.rifiutate}
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="hidden lg:block h-8 w-px bg-border"></div>

        {/* Search Bar - stile Fatture */}
        <div className="relative w-full lg:w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
          <Input
            placeholder="Cerca per dipendente, note"
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

      {/* Month Navigator + Esporta e View Toggle - Sotto i Filtri */}
      {(activeRapportiniTab as TabType) === 'approvate' && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1" />
          <MonthNavigator
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={handleMonthChange}
          />
          <div className="flex items-center gap-3 flex-1 justify-end">
            <Button
              onClick={() => setShowExportModal(true)}
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

      {/* DataTable - Solo se viewMode è 'list' */}
      {viewMode === 'list' && (activeRapportiniTab as TabType) === 'approvate' && (
        <div className="!mt-0">
          <DataTable<Rapportino>
            columns={columns}
            data={rapportiniPaginati}
            totalItems={rapportiniFiltrati.length}
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
            selectedRows={selectedRapportini}
            onSelectionChange={setSelectedRapportini}
          />
        </div>
      )}

      {/* Grid View - Solo se viewMode è 'grid' */}
      {viewMode === 'grid' && (activeRapportiniTab as TabType) === 'approvate' && (
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
          <div
            className="overflow-x-auto"
            ref={(el) => {
              if (el && !loading) {
                // Scroll to current week on mount
                const today = new Date();
                if (today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
                  const currentDay = today.getDate();
                  // Each day column is ~60px + first column ~200px
                  const scrollPosition = (currentDay - 3) * 60; // Center on current day (show 3 days before)
                  el.scrollLeft = Math.max(0, scrollPosition);
                }
              }
            }}
          >
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Caricamento...
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="bg-background border-b-2 border-border sticky top-0 z-10">
                  <tr>
                    {/* Colonna Dipendenti */}
                    <th className="text-left p-4 font-semibold text-sm border-r-2 border-border bg-background sticky left-0 z-20 min-w-[200px]">
                      Dipendente
                    </th>

                    {/* Colonne Giorni del Mese */}
                    {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => {
                      const day = i + 1;
                      const date = new Date(currentYear, currentMonth, day);
                      const dayNames = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
                      const dayName = dayNames[date.getDay()];
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const today = new Date();
                      const isToday = date.getDate() === today.getDate() &&
                                     date.getMonth() === today.getMonth() &&
                                     date.getFullYear() === today.getFullYear();

                      return (
                        <th
                          key={day}
                          className={`text-center p-2 font-semibold text-xs min-w-[60px] relative ${
                            isWeekend ? 'bg-muted/30' : ''
                          } ${isToday ? 'bg-primary/10' : ''} ${!isToday ? 'border-r border-border' : ''}`}
                        >
                          {/* Bordi laterali per giorno corrente */}
                          {isToday && (
                            <>
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                              <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                            </>
                          )}
                          <div className="flex flex-col items-center gap-1">
                            <span className={isWeekend ? 'text-muted-foreground' : isToday ? 'text-primary font-bold' : ''}>{dayName}</span>
                            <span className={`text-base font-bold ${isWeekend ? 'text-muted-foreground' : isToday ? 'text-primary' : ''}`}>
                              {day}
                            </span>
                          </div>
                        </th>
                      );
                    })}

                    {/* Colonna Totale */}
                    <th className="text-center p-4 font-semibold text-sm border-l-2 border-border bg-background sticky right-0 z-20 min-w-[100px]">
                      Totale
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={100} className="text-center py-8 text-muted-foreground">
                        Nessun dipendente nel team di questa commessa
                      </td>
                    </tr>
                  )}
                  {users.map((user) => {
                    const userRapportini = rapportiniFiltrati.filter(r =>
                      r.user_id === user.id || r.dipendente_id === user.dipendente_id
                    );
                    const totaleMensile = userRapportini.reduce((sum, r) => sum + r.ore_lavorate, 0);

                    if (process.env.NODE_ENV === 'development') {
                      console.log('Grid Debug:', {
                        userName: user.user_metadata?.full_name,
                        userId: user.id,
                        dipendenteId: user.dipendente_id,
                        userRapportiniCount: userRapportini.length,
                        totaleMensile,
                        rapportiniFiltrati: rapportiniFiltrati.length
                      });
                    }

                    return (
                      <tr key={user.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                        {/* Nome Dipendente */}
                        <td className="p-2 font-medium border-r-2 border-border sticky left-0 bg-card z-10">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">{user.user_metadata?.full_name || user.email}</span>
                          </div>
                        </td>

                        {/* Celle Giorni */}
                        {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const rapportiniDelGiorno = userRapportini.filter(r => r.data_rapportino === dateStr);
                          const date = new Date(currentYear, currentMonth, day);
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          const today = new Date();
                          const isToday = date.getDate() === today.getDate() &&
                                         date.getMonth() === today.getMonth() &&
                                         date.getFullYear() === today.getFullYear();

                          return (
                            <td
                              key={day}
                              className={`text-center p-1 relative ${
                                isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/20 border-r border-white border-b border-b-white' : 'border-r border-border'
                              }`}
                            >
                              {/* Bordi laterali per giorno corrente */}
                              {isToday && (
                                <>
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                                </>
                              )}

                              {rapportiniDelGiorno.length > 0 ? (
                                rapportiniDelGiorno.length === 1 ? (
                                  // Singolo rapportino
                                  <div className="relative w-full h-12">
                                    <button
                                      onClick={() => {
                                        setSelectedRapportino(rapportiniDelGiorno[0]);
                                        setSelectedRapportiniForInfo(rapportiniDelGiorno);
                                        setIsSheetOpen(true);
                                      }}
                                      className="w-full h-12 rounded-lg bg-emerald-500/10 border-2 border-emerald-500/30 hover:bg-emerald-500/20 transition-colors flex flex-col items-center justify-center gap-0.5"
                                      title={`${rapportiniDelGiorno[0].ore_lavorate}h - ${rapportiniDelGiorno[0].commesse?.titolo || ''}\n${rapportiniDelGiorno[0].note ? `Note: ${rapportiniDelGiorno[0].note}` : ''}`}
                                    >
                                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {rapportiniDelGiorno[0].ore_lavorate}h
                                      </span>
                                      {rapportiniDelGiorno[0].allegato_url && (
                                        <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                      )}
                                    </button>
                                    {/* Pulsante + in alto a destra */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        setPrefilledUserId(user.id);
                                        setPrefilledDate(dateStr);
                                        setShowNuovoModal(true);
                                      }}
                                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md transition-colors z-10"
                                      title="Aggiungi altro rapportino"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  // Multipli rapportini
                                  <div className="relative w-full h-12">
                                    <button
                                      onClick={() => {
                                        setSelectedRapportino(rapportiniDelGiorno[0]);
                                        setSelectedRapportiniForInfo(rapportiniDelGiorno);
                                        setIsSheetOpen(true);
                                      }}
                                      className="w-full h-12 rounded-lg bg-blue-500/10 border-2 border-blue-500/30 hover:bg-blue-500/20 transition-colors flex flex-col items-center justify-center gap-0.5"
                                      title={`${rapportiniDelGiorno.length} rapportini - Totale: ${rapportiniDelGiorno.reduce((sum, r) => sum + r.ore_lavorate, 0)}h`}
                                    >
                                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                        {rapportiniDelGiorno.reduce((sum, r) => sum + r.ore_lavorate, 0)}h
                                      </span>
                                      <span className="text-[10px] text-blue-600 dark:text-blue-400">
                                        ({rapportiniDelGiorno.length})
                                      </span>
                                    </button>
                                    {/* Pulsante + in alto a destra */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        setPrefilledUserId(user.id);
                                        setPrefilledDate(dateStr);
                                        setShowNuovoModal(true);
                                      }}
                                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition-colors z-10"
                                      title="Aggiungi altro rapportino"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                )
                              ) : (
                                // Cella vuota - click per creare
                                <button
                                  onClick={() => {
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    setPrefilledUserId(user.id);
                                    setPrefilledDate(dateStr);
                                    setShowNuovoModal(true);
                                  }}
                                  className="group w-full h-12 rounded-lg border-2 border-dashed border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-colors flex items-center justify-center"
                                  title={`Aggiungi rapportino per ${user.user_metadata?.full_name || user.email} - ${day}/${currentMonth + 1}/${currentYear}`}
                                >
                                  <Plus className="h-5 w-5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              )}
                            </td>
                          );
                        })}

                        {/* Totale Mensile */}
                        <td className="text-center p-2 font-bold text-lg border-l-2 border-border sticky right-0 bg-card z-10">
                          {totaleMensile > 0 ? `${totaleMensile.toFixed(1)}h` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* DataTable per tab non-approvate */}
      {activeRapportiniTab !== 'approvate' && (
        <div className="!mt-0">
          <DataTable<Rapportino>
            columns={columns}
            data={rapportiniPaginati}
            totalItems={rapportiniFiltrati.length}
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
            selectedRows={selectedRapportini}
            onSelectionChange={setSelectedRapportini}
          />
        </div>
      )}

      {/* Modals */}
      {isSheetOpen && selectedRapportino && (
        <InfoRapportinoModal
          rapportino={selectedRapportino}
          users={users}
          commesse={commesse}
          isOpen={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          onUpdate={handleRapportinoUpdated}
          onDelete={() => {
            setIsSheetOpen(false);
            setTimeout(() => setShowDeleteModal(true), 200);
          }}
        />
      )}

      {showEditModal && selectedRapportino && (
        <EditRapportinoModal
          rapportino={selectedRapportino}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRapportino(null);
          }}
          onSuccess={handleRapportinoUpdated}
          commesse={commesse}
        />
      )}

      {showDeleteModal && selectedRapportino && (
        <DeleteRapportinoModal
          rapportino={selectedRapportino}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRapportino(null);
          }}
          onDelete={handleRapportinoDeleted}
        />
      )}

      {showNuovoModal && (
        <NuovoRapportinoModal
          onClose={() => setShowNuovoModal(false)}
          onSuccess={handleRapportinoCreated}
          users={users}
          commesse={commesse}
          prefilledUserId={prefilledUserId}
          prefilledDate={prefilledDate}
          prefilledCommessaId={commessaId}
          initialModalitaCalcolo={modalitaCalcoloRapportini}
        />
      )}

      {showExportModal && (
        <ExportRapportiniModal
          onClose={() => setShowExportModal(false)}
          users={users}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onExport={async (format, selectedUserIds, layout, periodo) => {
            toast.success(`Export ${format} in sviluppo per commessa specifica`);
          }}
        />
      )}
    </div>
  );
}
