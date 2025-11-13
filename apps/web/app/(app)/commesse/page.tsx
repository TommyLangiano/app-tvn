'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CommessaCard } from '@/components/features/commesse/CommessaCard';
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
  const [filteredCommesse, setFilteredCommesse] = useState<Commessa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [marginiLordi, setMarginiLordi] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [tipologiaClienteFilter, setTipologiaClienteFilter] = useState<string>('all');
  const [tipologiaCommessaFilter, setTipologiaCommessaFilter] = useState<string>('all');
  const [statoFilter, setStatoFilter] = useState<string>('all');

  useEffect(() => {
    loadCommesse();
  }, []);

  useEffect(() => {
    let filtered = commesse;

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

    setFilteredCommesse(filtered);
    setCurrentPage(1);
  }, [searchQuery, commesse, tipologiaClienteFilter, tipologiaCommessaFilter, statoFilter]);

  const loadCommesse = async () => {
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

      setCommesse(data || []);
      setFilteredCommesse(data || []);

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
  };

  // Pagination logic
  const totalCommesse = filteredCommesse.length;
  const totalPages = Math.ceil(totalCommesse / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const commessePaginate = filteredCommesse.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">

      {/* Search, Filters and New Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca commesse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-lg bg-card w-full"
          />
        </div>

        {/* Filtro Tipologia Cliente */}
        <Select value={tipologiaClienteFilter} onValueChange={setTipologiaClienteFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Tipologia Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Tipologie</SelectItem>
            <SelectItem value="Privato">Privato</SelectItem>
            <SelectItem value="Pubblico">Pubblico</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Tipo Commessa */}
        <Select value={tipologiaCommessaFilter} onValueChange={setTipologiaCommessaFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Tipo Commessa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i Tipi</SelectItem>
            <SelectItem value="Appalto">Appalto</SelectItem>
            <SelectItem value="ATI">ATI</SelectItem>
            <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
            <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Stato */}
        <Select value={statoFilter} onValueChange={setStatoFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli Stati</SelectItem>
            <SelectItem value="da-iniziare">Da Iniziare</SelectItem>
            <SelectItem value="in-corso">In Corso</SelectItem>
            <SelectItem value="completate">Completate</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => router.push('/commesse/nuova')} className="gap-2 h-11 whitespace-nowrap">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuova Commessa</span>
          <span className="sm:hidden">Nuova</span>
        </Button>
      </div>

      {/* Commesse Grid - 2 per riga */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : filteredCommesse.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/50">
          <p className="text-muted-foreground">
            {searchQuery || tipologiaClienteFilter !== 'all' || tipologiaCommessaFilter !== 'all' || statoFilter !== 'all'
              ? 'Nessuna commessa trovata con i filtri selezionati'
              : 'Nessuna commessa presente'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {commessePaginate.map((commessa) => (
              <CommessaCard
                key={commessa.id}
                commessa={commessa}
                margineLordo={marginiLordi[commessa.id] || 0}
              />
            ))}
          </div>

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
  );
}
