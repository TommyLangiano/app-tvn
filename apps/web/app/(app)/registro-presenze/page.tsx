'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileText, Trash2, Plus, User, Clock, Grid3x3, List, X, Download, MoreVertical, Pencil, ClipboardList, ClipboardCheck, ClipboardX, ChevronRight } from 'lucide-react';
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
import type { Rapportino } from '@/types/rapportino';
import { DataTable, DataTableColumn, DataTableBulkAction } from '@/components/ui/data-table';
import { TabsFilter } from '@/components/ui/tabs-filter';
import { MonthNavigator } from '@/components/ui/month-navigator';
import { InfoRapportinoModal } from '@/components/features/registro-presenze/InfoRapportinoModal';
import { DeleteRapportinoModal } from '@/components/features/registro-presenze/DeleteRapportinoModal';
import { NuovoRapportinoModal } from '@/components/features/registro-presenze/NuovoRapportinoModal';
import { EditRapportinoModal } from '@/components/features/registro-presenze/EditRapportinoModal';
import { ExportRapportiniModal } from '@/components/features/registro-presenze/ExportRapportiniModal';
import { getSignedUrl } from '@/lib/utils/storage';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

type User = {
  id: string;
  email: string;
  role: string;
  dipendente_id?: string; // ID del dipendente se non ha account
  user_metadata?: {
    full_name?: string;
  };
};

type Commessa = {
  id: string;
  nome_commessa: string;
};

export default function RapportiniPage() {
  const [loading, setLoading] = useState(true);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [rapportiniDaApprovare, setRapportiniDaApprovare] = useState<Rapportino[]>([]);
  const [rapportiniRifiutati, setRapportiniRifiutati] = useState<Rapportino[]>([]);

  // Data for modal
  const [users, setUsers] = useState<User[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [ragioneSociale, setRagioneSociale] = useState<string>('');
  const [modalitaCalcoloRapportini, setModalitaCalcoloRapportini] = useState<'ore_totali' | 'orari'>('ore_totali');

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCommessa, setFiltroCommessa] = useState<string>('');
  const [filtroUtente, setFiltroUtente] = useState<string>('');

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Tab state
  type TabType = 'tutti' | 'approvate' | 'da_approvare' | 'rifiutate';
  const [activeTab, setActiveTab] = useState<TabType>('tutti');

  // DataTable sorting states
  const [sortField, setSortField] = useState<string>('data_rapportino');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [selectedRapportiniForInfo, setSelectedRapportiniForInfo] = useState<Rapportino[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNuovoModal, setShowNuovoModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [prefilledUserId, setPrefilledUserId] = useState<string>('');
  const [prefilledDate, setPrefilledDate] = useState<string>('');

  // Multi-selection states
  const [selectedRapportini, setSelectedRapportini] = useState<Set<string>>(new Set());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  // Filtri toggle
  const [showFilters, setShowFilters] = useState(false);

  // Navbar actions container
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);

  // Cache tenant ID to avoid repeated queries
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const tenant = await loadInitialData();
        if (tenant) {
          setTenantId(tenant);
          // Load all rapportini in parallel
          await Promise.all([
            loadRapportini(tenant),
            loadRapportiniDaApprovare(tenant),
            loadRapportiniRifiutati(tenant)
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRapportini();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentYear]);

  useEffect(() => {
    const container = document.getElementById('navbar-actions');
    setNavbarActionsContainer(container);
  }, []);

  const loadInitialData = async (): Promise<string | null> => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        tenants (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const userTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;
    if (!userTenant) return null;

    const tenant = userTenant.tenant_id;

    // OPTIMIZATION: Load all initial data in parallel
    const [tenantData, tenantProfile, dipendentiData, commesseData] = await Promise.all([
      supabase.from('tenants').select('modalita_calcolo_rapportini').eq('id', tenant).single(),
      supabase.from('tenant_profiles').select('ragione_sociale').eq('tenant_id', tenant).single(),
      supabase.from('dipendenti').select('id, nome, cognome, email, user_id').eq('tenant_id', tenant).order('cognome'),
      supabase.from('commesse').select('id, nome_commessa').eq('tenant_id', tenant).order('nome_commessa')
    ]);

    if (tenantData.data) {
      setModalitaCalcoloRapportini(tenantData.data.modalita_calcolo_rapportini || 'ore_totali');
    }

    if (tenantProfile.data?.ragione_sociale) {
      setRagioneSociale(tenantProfile.data.ragione_sociale);
    }

    if (dipendentiData.data) {
      const dipendentiUsers: User[] = dipendentiData.data.map(dip => ({
        id: dip.user_id || dip.id,
        email: dip.email || '',
        role: 'dipendente',
        dipendente_id: !dip.user_id ? dip.id : undefined,
        user_metadata: {
          full_name: `${dip.nome} ${dip.cognome}`
        }
      }));
      setUsers(dipendentiUsers);
    }

    if (commesseData.data) {
      setCommesse(commesseData.data);
    }

    return tenant;
  };

  const loadRapportini = useCallback(async (tenant?: string) => {
    try {
      const supabase = createClient();

      // OPTIMIZATION: Use cached tenant ID if available
      let tenantToUse = tenant || tenantId;
      if (!tenantToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userTenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (!userTenants) return;
        tenantToUse = userTenants.tenant_id;
      }

      // Get first and last day of current month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);

      const { data, error } = await supabase
        .from('rapportini')
        .select(`
          *,
          commesse:commessa_id(titolo, slug),
          dipendenti:dipendente_id(id, nome, cognome, email)
        `)
        .eq('tenant_id', tenantToUse)
        .gte('data_rapportino', firstDay.toISOString().split('T')[0])
        .lte('data_rapportino', lastDay.toISOString().split('T')[0])
        .order('data_rapportino', { ascending: false });

      if (error) throw error;

      // Popola user_name e user_email dai dipendenti se mancanti
      const rapportiniWithUserInfo = (data || []).map(r => {
        if (!r.user_name && r.dipendenti) {
          return {
            ...r,
            user_name: `${r.dipendenti.nome} ${r.dipendenti.cognome}`,
            user_email: r.dipendenti.email
          };
        }
        return r;
      });

      setRapportini(rapportiniWithUserInfo);
    } catch {
      toast.error('Errore nel caricamento dei rapportini');
    }
  }, [tenantId, currentMonth, currentYear]);

  const loadRapportiniDaApprovare = useCallback(async (tenant?: string) => {
    try {
      const supabase = createClient();

      // OPTIMIZATION: Use cached tenant ID if available
      let tenantToUse = tenant || tenantId;
      if (!tenantToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userTenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (!userTenants) return;
        tenantToUse = userTenants.tenant_id;
      }

      const { data, error } = await supabase
        .from('rapportini')
        .select(`
          *,
          commesse:commessa_id(titolo, slug),
          dipendenti:dipendente_id(id, nome, cognome, email)
        `)
        .eq('tenant_id', tenantToUse)
        .eq('stato', 'da_approvare')
        .order('data_rapportino', { ascending: false });

      if (error) throw error;

      // Popola user_name e user_email dai dipendenti se mancanti
      const rapportiniWithUserInfo = (data || []).map(r => {
        if (!r.user_name && r.dipendenti) {
          return {
            ...r,
            user_name: `${r.dipendenti.nome} ${r.dipendenti.cognome}`,
            user_email: r.dipendenti.email
          };
        }
        return r;
      });

      setRapportiniDaApprovare(rapportiniWithUserInfo);
    } catch {
      toast.error('Errore nel caricamento dei rapportini da approvare');
    }
  }, [tenantId]);

  const loadRapportiniRifiutati = useCallback(async (tenant?: string) => {
    try {
      const supabase = createClient();

      // OPTIMIZATION: Use cached tenant ID if available
      let tenantToUse = tenant || tenantId;
      if (!tenantToUse) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userTenants } = await supabase
          .from('user_tenants')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();

        if (!userTenants) return;
        tenantToUse = userTenants.tenant_id;
      }

      const { data, error } = await supabase
        .from('rapportini')
        .select(`
          *,
          commesse:commessa_id(titolo, slug),
          dipendenti:dipendente_id(id, nome, cognome, email)
        `)
        .eq('tenant_id', tenantToUse)
        .eq('stato', 'rifiutato')
        .order('data_rapportino', { ascending: false });

      if (error) throw error;

      // Popola user_name e user_email dai dipendenti se mancanti
      const rapportiniWithUserInfo = (data || []).map(r => {
        if (!r.user_name && r.dipendenti) {
          return {
            ...r,
            user_name: `${r.dipendenti.nome} ${r.dipendenti.cognome}`,
            user_email: r.dipendenti.email
          };
        }
        return r;
      });

      setRapportiniRifiutati(rapportiniWithUserInfo);
    } catch {
      toast.error('Errore nel caricamento dei rapportini rifiutati');
    }
  }, [tenantId]);

  const handleMonthChange = useCallback((month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  }, []);

  // OPTIMIZATION: Memoize getUserDisplayName
  const getUserDisplayName = useCallback((rapportino: Rapportino) => {
    return rapportino.user_name || rapportino.user_email?.split('@')[0] || 'Utente';
  }, []);

  // OPTIMIZATION: Memoize column definitions to prevent DataTable re-renders
  const columns: DataTableColumn<Rapportino>[] = useMemo(() => [
    {
      key: 'user_name',
      label: 'Operaio',
      sortable: true,
      render: (rapportino) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
            {getUserDisplayName(rapportino).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <span className="text-base font-medium text-foreground">{getUserDisplayName(rapportino)}</span>
        </div>
      ),
    },
    {
      key: 'data_rapportino',
      label: 'Data',
      sortable: true,
      width: 'w-48',
      render: (rapportino) => (
        <span className="text-sm text-foreground">
          {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </span>
      ),
    },
    {
      key: 'commessa',
      label: 'Commessa',
      sortable: false,
      render: (rapportino) => (
        <span className="text-sm text-foreground">{rapportino.commesse?.titolo}</span>
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
  ], [getUserDisplayName]);

  // OPTIMIZATION: Memoize event handlers
  const handleRowClick = useCallback((rapportino: Rapportino) => {
    setSelectedRapportino(rapportino);
    setIsSheetOpen(true);
  }, []);

  const handleSort = useCallback((field: string) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDirection(dir => dir === 'asc' ? 'desc' : 'asc');
        return prev;
      } else {
        setSortDirection('asc');
        return field;
      }
    });
  }, []);

  // Filtri e ordinamento
  const rapportiniFiltrati = useMemo(() => {
    // Select base data based on active tab
    let filtered = activeTab === 'da_approvare'
      ? [...rapportiniDaApprovare]
      : activeTab === 'rifiutate'
      ? [...rapportiniRifiutati]
      : [...rapportini.filter(r => !r.stato || r.stato === 'approvato')];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        getUserDisplayName(r).toLowerCase().includes(searchLower) ||
        r.commesse?.titolo.toLowerCase().includes(searchLower) ||
        r.note?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro Commessa
    if (filtroCommessa && filtroCommessa !== 'all') {
      filtered = filtered.filter(r => r.commessa_id === filtroCommessa);
    }

    // Filtro Utente
    if (filtroUtente && filtroUtente !== 'all') {
      filtered = filtered.filter(r => r.user_id === filtroUtente);
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
  }, [rapportini, rapportiniDaApprovare, rapportiniRifiutati, activeTab, searchTerm, filtroCommessa, filtroUtente, sortField, sortDirection, getUserDisplayName]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      approvate: rapportini.filter(r => !r.stato || r.stato === 'approvato').length,
      da_approvare: rapportiniDaApprovare.length, // Conta tutti i rapportini da approvare (non filtrati per mese)
      rifiutate: rapportiniRifiutati.length, // Conta tutti i rapportini rifiutati (non filtrati per mese)
    };
  }, [rapportini, rapportiniDaApprovare, rapportiniRifiutati]);

  // Paginazione
  const totalPages = Math.ceil(rapportiniFiltrati.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const rapportiniPaginati = rapportiniFiltrati.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroCommessa, filtroUtente, itemsPerPage]);

  // OPTIMIZATION: Memoize active filters count
  const activeFiltersCount = useMemo(() => [
    filtroCommessa && filtroCommessa !== 'all' ? filtroCommessa : null,
    filtroUtente && filtroUtente !== 'all' ? filtroUtente : null
  ].filter(Boolean).length, [filtroCommessa, filtroUtente]);

  // OPTIMIZATION: Memoize clearAllFilters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFiltroCommessa('');
    setFiltroUtente('');
  }, []);

  // OPTIMIZATION: Memoize totale ore calculation
  const totaleOre = useMemo(() =>
    rapportiniFiltrati.reduce((sum, r) => sum + r.ore_lavorate, 0),
    [rapportiniFiltrati]
  );

  const handleAllegatoClick = async (path: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    if (!path) return;

    try {
      const signedUrl = await getSignedUrl(path);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast.error('Impossibile aprire l&apos;allegato');
      }
    } catch {
      toast.error('Errore nell&apos;apertura dell&apos;allegato');
    }
  };

  // OPTIMIZATION: Memoize bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    if (selectedRapportini.size === 0) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('rapportini')
        .delete()
        .in('id', Array.from(selectedRapportini));

      if (error) throw error;

      toast.success(`${selectedRapportini.size} rapportini eliminati`);
      setSelectedRapportini(new Set());

      // OPTIMIZATION: Reload all rapportini in parallel
      if (tenantId) {
        await Promise.all([
          loadRapportini(tenantId),
          loadRapportiniDaApprovare(tenantId),
          loadRapportiniRifiutati(tenantId)
        ]);
      }
    } catch {
      toast.error('Errore nell&apos;eliminazione');
    }
  }, [selectedRapportini, tenantId, loadRapportini, loadRapportiniDaApprovare, loadRapportiniRifiutati]);

  const handleExport = async (format: 'excel' | 'pdf' | 'csv', selectedUserIds: string[], layout: 'list' | 'grid', periodo: { month: number; year: number } | { dataInizio: string; dataFine: string }) => {
    // Load rapportini for selected period
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

    // Calculate date range based on period type
    let startDateStr: string;
    let endDateStr: string;
    let month: number;
    let year: number;
    let periodoTitolo: string = '';

    if ('month' in periodo) {
      // Mese specifico
      month = periodo.month;
      year = periodo.year;
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = endDate.toISOString().split('T')[0];
      periodoTitolo = `${MESI[month]} ${year}`;
    } else {
      // Range di date
      startDateStr = periodo.dataInizio;
      endDateStr = periodo.dataFine;
      // Per i report che necessitano mese/anno, usa il primo giorno del range
      const startDate = new Date(periodo.dataInizio);
      month = startDate.getMonth();
      year = startDate.getFullYear();

      // Formatta le date per il titolo
      const dataInizioFormatted = new Date(periodo.dataInizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
      const dataFineFormatted = new Date(periodo.dataFine).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
      periodoTitolo = `dal ${dataInizioFormatted} al ${dataFineFormatted}`;
    }

    // Load rapportini for selected month
    const { data: rapportiniData } = await supabase
      .from('rapportini')
      .select(`
        *,
        commesse (
          titolo,
          slug
        ),
        dipendenti:dipendente_id(id, nome, cognome, email)
      `)
      .eq('tenant_id', userTenant.tenant_id)
      .gte('data_rapportino', startDateStr)
      .lte('data_rapportino', endDateStr)
      .order('data_rapportino', { ascending: false });

    // Popola user_name e user_email dai dipendenti se mancanti
    const rapportiniForExport = (rapportiniData || []).map(r => {
      if (!r.user_name && r.dipendenti) {
        return {
          ...r,
          user_name: `${r.dipendenti.nome} ${r.dipendenti.cognome}`,
          user_email: r.dipendenti.email
        };
      }
      return r;
    });

    if (format === 'csv') {
      handleExportCSV(selectedUserIds, month, year, rapportiniForExport);
    } else if (format === 'excel') {
      handleExportExcel(selectedUserIds, layout, month, year, rapportiniForExport);
    } else if (format === 'pdf') {
      handleExportPDF(selectedUserIds, layout, month, year, rapportiniForExport);
    }
  };

  const handleExportCSV = (selectedUserIds: string[], month: number, year: number, rapportiniData: any[]) => {
    // Generate CSV data
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const headers = ['Dipendente'];

    // Add day headers
    for (let i = 1; i <= daysInMonth; i++) {
      headers.push(`${i}`);
    }
    headers.push('Totale');

    const filteredUsers = users.filter(u => selectedUserIds.includes(u.id));
    const rows = filteredUsers.map(user => {
      const userRapportini = rapportiniData.filter(r =>
        r.user_id === user.id || r.dipendente_id === user.dipendente_id
      );
      const row = [user.user_metadata?.full_name || user.email];

      // Add hours for each day
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const rapportiniDelGiorno = userRapportini.filter(r => r.data_rapportino === dateStr);
        const totaleGiorno = rapportiniDelGiorno.reduce((sum, r) => sum + r.ore_lavorate, 0);
        row.push(totaleGiorno > 0 ? totaleGiorno.toFixed(1) : '');
      }

      // Add monthly total
      const totaleMensile = userRapportini.reduce((sum, r) => sum + r.ore_lavorate, 0);
      row.push(totaleMensile.toFixed(1));

      return row;
    });

    // Add totals row
    const totalsRow = ['Totale Giornaliero'];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const totaleGiorno = rapportiniData
        .filter(r => r.data_rapportino === dateStr && selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
        .reduce((sum, r) => sum + r.ore_lavorate, 0);
      totalsRow.push(totaleGiorno > 0 ? totaleGiorno.toFixed(1) : '');
    }
    const granTotal = rapportiniData
      .filter(r => selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
      .reduce((sum, r) => sum + r.ore_lavorate, 0);
    totalsRow.push(granTotal.toFixed(1));
    rows.push(totalsRow);

    // Convert to CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapportini_${MESI[currentMonth]}_${currentYear}.csv`;
    link.click();

    toast.success('Export CSV completato');
  };

  const handleExportExcel = async (selectedUserIds: string[], layout: 'list' | 'grid' = 'grid', month: number, year: number, rapportiniData: any[]) => {
    try {
      // Dynamically import ExcelJS
      const ExcelJS = await import('exceljs');
      const Workbook = ExcelJS.default.Workbook;

      const workbook = new Workbook();
      const periodoTitolo = `${MESI[month]} ${year}`;

      if (layout === 'list') {
        // EXPORT LISTA - Tutti i dettagli dei rapportini
        const worksheet = workbook.addWorksheet('Rapportini Dettaglio');

        // Title row
        worksheet.mergeCells(1, 1, 1, 9);
        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = `${ragioneSociale} - Rapportini ${periodoTitolo}`;
        titleCell.font = { bold: true, size: 16 };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 30;

        // Header row
        const headerRow = worksheet.getRow(3);
        const headers = ['Data', 'Dipendente', 'Commessa', 'Ore Lavorate', 'Pausa (min)', 'Orario Inizio', 'Orario Fine', 'Note', 'Allegato'];
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1);
          cell.value = header;
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        headerRow.height = 30;

        // Filter and sort rapportini
        const filteredRapportini = rapportiniData
          .filter(r => selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
          .sort((a, b) => new Date(a.data_rapportino).getTime() - new Date(b.data_rapportino).getTime());

        // Data rows
        let currentRow = 4;
        filteredRapportini.forEach((rapportino, index) => {
          const row = worksheet.getRow(currentRow);
          const user = users.find(u => u.id === rapportino.user_id);

          // Data
          const dataCell = row.getCell(1);
          dataCell.value = new Date(rapportino.data_rapportino).toLocaleDateString('it-IT');
          dataCell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Dipendente
          const userCell = row.getCell(2);
          userCell.value = user?.user_metadata?.full_name || user?.email || '';
          userCell.alignment = { horizontal: 'left', vertical: 'middle' };

          // Commessa
          const commessaCell = row.getCell(3);
          commessaCell.value = rapportino.commesse?.titolo || '';
          commessaCell.alignment = { horizontal: 'left', vertical: 'middle' };

          // Ore Lavorate
          const oreCell = row.getCell(4);
          oreCell.value = `${rapportino.ore_lavorate}h`;
          oreCell.alignment = { horizontal: 'center', vertical: 'middle' };
          oreCell.font = { bold: true, color: { argb: 'FF059669' } };
          oreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

          // Pausa
          const pausaCell = row.getCell(5);
          pausaCell.value = rapportino.tempo_pausa ? `${rapportino.tempo_pausa} min` : '-';
          pausaCell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Orario Inizio
          const inizioCell = row.getCell(6);
          inizioCell.value = rapportino.orario_inizio || '-';
          inizioCell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Orario Fine
          const fineCell = row.getCell(7);
          fineCell.value = rapportino.orario_fine || '-';
          fineCell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Note
          const noteCell = row.getCell(8);
          noteCell.value = rapportino.note || '-';
          noteCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

          // Allegato
          const allegatoCell = row.getCell(9);
          allegatoCell.value = rapportino.allegato_url ? 'Sì' : 'No';
          allegatoCell.alignment = { horizontal: 'center', vertical: 'middle' };

          // Apply borders to all cells
          for (let i = 1; i <= 9; i++) {
            const cell = row.getCell(i);
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
          }

          // Alternate row colors
          if (index % 2 === 0) {
            for (let i = 1; i <= 9; i++) {
              if (i !== 4) { // Skip ore lavorate cell
                const cell = row.getCell(i);
                if (!cell.fill || !(cell.fill as any).fgColor) {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
                }
              }
            }
          }

          row.height = 25;
          currentRow++;
        });

        // Set column widths
        worksheet.getColumn(1).width = 12; // Data
        worksheet.getColumn(2).width = 25; // Dipendente
        worksheet.getColumn(3).width = 30; // Commessa
        worksheet.getColumn(4).width = 14; // Ore
        worksheet.getColumn(5).width = 12; // Pausa
        worksheet.getColumn(6).width = 14; // Orario Inizio
        worksheet.getColumn(7).width = 14; // Orario Fine
        worksheet.getColumn(8).width = 40; // Note
        worksheet.getColumn(9).width = 10; // Allegato

        // Generate file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${ragioneSociale}_rapportini_lista_${MESI[month]}_${year}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success('Export Excel completato');
        return;
      }

      // EXPORT GRIGLIA - Layout timesheet
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const filteredUsers = users.filter(u => selectedUserIds.includes(u.id));
      const dayNames = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

      // Create workbook and worksheet
      const worksheet = workbook.addWorksheet(MESI[month]);

      // Title row (merged)
      worksheet.mergeCells(1, 1, 1, daysInMonth + 2);
      const titleCell = worksheet.getCell(1, 1);
      titleCell.value = `${ragioneSociale} - Rapportini ${periodoTitolo}`;
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      // Header row (row 3)
      const headerRow = worksheet.getRow(3);
      headerRow.getCell(1).value = 'Dipendente';

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const dayName = dayNames[date.getDay()];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        const cell = headerRow.getCell(i + 1);
        cell.value = `${dayName}\n${i}`;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.font = { bold: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };

        if (isWeekend) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
          cell.font = { bold: true, color: { argb: 'FF6B7280' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
      }

      const totalHeaderCell = headerRow.getCell(daysInMonth + 2);
      totalHeaderCell.value = 'Totale';
      totalHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
      totalHeaderCell.font = { bold: true };
      totalHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      totalHeaderCell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };

      headerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      headerRow.getCell(1).font = { bold: true };
      headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      headerRow.getCell(1).border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
      headerRow.height = 40;

      // Data rows
      let currentRow = 4;
      filteredUsers.forEach(user => {
        const userRapportini = rapportiniFiltrati.filter(r =>
          r.user_id === user.id || r.dipendente_id === user.dipendente_id
        );
        const row = worksheet.getRow(currentRow);

        // Dipendente name
        const nameCell = row.getCell(1);
        nameCell.value = user.user_metadata?.full_name || user.email;
        nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
        nameCell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };

        // Day cells
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const rapportiniDelGiorno = userRapportini.filter(r => r.data_rapportino === dateStr);
          const date = new Date(currentYear, currentMonth, i);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          const cell = row.getCell(i + 1);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };

          if (rapportiniDelGiorno.length === 0) {
            cell.value = '-';
            if (isWeekend) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
          } else if (rapportiniDelGiorno.length === 1) {
            cell.value = `${rapportiniDelGiorno[0].ore_lavorate}h`;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
            cell.font = { bold: true, color: { argb: 'FF059669' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF6EE7B7' } },
              bottom: { style: 'thin', color: { argb: 'FF6EE7B7' } },
              left: { style: 'thin', color: { argb: 'FF6EE7B7' } },
              right: { style: 'thin', color: { argb: 'FF6EE7B7' } }
            };
          } else {
            const totaleGiorno = rapportiniDelGiorno.reduce((sum, r) => sum + r.ore_lavorate, 0);
            cell.value = `${totaleGiorno}h\n(${rapportiniDelGiorno.length})`;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
            cell.font = { bold: true, color: { argb: 'FF2563EB' } };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF93C5FD' } },
              bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
              left: { style: 'thin', color: { argb: 'FF93C5FD' } },
              right: { style: 'thin', color: { argb: 'FF93C5FD' } }
            };
          }
        }

        // Total cell
        const totaleMensile = userRapportini.reduce((sum, r) => sum + r.ore_lavorate, 0);
        const totalCell = row.getCell(daysInMonth + 2);
        totalCell.value = `${totaleMensile.toFixed(1)}h`;
        totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalCell.font = { bold: true, color: { argb: 'FF3B82F6' } };
        totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        totalCell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };

        row.height = 25;
        currentRow++;
      });

      // Totals row
      const totalsRow = worksheet.getRow(currentRow);
      const totalsNameCell = totalsRow.getCell(1);
      totalsNameCell.value = 'Totale Giornaliero';
      totalsNameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      totalsNameCell.font = { bold: true, color: { argb: 'FF3B82F6' } };
      totalsNameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      totalsNameCell.border = {
        top: { style: 'medium', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };

      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const totaleGiorno = rapportiniFiltrati
          .filter(r => r.data_rapportino === dateStr && selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
          .reduce((sum, r) => sum + r.ore_lavorate, 0);
        const date = new Date(currentYear, currentMonth, i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        const cell = totalsRow.getCell(i + 1);
        cell.value = totaleGiorno > 0 ? `${totaleGiorno.toFixed(1)}h` : '-';
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true, color: { argb: 'FF3B82F6' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };

        if (isWeekend) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
        }
      }

      const granTotal = rapportiniFiltrati
        .filter(r => selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
        .reduce((sum, r) => sum + r.ore_lavorate, 0);
      const granTotalCell = totalsRow.getCell(daysInMonth + 2);
      granTotalCell.value = `${granTotal.toFixed(1)}h`;
      granTotalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      granTotalCell.font = { bold: true, size: 12, color: { argb: 'FF3B82F6' } };
      granTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      granTotalCell.border = {
        top: { style: 'medium', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };

      totalsRow.height = 30;

      // Set column widths
      worksheet.getColumn(1).width = 30; // Dipendente
      for (let i = 2; i <= daysInMonth + 1; i++) {
        worksheet.getColumn(i).width = 10; // Day columns
      }
      worksheet.getColumn(daysInMonth + 2).width = 12; // Total column

      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${ragioneSociale}_rapportini_${MESI[currentMonth]}_${currentYear}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('Export Excel completato');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'export Excel');
    }
  };

  const handleExportPDF = async (selectedUserIds: string[], layout: 'list' | 'grid' = 'grid', month: number, year: number, rapportiniData: any[]) => {
    try {
      // Dynamically import jsPDF and autoTable
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const periodoTitolo = `${MESI[month]} ${year}`;

      if (layout === 'list') {
        // EXPORT LISTA - Tutti i dettagli dei rapportini
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(`${ragioneSociale} - Rapportini ${periodoTitolo}`, 148, 15, { align: 'center' });

        // Filter and sort rapportini
        const filteredRapportini = rapportiniData
          .filter(r => selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
          .sort((a, b) => new Date(a.data_rapportino).getTime() - new Date(b.data_rapportino).getTime());

        // Prepare table data
        const headers = ['Data', 'Dipendente', 'Commessa', 'Ore', 'Pausa', 'Inizio', 'Fine', 'Note', 'All.'];
        const rows = filteredRapportini.map(rapportino => {
          const user = users.find(u => u.id === rapportino.user_id);
          return [
            new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
            user?.user_metadata?.full_name || user?.email || '',
            rapportino.commesse?.titolo || '',
            `${rapportino.ore_lavorate}h`,
            rapportino.tempo_pausa ? `${rapportino.tempo_pausa}'` : '-',
            rapportino.orario_inizio || '-',
            rapportino.orario_fine || '-',
            rapportino.note || '-',
            rapportino.allegato_url ? 'Sì' : 'No'
          ];
        });

        // Generate table
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 25,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle',
            lineColor: [229, 231, 235],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
            lineColor: [229, 231, 235],
            lineWidth: 0.5,
            halign: 'center'
          },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' }, // Data
            1: { cellWidth: 35, halign: 'left' },   // Dipendente
            2: { cellWidth: 45, halign: 'left' },   // Commessa
            3: { cellWidth: 15, halign: 'center' }, // Ore
            4: { cellWidth: 15, halign: 'center' }, // Pausa
            5: { cellWidth: 18, halign: 'center' }, // Inizio
            6: { cellWidth: 18, halign: 'center' }, // Fine
            7: { cellWidth: 60, halign: 'left' },   // Note
            8: { cellWidth: 12, halign: 'center' }  // Allegato
          },
          alternateRowStyles: {
            fillColor: [249, 250, 251]
          },
          didParseCell: function(data: any) {
            // Highlight ore lavorate column
            if (data.section === 'body' && data.column.index === 3) {
              data.cell.styles.fillColor = [209, 250, 229];
              data.cell.styles.textColor = [5, 150, 105];
              data.cell.styles.fontStyle = 'bold';
            }
          },
        });

        // Save PDF
        doc.save(`${ragioneSociale}_rapportini_lista_${MESI[currentMonth]}_${currentYear}.pdf`);

        toast.success('Export PDF completato');
        return;
      }

      // EXPORT GRIGLIA - Layout timesheet
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const filteredUsers = users.filter(u => selectedUserIds.includes(u.id));
      const today = new Date();

      // Create PDF in landscape
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`${ragioneSociale} - Rapportini ${periodoTitolo}`, 148, 15, { align: 'center' });

      // Prepare headers
      const dayNames = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
      const headers = ['Dipendente'];

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const dayName = dayNames[date.getDay()];
        headers.push(`${dayName}\n${i}`);
      }
      headers.push('Totale');

      // Prepare data rows with metadata
      const rows: any[][] = [];
      const cellMetadata: any[] = [];

      filteredUsers.forEach(user => {
        const userRapportini = rapportiniFiltrati.filter(r =>
          r.user_id === user.id || r.dipendente_id === user.dipendente_id
        );
        const row = [user.user_metadata?.full_name || user.email];
        const rowMeta: any[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          const rapportiniDelGiorno = userRapportini.filter(r => r.data_rapportino === dateStr);

          if (rapportiniDelGiorno.length === 0) {
            row.push('-');
            rowMeta.push({ hasData: false, isMultiple: false });
          } else if (rapportiniDelGiorno.length === 1) {
            row.push(`${rapportiniDelGiorno[0].ore_lavorate}h`);
            rowMeta.push({ hasData: true, isMultiple: false });
          } else {
            const totaleGiorno = rapportiniDelGiorno.reduce((sum, r) => sum + r.ore_lavorate, 0);
            row.push(`${totaleGiorno}h\n(${rapportiniDelGiorno.length})`);
            rowMeta.push({ hasData: true, isMultiple: true });
          }
        }

        const totaleMensile = userRapportini.reduce((sum, r) => sum + r.ore_lavorate, 0);
        row.push(totaleMensile.toFixed(1) + 'h');
        rows.push(row);
        cellMetadata.push(rowMeta);
      });

      // Add totals row
      const totalsRow = ['Totale Giornaliero'];
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const totaleGiorno = rapportiniFiltrati
          .filter(r => r.data_rapportino === dateStr && selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
          .reduce((sum, r) => sum + r.ore_lavorate, 0);
        totalsRow.push(totaleGiorno > 0 ? totaleGiorno.toFixed(1) + 'h' : '-');
      }

      const granTotal = rapportiniFiltrati
        .filter(r => selectedUserIds.includes(r.user_id || r.dipendente_id || ''))
        .reduce((sum, r) => sum + r.ore_lavorate, 0);
      totalsRow.push(granTotal.toFixed(1) + 'h');
      rows.push(totalsRow);

      // Generate table with exact website styling
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 25,
        theme: 'grid',
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          halign: 'center',
          valign: 'middle',
          lineColor: [229, 231, 235],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 7,
          lineColor: [229, 231, 235],
          lineWidth: 0.5
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' }
        },
        didParseCell: function(data: any) {
          const colIndex = data.column.index;
          const rowIndex = data.row.index;

          // Header styling
          if (data.section === 'head' && colIndex > 0 && colIndex <= daysInMonth) {
            const dayIndex = colIndex;
            const date = new Date(currentYear, currentMonth, dayIndex);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            if (isWeekend) {
              data.cell.styles.fillColor = [243, 244, 246];
              data.cell.styles.textColor = [107, 114, 128];
            }
          }

          // Totals row styling
          if (data.section === 'body' && rowIndex === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [59, 130, 246];
            data.cell.styles.lineWidth = 0.5;
          }

          // Total column styling
          if (colIndex === headers.length - 1 && data.section === 'body' && rowIndex < rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.textColor = [59, 130, 246];
          }

          // Gran total cell
          if (colIndex === headers.length - 1 && data.section === 'body' && rowIndex === rows.length - 1) {
            data.cell.styles.fontSize = 9;
            data.cell.styles.textColor = [59, 130, 246];
          }

          // Data cells styling
          if (data.section === 'body' && colIndex > 0 && colIndex <= daysInMonth && rowIndex < rows.length - 1) {
            const dayIndex = colIndex;
            const date = new Date(currentYear, currentMonth, dayIndex);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            const meta = cellMetadata[rowIndex]?.[colIndex - 1];

            // Weekend background (only if cell is empty)
            if (isWeekend && !meta?.hasData) {
              data.cell.styles.fillColor = [249, 250, 251];
            }

            // Cell with data styling
            if (meta?.hasData) {
              if (meta.isMultiple) {
                data.cell.styles.fillColor = [219, 234, 254];
                data.cell.styles.textColor = [37, 99, 235];
                data.cell.styles.lineColor = [147, 197, 253];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.fillColor = [209, 250, 229];
                data.cell.styles.textColor = [5, 150, 105];
                data.cell.styles.lineColor = [110, 231, 183];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }

          // Totals row cells (daily totals)
          if (data.section === 'body' && rowIndex === rows.length - 1 && colIndex > 0 && colIndex <= daysInMonth) {
            const dayIndex = colIndex;
            const date = new Date(currentYear, currentMonth, dayIndex);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            if (isWeekend) {
              data.cell.styles.fillColor = [243, 244, 246];
            }
          }
        },
      });

      // Save PDF
      doc.save(`${ragioneSociale}_rapportini_${MESI[currentMonth]}_${currentYear}.pdf`);

      toast.success('Export PDF completato');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Errore durante l\'export PDF');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Stampa avviata');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Caricamento rapportini...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portal: Bottone nella Navbar */}
      {navbarActionsContainer && createPortal(
        <Button
          onClick={() => setShowNuovoModal(true)}
          className="gap-2 h-10 rounded-sm"
        >
          <Plus className="h-4 w-4" />
          Nuovo Rapportino
        </Button>,
        navbarActionsContainer
      )}

      {/* Tabs */}
      <TabsFilter<TabType>
        tabs={[
          {
            value: 'tutti',
            label: 'Tutti',
            icon: ClipboardList,
            count: tabCounts.approvate + tabCounts.da_approvare + tabCounts.rifiutate,
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'approvate',
            label: 'Approvati',
            icon: ClipboardCheck,
            count: tabCounts.approvate,
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'da_approvare',
            label: 'Da approvare',
            icon: ClipboardList,
            count: tabCounts.da_approvare,
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'rifiutate',
            label: 'Rifiutati',
            icon: ClipboardX,
            count: tabCounts.rifiutate,
            badgeClassName: 'bg-primary/10 text-primary',
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />


      {/* Search Bar and Filters */}
      {(activeTab === 'tutti' || activeTab === 'approvate' || activeTab === 'da_approvare' || activeTab === 'rifiutate') && (
      <div className="space-y-0">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Bar - stile Fatture */}
          <div className="relative w-full lg:w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
            <Input
              placeholder="Cerca per dipendente, commessa, note"
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
                <SelectItem key={user.id} value={user.id}>
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
      )}

      {/* Month Navigator + Export + View Toggle - Only for 'tutti' and 'approvate' tabs */}
      {(activeTab === 'tutti' || activeTab === 'approvate') && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1" />

          <MonthNavigator
            currentMonth={currentMonth}
            currentYear={currentYear}
            onMonthChange={handleMonthChange}
          />

          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* Export Button */}
            <Button
              onClick={() => setShowExportModal(true)}
              variant="outline"
              className="gap-2 h-10 rounded-sm border-2"
            >
              <Download className="h-4 w-4" />
              Esporta
            </Button>

            {/* View Toggle - Cards or Table */}
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

      {/* List View - For all tabs (with different bulk actions) */}
      {viewMode === 'list' && (
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
          pageSizeOptions={[10, 25, 30, 50, 100]}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedRows={selectedRapportini}
          onSelectionChange={setSelectedRapportini}
          onRowClick={handleRowClick}
          bulkActions={
            activeTab === 'da_approvare'
              ? [
                  {
                    label: 'Approva selezionati',
                    icon: ClipboardCheck,
                    variant: 'default',
                    action: async (selected) => {
                      // TODO: Implementare approvazione
                      console.log('Approva:', selected);
                    },
                  },
                  {
                    label: 'Rifiuta selezionati',
                    icon: ClipboardX,
                    variant: 'destructive',
                    action: async (selected) => {
                      // TODO: Implementare rifiuto
                      console.log('Rifiuta:', selected);
                    },
                  },
                ]
              : activeTab === 'rifiutate'
              ? [
                  {
                    label: 'Approva selezionati',
                    icon: ClipboardCheck,
                    variant: 'default',
                    action: async (selected) => {
                      // TODO: Implementare approvazione (ripristino)
                      console.log('Approva:', selected);
                    },
                  },
                  {
                    label: 'Elimina selezionati',
                    icon: Trash2,
                    variant: 'destructive',
                    action: handleBulkDelete,
                  },
                ]
              : [
                  {
                    label: 'Elimina selezionati',
                    icon: Trash2,
                    variant: 'destructive',
                    action: handleBulkDelete,
                  },
                ]
          }
          bulkActionsPosition="top"
        />
      )}

      {/* Grid View - Timesheet Style - Only for 'tutti' and 'approvate' tabs */}
      {viewMode === 'grid' && (activeTab === 'tutti' || activeTab === 'approvate') && (
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
                  {users.map((user) => {
                    const userRapportini = rapportiniFiltrati.filter(r =>
          r.user_id === user.id || r.dipendente_id === user.dipendente_id
        );
                    const totaleMensile = userRapportini.reduce((sum, r) => sum + r.ore_lavorate, 0);

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

                        {/* Totale Mensile Dipendente */}
                        <td className="p-2 text-center font-bold border-l-2 border-border sticky right-0 bg-card z-10">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-lg text-primary">{totaleMensile.toFixed(1)}h</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Riga Totali Giornalieri */}
                  <tr className="border-t-2 border-border bg-background font-bold">
                    <td className="p-4 text-left border-r-2 border-border sticky left-0 bg-background z-10">
                      Totale Giornaliero
                    </td>

                    {/* Totali per ogni giorno */}
                    {Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const totaleGiorno = rapportiniFiltrati
                        .filter(r => r.data_rapportino === dateStr)
                        .reduce((sum, r) => sum + r.ore_lavorate, 0);

                      const date = new Date(currentYear, currentMonth, day);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const today = new Date();
                      const isToday = date.getDate() === today.getDate() &&
                                     date.getMonth() === today.getMonth() &&
                                     date.getFullYear() === today.getFullYear();

                      return (
                        <td
                          key={day}
                          className={`text-center p-2 relative ${
                            isToday ? 'bg-primary/10' : isWeekend ? 'bg-muted/30 border-r border-border' : 'bg-background border-r border-border'
                          }`}
                        >
                          {/* Bordi laterali per giorno corrente */}
                          {isToday && (
                            <>
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                              <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary z-20" />
                            </>
                          )}
                          <span className={`text-sm ${totaleGiorno > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {totaleGiorno > 0 ? `${totaleGiorno.toFixed(1)}h` : '-'}
                          </span>
                        </td>
                      );
                    })}

                    {/* Gran Totale Mensile */}
                    <td className="p-4 text-center border-l-2 border-border sticky right-0 bg-background z-10">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xl text-primary">{totaleOre.toFixed(1)}h</span>
                        <span className="text-xs text-muted-foreground">Totale Mese</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
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
          onUpdate={() => {
            loadRapportini();
            loadRapportiniDaApprovare();
            loadRapportiniRifiutati();
          }}
          onDelete={() => {
            setIsSheetOpen(false);
            setTimeout(() => setShowDeleteModal(true), 200);
          }}
        />
      )}

      {showEditModal && selectedRapportino && (
        <EditRapportinoModal
          rapportino={selectedRapportino}
          commesse={commesse}
          onClose={() => {
            setShowEditModal(false);
            setSelectedRapportino(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRapportino(null);
            if (tenantId) {
              Promise.all([
                loadRapportini(tenantId),
                loadRapportiniDaApprovare(tenantId),
                loadRapportiniRifiutati(tenantId)
              ]);
            }
          }}
        />
      )}

      {showDeleteModal && selectedRapportino && (
        <DeleteRapportinoModal
          rapportino={selectedRapportino}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRapportino(null);
          }}
          onDelete={() => {
            setShowDeleteModal(false);
            setSelectedRapportino(null);
            if (tenantId) {
              Promise.all([
                loadRapportini(tenantId),
                loadRapportiniDaApprovare(tenantId),
                loadRapportiniRifiutati(tenantId)
              ]);
            }
          }}
        />
      )}

      {showNuovoModal && (
        <NuovoRapportinoModal
          onClose={() => {
            setShowNuovoModal(false);
            setPrefilledUserId('');
            setPrefilledDate('');
          }}
          onSuccess={() => {
            setShowNuovoModal(false);
            setPrefilledUserId('');
            setPrefilledDate('');
            if (tenantId) {
              Promise.all([
                loadRapportini(tenantId),
                loadRapportiniDaApprovare(tenantId),
                loadRapportiniRifiutati(tenantId)
              ]);
            }
          }}
          users={users}
          commesse={commesse}
          prefilledUserId={prefilledUserId}
          prefilledDate={prefilledDate}
          initialModalitaCalcolo={modalitaCalcoloRapportini}
        />
      )}

      {showExportModal && (
        <ExportRapportiniModal
          onClose={() => setShowExportModal(false)}
          users={users}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
