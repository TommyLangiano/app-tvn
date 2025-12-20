'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Plus, Filter, Grid3x3, List, Play, Clock, CheckCircle, Briefcase, ChevronRight, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommessaCard } from '@/components/features/commesse/CommessaCard';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Commessa } from '@/types/commessa';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TabsFilter, TabItem } from '@/components/ui/tabs-filter';
import { toast } from 'sonner';

type TabType = 'all' | 'in-corso' | 'da-iniziare' | 'completate';

export default function CommessePage() {
  const router = useRouter();
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [marginiLordi, setMarginiLordi] = useState<Record<string, number>>({});
  const [showMargini, setShowMargini] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tipologiaClienteFilter, setTipologiaClienteFilter] = useState<string>('all');
  const [tipologiaCommessaFilter, setTipologiaCommessaFilter] = useState<string>('all');
  const [statoFilter, setStatoFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'in-corso' | 'da-iniziare' | 'completate'>('all');
  const [clienteFilter, setClienteFilter] = useState<string>('all');
  const [clienti, setClienti] = useState<Array<{ id: string; nome: string; cognome: string }>>([]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<string>('nome_commessa');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadCommesse();
    loadClienti();
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
  }, []);

  const loadClienti = useCallback(async () => {
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

      const { data, error } = await supabase
        .from('clienti')
        .select('id, nome, cognome')
        .eq('tenant_id', userTenants.tenant_id)
        .order('cognome', { ascending: true });

      if (error) throw error;
      setClienti(data || []);
    } catch (error) {
      console.error('Error loading clienti:', error);
    }
  }, []);

  const loadCommesse = useCallback(async () => {
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

      const { data, error } = await supabase
        .from('commesse')
        .select('*')
        .eq('tenant_id', userTenants.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const { data: clientiData } = await supabase
        .from('clienti')
        .select('id, nome, cognome')
        .eq('tenant_id', userTenants.tenant_id);

      const clientiMap = new Map<string, string>();
      if (clientiData) {
        clientiData.forEach(c => {
          clientiMap.set(c.id, `${c.cognome} ${c.nome}`.trim());
        });
      }

      const commesseWithClientNames = data?.map(c => ({
        ...c,
        cliente_nome_completo: clientiMap.get(c.cliente_commessa) || c.cliente_commessa
      })) || [];

      setCommesse(commesseWithClientNames);

      if (data && data.length > 0) {
        const commesseIds = data.map(c => c.id);
        const { data: riepilogoData } = await supabase
          .from('riepilogo_economico_commessa')
          .select('commessa_id, margine_lordo')
          .in('commessa_id', commesseIds);

        if (riepilogoData) {
          const marginiMap: Record<string, number> = {};
          riepilogoData.forEach(r => {
            marginiMap[r.commessa_id] = r.margine_lordo || 0;
          });
          setMarginiLordi(marginiMap);
        }
      }
    } catch (error) {
      console.error('Error loading commesse:', error);
      toast.error('Errore nel caricamento delle commesse');
    } finally {
      setLoading(false);
    }
  }, []);

  // ===== HELPERS =====

  const getStatusColor = useCallback((commessa: Commessa) => {
    if (!commessa.data_inizio) return 'bg-blue-500';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'bg-blue-500';
    if (endDate && today > endDate) return 'bg-yellow-500';
    return 'bg-green-500';
  }, []);

  const getStatusText = useCallback((commessa: Commessa) => {
    if (!commessa.data_inizio) return 'Da Iniziare';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'Da Iniziare';
    if (endDate && today > endDate) return 'Completata';
    return 'In Corso';
  }, []);

  const getStatusBadgeStyle = useCallback((commessa: Commessa) => {
    if (!commessa.data_inizio) return 'bg-blue-100 text-blue-700';

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return 'bg-blue-100 text-blue-700';
    if (endDate && today > endDate) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }, []);

  const buildAddress = useCallback((commessa: Commessa) => {
    const parts = [];
    if (commessa.via) {
      parts.push(commessa.via);
      if (commessa.numero_civico) {
        parts[0] = `${parts[0]} ${commessa.numero_civico}`;
      }
    }
    if (commessa.cap && commessa.citta) {
      parts.push(`${commessa.cap} ${commessa.citta}`);
    } else if (commessa.citta) {
      parts.push(commessa.citta);
    }
    if (commessa.provincia) parts.push(commessa.provincia);
    return parts.join(', ');
  }, []);

  const formatMargine = useCallback((value: number, commessaId: string) => {
    if (showMargini[commessaId]) {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
    }
    return '*'.repeat(8);
  }, [showMargini]);

  const getMargineColor = useCallback((value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  }, []);

  const toggleMargine = useCallback((commessaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMargini(prev => ({
      ...prev,
      [commessaId]: !prev[commessaId]
    }));
  }, []);

  // ===== FILTERING =====

  const filteredCommesse = useMemo(() => {
    let filtered = commesse;

    // Tab filter
    if (activeTab !== 'all') {
      const today = new Date();
      filtered = filtered.filter(c => {
        const hasStarted = c.data_inizio ? new Date(c.data_inizio) <= today : false;
        const hasEnded = c.data_fine_prevista ? new Date(c.data_fine_prevista) < today : false;

        if (activeTab === 'in-corso') return hasStarted && !hasEnded;
        if (activeTab === 'completate') return hasEnded;
        if (activeTab === 'da-iniziare') return !hasStarted;
        return true;
      });
    }

    // Search
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (commessa) =>
          commessa.nome_commessa.toLowerCase().includes(searchQuery.toLowerCase()) ||
          commessa.cliente_commessa.toLowerCase().includes(searchQuery.toLowerCase()) ||
          commessa.codice_commessa?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filters
    if (tipologiaClienteFilter !== 'all') {
      filtered = filtered.filter(c => c.tipologia_cliente === tipologiaClienteFilter);
    }

    if (tipologiaCommessaFilter !== 'all') {
      filtered = filtered.filter(c => c.tipologia_commessa === tipologiaCommessaFilter);
    }

    if (clienteFilter !== 'all') {
      filtered = filtered.filter(c => c.cliente_commessa === clienteFilter);
    }

    if (statoFilter !== 'all') {
      const today = new Date();
      filtered = filtered.filter(c => {
        const hasStarted = c.data_inizio ? new Date(c.data_inizio) <= today : false;
        const hasEnded = c.data_fine_prevista ? new Date(c.data_fine_prevista) < today : false;

        if (statoFilter === 'in-corso') return hasStarted && !hasEnded;
        if (statoFilter === 'completate') return hasEnded;
        if (statoFilter === 'da-iniziare') return !hasStarted;
        return true;
      });
    }

    return filtered;
  }, [searchQuery, commesse, tipologiaClienteFilter, tipologiaCommessaFilter, clienteFilter, statoFilter, activeTab]);

  // Sorting and Pagination
  const sortedAndPaginatedCommesse = useMemo(() => {
    // Sort
    const sorted = [...filteredCommesse].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'codice_commessa':
          aVal = a.codice_commessa || '';
          bVal = b.codice_commessa || '';
          break;
        case 'nome_commessa':
          aVal = a.nome_commessa || '';
          bVal = b.nome_commessa || '';
          break;
        case 'cliente_nome_completo':
          aVal = a.cliente_nome_completo || a.cliente_commessa || '';
          bVal = b.cliente_nome_completo || b.cliente_commessa || '';
          break;
        case 'tipologia_cliente':
          aVal = a.tipologia_cliente || '';
          bVal = b.tipologia_cliente || '';
          break;
        case 'margine':
          aVal = marginiLordi[a.id] ?? 0;
          bVal = marginiLordi[b.id] ?? 0;
          break;
        case 'stato':
          aVal = getStatusText(a);
          bVal = getStatusText(b);
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

    // Paginate
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCommesse, currentPage, itemsPerPage, sortField, sortDirection, marginiLordi]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const today = new Date();
    const counts = {
      all: commesse.length,
      'in-corso': 0,
      'da-iniziare': 0,
      completate: 0
    };

    commesse.forEach(c => {
      const hasStarted = c.data_inizio ? new Date(c.data_inizio) <= today : false;
      const hasEnded = c.data_fine_prevista ? new Date(c.data_fine_prevista) < today : false;

      if (hasEnded) counts.completate++;
      else if (hasStarted) counts['in-corso']++;
      else counts['da-iniziare']++;
    });

    return counts;
  }, [commesse]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tipologiaClienteFilter !== 'all') count++;
    if (tipologiaCommessaFilter !== 'all') count++;
    if (clienteFilter !== 'all') count++;
    if (statoFilter !== 'all') count++;
    return count;
  }, [tipologiaClienteFilter, tipologiaCommessaFilter, clienteFilter, statoFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tipologiaClienteFilter, tipologiaCommessaFilter, clienteFilter, statoFilter, activeTab]);

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ===== DATATABLE COLUMNS =====

  const columns: DataTableColumn<Commessa>[] = [
    {
      key: 'codice_commessa',
      label: 'COD',
      sortable: true,
      width: 'w-24',
      render: (commessa) => (
        <div className="relative pl-2">
          <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-r", getStatusColor(commessa))} />
          <div className="text-sm text-foreground font-medium truncate">
            {commessa.codice_commessa || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'nome_commessa',
      label: 'Nome',
      sortable: true,
      render: (commessa) => (
        <div className="text-sm text-foreground truncate">
          {commessa.nome_commessa}
        </div>
      ),
    },
    {
      key: 'indirizzo',
      label: 'Indirizzo',
      sortable: false,
      render: (commessa) => {
        const address = buildAddress(commessa);
        return address ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground truncate">{address}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
              }}
              className="flex-shrink-0 text-primary hover:text-primary/80"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      key: 'cliente_nome_completo',
      label: 'Cliente',
      sortable: true,
      render: (commessa) => (
        <div className="text-sm text-foreground truncate">
          {commessa.cliente_nome_completo || commessa.cliente_commessa}
        </div>
      ),
    },
    {
      key: 'tipologia_cliente',
      label: 'Tipologia',
      sortable: true,
      width: 'w-28',
      render: (commessa) => (
        <div className="text-sm text-foreground">
          {commessa.tipologia_cliente || '-'}
        </div>
      ),
    },
    {
      key: 'margine',
      label: 'Margine Lordo',
      sortable: true,
      width: 'w-32',
      headerClassName: 'whitespace-nowrap',
      render: (commessa) => {
        const margine = marginiLordi[commessa.id] ?? 0;
        return (
          <button
            onClick={(e) => toggleMargine(commessa.id, e)}
            className={cn(
              "text-sm font-bold cursor-pointer flex items-center gap-2",
              getMargineColor(margine)
            )}
          >
            {formatMargine(margine, commessa.id)}
            {showMargini[commessa.id] ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        );
      },
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      width: 'w-28',
      render: (commessa) => (
        <span className={cn("inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium", getStatusBadgeStyle(commessa))}>
          {getStatusText(commessa)}
        </span>
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

  // Filtered clients for dropdown
  const filteredClienti = useMemo(() => {
    if (!clienteSearch) return clienti;
    return clienti.filter(c => {
      const fullName = `${c.cognome} ${c.nome}`.toLowerCase();
      return fullName.includes(clienteSearch.toLowerCase());
    });
  }, [clienti, clienteSearch]);

  return (
    <div className="space-y-6">
      {/* Navbar Portal Button */}
      {navbarActionsContainer &&
        createPortal(
          <Button
            onClick={() => router.push('/commesse/nuova')}
            className="gap-2 h-10 rounded-sm"
          >
            <Plus className="h-4 w-4" />
            Nuova Commessa
          </Button>,
          navbarActionsContainer
        )}

      {/* Tabs */}
      <TabsFilter<TabType>
        tabs={[
          {
            value: 'all',
            label: 'Tutte',
            icon: Briefcase,
            count: tabCounts.all,
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'in-corso',
            label: 'In corso',
            icon: Play,
            count: tabCounts['in-corso'],
            activeColor: 'border-green-500 text-green-700',
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'da-iniziare',
            label: 'Da iniziare',
            icon: Clock,
            count: tabCounts['da-iniziare'],
            activeColor: 'border-blue-500 text-blue-700',
            badgeClassName: 'bg-primary/10 text-primary',
          },
          {
            value: 'completate',
            label: 'Completate',
            icon: CheckCircle,
            count: tabCounts.completate,
            activeColor: 'border-yellow-500 text-yellow-700',
            badgeClassName: 'bg-primary/10 text-primary',
          },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightContent={
          <>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('cards')}
              className="h-9 w-9 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('table')}
              className="h-9 w-9 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </>
        }
      />

      {/* View Toggle - Cards or Table */}
      {viewMode === 'cards' ? (
        <>
          {/* Search and Filters for Cards */}
          <div className="flex flex-col lg:flex-row gap-3">
            <Input
              placeholder="Cerca commesse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 border-2 border-border rounded-sm bg-white flex-1"
            />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="h-11 gap-2 border-2 border-border rounded-sm bg-white relative"
            >
              <Filter className="h-4 w-4" />
              Filtri
              {activeFiltersCount > 0 && (
                <Badge variant="default" className="ml-1">{activeFiltersCount}</Badge>
              )}
            </Button>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-sm border-2 border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={tipologiaClienteFilter} onValueChange={setTipologiaClienteFilter}>
                  <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                    <SelectValue placeholder="Tipologia Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le tipologie</SelectItem>
                    <SelectItem value="Privato">Privato</SelectItem>
                    <SelectItem value="Pubblico">Pubblico</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tipologiaCommessaFilter} onValueChange={setTipologiaCommessaFilter}>
                  <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                    <SelectValue placeholder="Tipologia Commessa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le commesse</SelectItem>
                    <SelectItem value="Appalto">Appalto</SelectItem>
                    <SelectItem value="ATI">ATI</SelectItem>
                    <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
                    <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clienteFilter} onValueChange={setClienteFilter}>
                  <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                    <SelectValue placeholder="Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        placeholder="Cerca cliente..."
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <SelectItem value="all">Tutti i clienti</SelectItem>
                    {filteredClienti.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.cognome} {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statoFilter} onValueChange={setStatoFilter}>
                  <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="in-corso">In Corso</SelectItem>
                    <SelectItem value="da-iniziare">Da Iniziare</SelectItem>
                    <SelectItem value="completate">Completate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
          ) : filteredCommesse.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px] rounded-sm border-2 border-dashed border-border bg-card/50">
              <div className="text-center space-y-3">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">Nessuna commessa trovata</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {searchQuery || activeFiltersCount > 0 ? 'Prova a modificare i filtri' : 'Inizia creando una nuova commessa'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedAndPaginatedCommesse.map(commessa => (
                <CommessaCard
                  key={commessa.id}
                  commessa={commessa}
                  margine={marginiLordi[commessa.id]}
                  onClick={() => router.push(`/commesse/${commessa.slug}`)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Table View with DataTable */
        <DataTable<Commessa>
          data={sortedAndPaginatedCommesse}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyIcon={Briefcase}
          emptyTitle="Nessuna commessa trovata"
          emptyDescription={searchQuery || activeFiltersCount > 0 ? 'Prova a modificare i filtri' : 'Inizia creando una nuova commessa'}
          searchable
          searchPlaceholder="Cerca commesse..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          toolbarFilters={
            <>
              <Select value={tipologiaClienteFilter} onValueChange={setTipologiaClienteFilter}>
                <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Tipologia Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le tipologie</SelectItem>
                  <SelectItem value="Privato">Privato</SelectItem>
                  <SelectItem value="Pubblico">Pubblico</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tipologiaCommessaFilter} onValueChange={setTipologiaCommessaFilter}>
                <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Tipologia Commessa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le commesse</SelectItem>
                  <SelectItem value="Appalto">Appalto</SelectItem>
                  <SelectItem value="ATI">ATI</SelectItem>
                  <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
                  <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Cerca cliente..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <SelectItem value="all">Tutti i clienti</SelectItem>
                  {filteredClienti.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cognome} {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statoFilter} onValueChange={setStatoFilter}>
                <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="in-corso">In Corso</SelectItem>
                  <SelectItem value="da-iniziare">Da Iniziare</SelectItem>
                  <SelectItem value="completate">Completate</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          currentPage={currentPage}
          pageSize={itemsPerPage}
          totalItems={filteredCommesse.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          onRowClick={(commessa) => router.push(`/commesse/${commessa.slug}`)}
        />
      )}
    </div>
  );
}
