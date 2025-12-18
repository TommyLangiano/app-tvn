'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, Plus, ChevronLeft, ChevronRight, Filter, Grid3x3, List, Play, Clock, CheckCircle, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CommessaTable } from '@/components/features/commesse/CommessaTable';
import { CommessaCard } from '@/components/features/commesse/CommessaCard';
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

export default function CommessePage() {
  const router = useRouter();
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [marginiLordi, setMarginiLordi] = useState<Record<string, number>>({});
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCommesse();
    loadClienti();
    // Trova il container per i bottoni nella navbar
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

  // Memoizza filtered commesse per evitare ricalcoli costosi
  const filteredCommesse = useMemo(() => {
    let filtered = commesse;

    // Filtro tab stato
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

    // Filtro ricerca
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (commessa) =>
          commessa.nome_commessa.toLowerCase().includes(searchQuery.toLowerCase()) ||
          commessa.cliente_commessa.toLowerCase().includes(searchQuery.toLowerCase()) ||
          commessa.codice_commessa?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro tipologia cliente
    if (tipologiaClienteFilter !== 'all') {
      filtered = filtered.filter(c => c.tipologia_cliente === tipologiaClienteFilter);
    }

    // Filtro tipologia commessa
    if (tipologiaCommessaFilter !== 'all') {
      filtered = filtered.filter(c => c.tipologia_commessa === tipologiaCommessaFilter);
    }

    // Filtro cliente
    if (clienteFilter !== 'all') {
      filtered = filtered.filter(c => c.cliente_commessa === clienteFilter);
    }

    // Filtro stato
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tipologiaClienteFilter, tipologiaCommessaFilter, clienteFilter, statoFilter, activeTab]);

  const loadCommesse = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get tenant ID
      const { data: tenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenants = tenants && tenants.length > 0 ? tenants[0] : null;
      if (!userTenants) return;

      // Load commesse
      const { data, error } = await supabase
        .from('commesse')
        .select('*')
        .eq('tenant_id', userTenants.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load all clients to map IDs to names
      const { data: clientiData } = await supabase
        .from('clienti')
        .select('id, nome, cognome')
        .eq('tenant_id', userTenants.tenant_id);

      // Create a map of client IDs to full names
      const clientiMap = new Map<string, string>();
      if (clientiData) {
        clientiData.forEach(c => {
          clientiMap.set(c.id, `${c.cognome} ${c.nome}`.trim());
        });
      }

      // Map data to include client full name
      const commesseWithClientNames = data?.map(c => ({
        ...c,
        cliente_nome_completo: clientiMap.get(c.cliente_commessa) || c.cliente_commessa
      })) || [];

      setCommesse(commesseWithClientNames);
      setFilteredCommesse(commesseWithClientNames);

      // Load margini lordi for all commesse
      if (data && data.length > 0) {
        const commesseIds = data.map(c => c.id);
        const { data: riepilogoData } = await supabase
          .from('riepilogo_economico_commessa')
          .select('commessa_id, margine_lordo')
          .in('commessa_id', commesseIds);

        if (riepilogoData) {
          const marginiMap: Record<string, number> = {};
          riepilogoData.forEach(r => {
            // Convert to number in case it comes as string from database
            marginiMap[r.commessa_id] = Number(r.margine_lordo) || 0;
          });
          setMarginiLordi(marginiMap);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoizza pagination logic
  const paginationData = useMemo(() => {
    const totalCommesse = filteredCommesse.length;
    const totalPages = Math.ceil(totalCommesse / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const commessePaginate = filteredCommesse.slice(startIndex, endIndex);

    return { totalCommesse, totalPages, startIndex, endIndex, commessePaginate };
  }, [filteredCommesse, currentPage, itemsPerPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleItemsPerPageChange = useCallback((value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  }, []);

  // Memoizza contatori per ogni tab
  const tabCounts = useMemo(() => {
    const today = new Date();
    const counts = {
      all: commesse.length,
      inCorso: 0,
      daIniziare: 0,
      completate: 0,
    };

    commesse.forEach(c => {
      const hasStarted = c.data_inizio ? new Date(c.data_inizio) <= today : false;
      const hasEnded = c.data_fine_prevista ? new Date(c.data_fine_prevista) < today : false;

      if (hasStarted && !hasEnded) counts.inCorso++;
      else if (!hasStarted) counts.daIniziare++;
      else if (hasEnded) counts.completate++;
    });

    return counts;
  }, [commesse]);

  const { totalCommesse, totalPages, startIndex, endIndex, commessePaginate } = paginationData;

  return (
    <>
      {/* Portal: Bottone nella Navbar */}
      {navbarActionsContainer && createPortal(
        <Button onClick={() => router.push('/commesse/nuova')} className="h-12 px-6 py-3 text-sm whitespace-nowrap rounded-sm">
          Nuova Commessa
        </Button>,
        navbarActionsContainer
      )}

      <div className="space-y-6">
        {/* Tabs Redesign con icone e color coding */}
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-all relative flex items-center gap-2 border-b-2",
                activeTab === 'all'
                  ? 'text-primary border-primary'
                  : 'text-gray-600 hover:text-black border-transparent'
              )}
            >
              <Briefcase className="h-4 w-4" />
              <span>Tutte</span>
              {tabCounts.all > 0 && (
                <Badge variant="secondary" className="ml-1">{tabCounts.all}</Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab('in-corso')}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-all relative flex items-center gap-2 border-b-2",
                activeTab === 'in-corso'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-600 hover:text-green-600 border-transparent'
              )}
            >
              <Play className="h-4 w-4" />
              <span>In corso</span>
              {tabCounts.inCorso > 0 && (
                <Badge className="ml-1 bg-green-100 text-green-700 hover:bg-green-100">{tabCounts.inCorso}</Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab('da-iniziare')}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-all relative flex items-center gap-2 border-b-2",
                activeTab === 'da-iniziare'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600 border-transparent'
              )}
            >
              <Clock className="h-4 w-4" />
              <span>Da iniziare</span>
              {tabCounts.daIniziare > 0 && (
                <Badge className="ml-1 bg-blue-100 text-blue-700 hover:bg-blue-100">{tabCounts.daIniziare}</Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab('completate')}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-all relative flex items-center gap-2 border-b-2",
                activeTab === 'completate'
                  ? 'text-yellow-600 border-yellow-600'
                  : 'text-gray-600 hover:text-yellow-600 border-transparent'
              )}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Completate</span>
              {tabCounts.completate > 0 && (
                <Badge className="ml-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{tabCounts.completate}</Badge>
              )}
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-9 w-9 p-0"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-9 w-9 p-0"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters - Collapsible */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
              <Input
                placeholder="Cerca commesse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 px-4"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtri
              {(tipologiaClienteFilter !== 'all' || tipologiaCommessaFilter !== 'all' || clienteFilter !== 'all') && (
                <Badge className="ml-2" variant="secondary">
                  {[tipologiaClienteFilter, tipologiaCommessaFilter, clienteFilter].filter(f => f !== 'all').length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filtri Collapsible */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-border">
              <Select value={tipologiaClienteFilter} onValueChange={setTipologiaClienteFilter}>
                <SelectTrigger className="w-full h-11 border-2 border-border rounded-sm bg-background text-foreground">
                  <SelectValue placeholder="Tipologia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tipologia</SelectItem>
                  <SelectItem value="Privato">Privato</SelectItem>
                  <SelectItem value="Pubblico">Pubblico</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Tipo Commessa */}
              <Select value={tipologiaCommessaFilter} onValueChange={setTipologiaCommessaFilter}>
                <SelectTrigger className="w-full h-11 border-2 border-border rounded-sm bg-background text-foreground">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tipo</SelectItem>
                  <SelectItem value="Appalto">Appalto</SelectItem>
                  <SelectItem value="ATI">ATI</SelectItem>
                  <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
                  <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Cliente */}
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger className="w-full h-11 border-2 border-border rounded-sm bg-background text-foreground">
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="Cerca cliente..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="h-9"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectItem value="all">Cliente</SelectItem>
                  {clienti
                    .filter(c => {
                      const fullName = `${c.cognome || ''} ${c.nome || ''}`.trim();
                      return fullName && fullName.toLowerCase().includes(clienteSearch.toLowerCase());
                    })
                    .map(cliente => {
                      const fullName = `${cliente.cognome || ''} ${cliente.nome || ''}`.trim();
                      return fullName ? (
                        <SelectItem key={cliente.id} value={fullName}>
                          {fullName}
                        </SelectItem>
                      ) : null;
                    })
                    .filter(Boolean)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

      {/* Commesse Table/Cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filteredCommesse.length === 0 ? (
        <div className="text-center py-16 rounded-lg border border-dashed border-border bg-card/50">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mb-2">Nessuna commessa trovata</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchQuery || tipologiaClienteFilter !== 'all' || tipologiaCommessaFilter !== 'all' || clienteFilter !== 'all'
              ? 'Prova a rimuovere alcuni filtri'
              : 'Inizia creando la tua prima commessa'}
          </p>
          {(searchQuery || tipologiaClienteFilter !== 'all' || tipologiaCommessaFilter !== 'all' || clienteFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setTipologiaClienteFilter('all');
                setTipologiaCommessaFilter('all');
                setClienteFilter('all');
              }}
            >
              Rimuovi filtri
            </Button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <CommessaTable
              commesse={commessePaginate}
              marginiLordi={marginiLordi}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {commessePaginate.map(commessa => (
                <CommessaCard
                  key={commessa.id}
                  commessa={commessa}
                  margineLordo={marginiLordi[commessa.id]}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCommesse > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              {/* Left side - Info and Items per page */}
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, totalCommesse)} di {totalCommesse} elementi
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Elementi per pagina:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={handleItemsPerPageChange}
                  >
                    <SelectTrigger className="w-20 h-9 rounded-lg border-2 border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right side - Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostra sempre prima pagina, ultima pagina, e pagine vicine a quella corrente
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      // Aggiungi "..." se c'è un gap
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="h-9 w-9 p-0"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </>
  );
}
