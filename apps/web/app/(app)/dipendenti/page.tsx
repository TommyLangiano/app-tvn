'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Dipendente = {
  id: string;
  slug?: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  qualifica?: string;
  mansione?: string;
  stato: 'attivo' | 'sospeso' | 'licenziato' | 'pensionato';
  data_assunzione?: string;
  user_id?: string;
  avatar_url?: string;
  role_name?: string;
};

export default function DipendentiPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [statoFilter, setStatoFilter] = useState<string>('all');
  const [qualificaFilter, setQualificaFilter] = useState<string>('all');
  const [mansioneFilter, setMansioneFilter] = useState<string>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    loadDipendenti();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statoFilter, qualificaFilter, mansioneFilter]);

  const loadDipendenti = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      // Load dipendenti with role information
      const { data: dipendentiData, error } = await supabase
        .from('dipendenti')
        .select('id, slug, nome, cognome, email, telefono, qualifica, mansione, stato, data_assunzione, user_id, avatar_url')
        .eq('tenant_id', userTenants.tenant_id)
        .order('cognome', { ascending: true });

      if (error) throw error;

      // For each dipendente with user_id, get the role name
      const dipendentiWithRoles = await Promise.all(
        (dipendentiData || []).map(async (dip) => {
          if (!dip.user_id) return { ...dip, role_name: undefined };

          // Get user_tenant with custom_role_id
          const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('custom_role_id')
            .eq('user_id', dip.user_id)
            .eq('tenant_id', userTenants.tenant_id)
            .single();

          if (!userTenant?.custom_role_id) return { ...dip, role_name: undefined };

          // Get role name
          const { data: role } = await supabase
            .from('custom_roles')
            .select('name')
            .eq('id', userTenant.custom_role_id)
            .single();

          return { ...dip, role_name: role?.name };
        })
      );

      setDipendenti(dipendentiWithRoles);
    } catch {
      toast.error('Errore nel caricamento dei dipendenti');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (dipendente: Dipendente) => {
    return `${dipendente.cognome} ${dipendente.nome}`.trim();
  };

  const getInitials = (dipendente: Dipendente) => {
    const nome = dipendente.nome?.charAt(0).toUpperCase() || '';
    const cognome = dipendente.cognome?.charAt(0).toUpperCase() || '';
    return `${nome}${cognome}`;
  };

  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return null;
    const supabase = createClient();
    const { data } = supabase.storage.from('app-storage').getPublicUrl(avatarPath);
    return data.publicUrl;
  };

  const getStatoBadgeColor = (stato: string) => {
    switch (stato) {
      case 'attivo': return 'bg-green-100 text-green-700 border-green-200';
      case 'sospeso': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'licenziato': return 'bg-red-100 text-red-700 border-red-200';
      case 'pensionato': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get unique values for filters
  const uniqueQualifiche = Array.from(new Set(dipendenti.map(d => d.qualifica).filter(Boolean))).sort();
  const uniqueMansioni = Array.from(new Set(dipendenti.map(d => d.mansione).filter(Boolean))).sort();

  // Filter dipendenti based on search and filters
  const dipendentiFiltrati = dipendenti.filter(dipendente => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const displayName = getDisplayName(dipendente).toLowerCase();
      const matchesSearch = (
        displayName.includes(searchLower) ||
        dipendente.qualifica?.toLowerCase().includes(searchLower) ||
        dipendente.mansione?.toLowerCase().includes(searchLower) ||
        dipendente.email?.toLowerCase().includes(searchLower) ||
        dipendente.telefono?.includes(searchTerm)
      );
      if (!matchesSearch) return false;
    }

    // Stato filter
    if (statoFilter !== 'all' && dipendente.stato !== statoFilter) {
      return false;
    }

    // Qualifica filter
    if (qualificaFilter !== 'all' && dipendente.qualifica !== qualificaFilter) {
      return false;
    }

    // Mansione filter
    if (mansioneFilter !== 'all' && dipendente.mansione !== mansioneFilter) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalItems = dipendentiFiltrati.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const dipendentiPaginati = dipendentiFiltrati.slice(startIndex, endIndex);

  // Group paginated dipendenti alphabetically
  const dipendentiRaggruppati = dipendentiPaginati.reduce((acc, dipendente) => {
    let firstLetter = '#';
    if (dipendente.cognome) {
      firstLetter = dipendente.cognome.charAt(0).toUpperCase();
    }
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(dipendente);
    return acc;
  }, {} as Record<string, Dipendente[]>);

  return (
    <div className="space-y-6">
      {/* Search Bar, Filters and New Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca dipendente per nome, qualifica, mansione, email o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-lg bg-card w-full"
          />
        </div>

        {/* Filtro Stato */}
        <Select value={statoFilter} onValueChange={setStatoFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli Stati</SelectItem>
            <SelectItem value="attivo">Attivo</SelectItem>
            <SelectItem value="sospeso">Sospeso</SelectItem>
            <SelectItem value="licenziato">Licenziato</SelectItem>
            <SelectItem value="pensionato">Pensionato</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Qualifica */}
        <Select value={qualificaFilter} onValueChange={setQualificaFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Qualifica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Qualifiche</SelectItem>
            {uniqueQualifiche.map(qualifica => (
              <SelectItem key={qualifica} value={qualifica}>{qualifica}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Mansione */}
        <Select value={mansioneFilter} onValueChange={setMansioneFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Mansione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Mansioni</SelectItem>
            {uniqueMansioni.map(mansione => (
              <SelectItem key={mansione} value={mansione}>{mansione}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => router.push('/dipendenti/nuovo')}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-11 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuovo Dipendente</span>
          <span className="sm:hidden">Nuovo</span>
        </Button>
      </div>

      {/* Dipendenti List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : Object.keys(dipendentiRaggruppati).length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/50">
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Nessun dipendente trovato' : 'Nessun dipendente inserito'}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => router.push('/dipendenti/nuovo')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Aggiungi il primo dipendente
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Grid Layout con Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dipendentiPaginati.map((dipendente) => (
              <div
                key={dipendente.id}
                onClick={() => router.push(`/dipendenti/${dipendente.slug || dipendente.id}`)}
                className="rounded-xl border-2 border-border bg-card p-6 transition-all hover:border-emerald-500 hover:shadow-lg cursor-pointer group"
              >
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div className="w-28 h-28 rounded-full bg-emerald-100 text-emerald-700 overflow-hidden flex items-center justify-center font-bold text-3xl transition-colors">
                    {getAvatarUrl(dipendente.avatar_url) ? (
                      <img
                        src={getAvatarUrl(dipendente.avatar_url)!}
                        alt={getDisplayName(dipendente)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="group-hover:text-white transition-colors">{getInitials(dipendente)}</span>
                    )}
                  </div>
                </div>

                {/* Nome Cognome */}
                <h3 className="text-center font-bold text-lg mb-1 group-hover:text-emerald-600 transition-colors">
                  {getDisplayName(dipendente)}
                </h3>

                {/* Mansione */}
                {dipendente.mansione && (
                  <p className="text-center text-sm text-muted-foreground mb-3">
                    {dipendente.mansione}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-col gap-2 items-center mt-4">
                  {/* Prima riga: Stato e Account */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full border ${getStatoBadgeColor(dipendente.stato)}`}>
                      {dipendente.stato.charAt(0).toUpperCase() + dipendente.stato.slice(1)}
                    </span>
                    {dipendente.user_id && (
                      <span className="text-xs px-3 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                        Account
                      </span>
                    )}
                  </div>
                  {/* Seconda riga: Ruolo (se presente) */}
                  {dipendente.role_name && (
                    <span className="text-xs px-3 py-1 rounded-full border bg-purple-100 text-purple-700 border-purple-200 font-medium">
                      {dipendente.role_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border">
              {/* Left side - Info and Items per page */}
              <div className="flex items-center gap-6">
                <span className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} di {totalItems} dipendenti
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Elementi per pagina:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-9 rounded-lg border-2 border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="32">32</SelectItem>
                      <SelectItem value="40">40</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right side - Page navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      if (page === 1 || page === totalPages) return true;
                      if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                      return false;
                    })
                    .map((page, index, array) => {
                      const showEllipsis = index > 0 && page - array[index - 1] > 1;
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
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
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
