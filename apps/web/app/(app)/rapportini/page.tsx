'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Info, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Plus, User, Calendar, Clock, Briefcase } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
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
import { InfoRapportinoModal } from '@/components/features/rapportini/InfoRapportinoModal';
import { DeleteRapportinoModal } from '@/components/features/rapportini/DeleteRapportinoModal';
import { NuovoRapportinoModal } from '@/components/features/rapportini/NuovoRapportinoModal';
import { getSignedUrl } from '@/lib/utils/storage';

export default function RapportiniPage() {
  const [loading, setLoading] = useState(true);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [meseFiltro, setMeseFiltro] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Ordinamento
  const [ordinamento, setOrdinamento] = useState<'data_desc' | 'data_asc' | 'ore_desc' | 'ore_asc' | 'user_asc' | 'user_desc'>('data_desc');

  // Modal states
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNuovoModal, setShowNuovoModal] = useState(false);

  // Multi-selection states
  const [selectedRapportini, setSelectedRapportini] = useState<Set<string>>(new Set());

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtri toggle
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadRapportini();
  }, [meseFiltro]);

  const loadRapportini = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      // Parse month filter
      const [year, month] = meseFiltro.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      const { data, error } = await supabase
        .from('rapportini')
        .select(`
          *,
          commessa:commesse(titolo, slug)
        `)
        .eq('tenant_id', userTenants.tenant_id)
        .gte('data_rapportino', firstDay.toISOString().split('T')[0])
        .lte('data_rapportino', lastDay.toISOString().split('T')[0])
        .order('data_rapportino', { ascending: false });

      if (error) throw error;

      // Fetch user details
      const rapportiniWithUsers = await Promise.all(
        (data || []).map(async (r) => {
          const { data: userData } = await supabase.auth.admin.getUserById(r.user_id);
          return {
            ...r,
            user: userData?.user
          };
        })
      );

      setRapportini(rapportiniWithUsers);
    } catch (error) {
      console.error('Error loading rapportini:', error);
      toast.error('Errore nel caricamento dei rapportini');
    } finally {
      setLoading(false);
    }
  };

  const getUserDisplayName = (rapportino: Rapportino) => {
    if (!rapportino.user) return 'Utente';
    const metadata = rapportino.user.user_metadata;
    return metadata?.full_name || rapportino.user.email?.split('@')[0] || 'Utente';
  };

  // Filtri e ordinamento
  const rapportiniFiltrati = useMemo(() => {
    let filtered = [...rapportini];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        getUserDisplayName(r).toLowerCase().includes(searchLower) ||
        r.commessa?.titolo.toLowerCase().includes(searchLower) ||
        r.note?.toLowerCase().includes(searchLower)
      );
    }

    // Ordinamento
    filtered.sort((a, b) => {
      switch (ordinamento) {
        case 'data_desc':
          return new Date(b.data_rapportino).getTime() - new Date(a.data_rapportino).getTime();
        case 'data_asc':
          return new Date(a.data_rapportino).getTime() - new Date(b.data_rapportino).getTime();
        case 'ore_desc':
          return b.ore_lavorate - a.ore_lavorate;
        case 'ore_asc':
          return a.ore_lavorate - b.ore_lavorate;
        case 'user_asc':
          return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
        case 'user_desc':
          return getUserDisplayName(b).localeCompare(getUserDisplayName(a));
        default:
          return 0;
      }
    });

    return filtered;
  }, [rapportini, searchTerm, ordinamento]);

  // Paginazione
  const totalPages = Math.ceil(rapportiniFiltrati.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const rapportiniPaginati = rapportiniFiltrati.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, meseFiltro, itemsPerPage]);

  // Calcola totale ore
  const totaleOre = rapportiniFiltrati.reduce((sum, r) => sum + r.ore_lavorate, 0);

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
    } catch (error) {
      console.error('Error opening allegato:', error);
      toast.error('Errore nell&apos;apertura dell&apos;allegato');
    }
  };

  const handleBulkDelete = async () => {
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
      loadRapportini();
    } catch (error) {
      console.error('Error deleting rapportini:', error);
      toast.error('Errore nell&apos;eliminazione');
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb pageName="Rapportini" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rapportiniFiltrati.length}</p>
              <p className="text-sm text-muted-foreground">Rapportini</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-500/10">
              <Clock className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {totaleOre.toFixed(1)}h
              </p>
              <p className="text-sm text-muted-foreground">Ore Totali</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {new Set(rapportiniFiltrati.map(r => r.user_id)).size}
              </p>
              <p className="text-sm text-muted-foreground">Operai Attivi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setShowFilters(!showFilters)}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            Filtri e Ricerca
            {showFilters ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSearchTerm('');
              const now = new Date();
              setMeseFiltro(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              setOrdinamento('data_desc');
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Azzera filtri
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ricerca */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per operaio, commessa, note..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-lg border-2 border-border bg-background"
                  />
                </div>
              </div>

              {/* Filtro Mese */}
              <div>
                <Input
                  type="month"
                  value={meseFiltro}
                  onChange={(e) => setMeseFiltro(e.target.value)}
                  className="rounded-lg border-2 border-border bg-background"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedRapportini.size > 0 && (
        <div className="rounded-xl border-2 border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {selectedRapportini.size} {selectedRapportini.size === 1 ? 'rapportino selezionato' : 'rapportini selezionati'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSelectedRapportini(new Set())}
                variant="outline"
                size="sm"
              >
                Deseleziona tutto
              </Button>
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Elimina selezionati
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header tabella con bottone nuovo */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Tutti i Rapportini</h2>
        <Button
          onClick={() => setShowNuovoModal(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuovo Rapportino
        </Button>
      </div>

      {/* Tabella */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background border-b-2 border-border">
              <tr>
                <th className="text-center p-4 w-12">
                  <input
                    type="checkbox"
                    checked={rapportiniPaginati.length > 0 && selectedRapportini.size === rapportiniPaginati.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRapportini(new Set(rapportiniPaginati.map(r => r.id)));
                      } else {
                        setSelectedRapportini(new Set());
                      }
                    }}
                    className="h-5 w-5 rounded border-2 border-border cursor-pointer"
                  />
                </th>

                {/* Operaio - Sortable */}
                <th className="text-left p-4 font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <span>Operaio</span>
                    <button
                      onClick={() => setOrdinamento(ordinamento === 'user_asc' ? 'user_desc' : 'user_asc')}
                      className="p-1 rounded hover:bg-muted/50"
                    >
                      {ordinamento === 'user_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'user_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                {/* Data - Sortable */}
                <th className="text-left p-4 font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <span>Data</span>
                    <button
                      onClick={() => setOrdinamento(ordinamento === 'data_asc' ? 'data_desc' : 'data_asc')}
                      className="p-1 rounded hover:bg-muted/50"
                    >
                      {ordinamento === 'data_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'data_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                <th className="text-left p-4 font-semibold text-sm">Commessa</th>

                {/* Ore - Sortable */}
                <th className="text-left p-4 font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <span>Ore Lavorate</span>
                    <button
                      onClick={() => setOrdinamento(ordinamento === 'ore_asc' ? 'ore_desc' : 'ore_asc')}
                      className="p-1 rounded hover:bg-muted/50"
                    >
                      {ordinamento === 'ore_asc' ? (
                        <ArrowUp className="h-3.5 w-3.5 text-primary" />
                      ) : ordinamento === 'ore_desc' ? (
                        <ArrowDown className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </th>

                <th className="text-center p-4 font-semibold text-sm w-12">Allegato</th>
                <th className="text-center p-4 font-semibold text-sm">Azioni</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Caricamento...
                  </td>
                </tr>
              ) : rapportiniPaginati.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Nessun rapportino trovato
                  </td>
                </tr>
              ) : (
                rapportiniPaginati.map((rapportino) => (
                  <tr key={rapportino.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRapportini.has(rapportino.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedRapportini);
                          if (e.target.checked) {
                            newSelected.add(rapportino.id);
                          } else {
                            newSelected.delete(rapportino.id);
                          }
                          setSelectedRapportini(newSelected);
                        }}
                        className="h-5 w-5 rounded border-2 border-border cursor-pointer"
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{getUserDisplayName(rapportino)}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(rapportino.data_rapportino).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span className="text-sm">{rapportino.commessa?.titolo}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {rapportino.ore_lavorate} ore
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      {rapportino.allegato_url && (
                        <button
                          onClick={(e) => handleAllegatoClick(rapportino.allegato_url, e)}
                          className="inline-flex items-center justify-center p-1.5 rounded hover:bg-muted transition-colors"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                        </button>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedRapportino(rapportino);
                            setShowInfoModal(true);
                          }}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Info"
                        >
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRapportino(rapportino);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 rounded hover:bg-muted transition-colors"
                          title="Elimina"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {rapportiniFiltrati.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t-2 border-border">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Righe per pagina:
              </span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(endIndex, rapportiniFiltrati.length)} di {rapportiniFiltrati.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Pagina {currentPage} di {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showInfoModal && selectedRapportino && (
        <InfoRapportinoModal
          rapportino={selectedRapportino}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedRapportino(null);
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
            loadRapportini();
          }}
        />
      )}

      {showNuovoModal && (
        <NuovoRapportinoModal
          onClose={() => setShowNuovoModal(false)}
          onSuccess={() => {
            setShowNuovoModal(false);
            loadRapportini();
          }}
        />
      )}
    </div>
  );
}
