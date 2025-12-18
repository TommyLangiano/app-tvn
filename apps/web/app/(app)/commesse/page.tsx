'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CommessaTable } from '@/components/features/commesse/CommessaTable';
import { createClient } from '@/lib/supabase/client';
import type { Commessa } from '@/types/commessa';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-border">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'all'
                ? 'text-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabCounts.all > 0 && (
                <span className="text-xs bg-primary text-white px-3 py-0.5 rounded-full">{tabCounts.all}</span>
              )}
              Tutte
            </span>
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('in-corso')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'in-corso'
                ? 'text-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabCounts.inCorso > 0 && (
                <span className="text-xs bg-primary text-white px-3 py-0.5 rounded-full">{tabCounts.inCorso}</span>
              )}
              In corso
            </span>
            {activeTab === 'in-corso' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('da-iniziare')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'da-iniziare'
                ? 'text-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabCounts.daIniziare > 0 && (
                <span className="text-xs bg-primary text-white px-3 py-0.5 rounded-full">{tabCounts.daIniziare}</span>
              )}
              Da iniziare
            </span>
            {activeTab === 'da-iniziare' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('completate')}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              activeTab === 'completate'
                ? 'text-black'
                : 'text-gray-600 hover:text-black'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabCounts.completate > 0 && (
                <span className="text-xs bg-primary text-white px-3 py-0.5 rounded-full">{tabCounts.completate}</span>
              )}
              Completate
            </span>
            {activeTab === 'completate' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground" />
            <Input
              placeholder="Cerca commesse..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-2 border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground w-full"
            />
          </div>

          {/* Filtro Tipologia Cliente */}
          <Select value={tipologiaClienteFilter} onValueChange={setTipologiaClienteFilter}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-sm bg-background text-foreground">
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
            <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-sm bg-background text-foreground">
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
            <SelectTrigger className="w-full sm:w-[200px] h-11 border-2 border-border rounded-sm bg-background text-foreground">
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

      {/* Commesse Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filteredCommesse.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/50">
          <p className="text-muted-foreground">
            {searchQuery || tipologiaClienteFilter !== 'all' || tipologiaCommessaFilter !== 'all' || clienteFilter !== 'all'
              ? 'Nessuna commessa trovata con i filtri selezionati'
              : 'Nessuna commessa presente'}
          </p>
        </div>
      ) : (
        <>
          <CommessaTable
            commesse={commessePaginate}
            marginiLordi={marginiLordi}
          />

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
