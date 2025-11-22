'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, Info, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { InfoFornitoreModal } from '@/components/features/anagrafica/InfoFornitoreModal';
import { DeleteFornitoreModal } from '@/components/features/anagrafica/DeleteFornitoreModal';

type Fornitore = {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore: string;
  email?: string;
  telefono?: string;
  sede_legale_citta?: string;
  sede_legale_provincia?: string;
};

export default function FornitoriPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFornitore, setSelectedFornitore] = useState<Fornitore | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Filter states
  const [formaGiuridicaFilter, setFormaGiuridicaFilter] = useState<string>('all');
  const [tipologiaSettoreFilter, setTipologiaSettoreFilter] = useState<string>('all');
  const [provinciaFilter, setProvinciaFilter] = useState<string>('all');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadFornitori();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, formaGiuridicaFilter, tipologiaSettoreFilter, provinciaFilter]);

  const loadFornitori = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('fornitori')
        .select('id, forma_giuridica, nome, cognome, ragione_sociale, tipologia_settore, email, telefono, sede_legale_citta, sede_legale_provincia')
        .order('cognome', { ascending: true, nullsFirst: false })
        .order('ragione_sociale', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setFornitori(data || []);
    } catch {
      toast.error('Errore nel caricamento dei fornitori');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      return `${fornitore.cognome || ''} ${fornitore.nome || ''}`.trim();
    }
    return fornitore.ragione_sociale || 'N/A';
  };

  const getInitials = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      const nome = fornitore.nome?.charAt(0).toUpperCase() || '';
      const cognome = fornitore.cognome?.charAt(0).toUpperCase() || '';
      return `${nome}${cognome}`;
    }
    return fornitore.ragione_sociale?.substring(0, 2).toUpperCase() || '??';
  };

  // Get unique values for filters
  const uniqueSettori = Array.from(new Set(fornitori.map(f => f.tipologia_settore).filter(Boolean))).sort();
  const uniqueProvince = Array.from(new Set(fornitori.map(f => f.sede_legale_provincia).filter(Boolean))).sort();

  // Filter fornitori based on search and filters
  const fornitoriFiltrati = fornitori.filter(fornitore => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const displayName = getDisplayName(fornitore).toLowerCase();
      const matchesSearch = (
        displayName.includes(searchLower) ||
        fornitore.tipologia_settore?.toLowerCase().includes(searchLower) ||
        fornitore.email?.toLowerCase().includes(searchLower) ||
        fornitore.telefono?.includes(searchTerm)
      );
      if (!matchesSearch) return false;
    }

    // Forma giuridica filter
    if (formaGiuridicaFilter !== 'all' && fornitore.forma_giuridica !== formaGiuridicaFilter) {
      return false;
    }

    // Tipologia settore filter
    if (tipologiaSettoreFilter !== 'all' && fornitore.tipologia_settore !== tipologiaSettoreFilter) {
      return false;
    }

    // Provincia filter
    if (provinciaFilter !== 'all' && fornitore.sede_legale_provincia !== provinciaFilter) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalItems = fornitoriFiltrati.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const fornitoriPaginati = fornitoriFiltrati.slice(startIndex, endIndex);

  // Group paginated fornitori alphabetically
  const fornitoriRaggruppati = fornitoriPaginati.reduce((acc, fornitore) => {
    let firstLetter = '#';
    if (fornitore.forma_giuridica === 'persona_fisica' && fornitore.cognome) {
      firstLetter = fornitore.cognome.charAt(0).toUpperCase();
    } else if (fornitore.ragione_sociale) {
      firstLetter = fornitore.ragione_sociale.charAt(0).toUpperCase();
    }
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(fornitore);
    return acc;
  }, {} as Record<string, Fornitore[]>);

  return (
    <div className="space-y-6">
      {/* Search Bar, Filters and New Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca fornitore per nome, settore, email o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 border-2 border-border rounded-lg bg-card w-full"
          />
        </div>

        {/* Filtro Forma Giuridica */}
        <Select value={formaGiuridicaFilter} onValueChange={setFormaGiuridicaFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Forma Giuridica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Forme</SelectItem>
            <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
            <SelectItem value="persona_giuridica">Persona Giuridica</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro Tipologia Settore */}
        <Select value={tipologiaSettoreFilter} onValueChange={setTipologiaSettoreFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Settore" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i Settori</SelectItem>
            {uniqueSettori.map(settore => (
              <SelectItem key={settore} value={settore}>{settore}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Provincia */}
        <Select value={provinciaFilter} onValueChange={setProvinciaFilter}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 border-2 border-border rounded-lg bg-card">
            <SelectValue placeholder="Provincia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le Province</SelectItem>
            {uniqueProvince.map(provincia => (
              <SelectItem key={provincia} value={provincia}>{provincia}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => router.push('/fornitori/nuovo')}
          className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-11 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuovo Fornitore</span>
          <span className="sm:hidden">Nuovo</span>
        </Button>
      </div>

      {/* Fornitori List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
      ) : Object.keys(fornitoriRaggruppati).length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-border bg-card/50">
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'Nessun fornitore trovato' : 'Nessun fornitore inserito'}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => router.push('/fornitori/nuovo')}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Aggiungi il primo fornitore
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {Object.entries(fornitoriRaggruppati)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, fornitoriGruppo]) => (
                <div key={letter} className="space-y-2">
                  {/* Letter Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <span className="text-xl font-bold text-emerald-600">{letter}</span>
                    </div>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Fornitori in this letter */}
                  <div className="space-y-2">
                    {fornitoriGruppo.map((fornitore) => (
                      <div
                        key={fornitore.id}
                        className="w-full p-4 rounded-lg border-2 border-border bg-card transition-all hover:border-emerald-500 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          {/* Avatar with Initials */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                            fornitore.forma_giuridica === 'persona_fisica'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {getInitials(fornitore)}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <h4 className="font-bold text-lg">
                                {getDisplayName(fornitore)}
                              </h4>
                              <span className="text-muted-foreground/60 text-base">-</span>
                              <div className="flex items-center gap-3 text-base text-muted-foreground/80">
                                {fornitore.telefono && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(fornitore.telefono!);
                                      toast.success('Telefono copiato!');
                                    }}
                                    className="hover:text-foreground hover:underline transition-colors cursor-pointer"
                                  >
                                    {fornitore.telefono}
                                  </button>
                                )}
                                {fornitore.email && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(fornitore.email!);
                                      toast.success('Email copiata!');
                                    }}
                                    className="hover:text-foreground hover:underline transition-colors cursor-pointer"
                                  >
                                    {fornitore.email}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedFornitore(fornitore);
                                setShowInfoModal(true);
                              }}
                              className="p-2 rounded-lg border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                              title="Info"
                            >
                              <Info className="h-4 w-4 text-emerald-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/fornitori/${fornitore.id}/modifica`)}
                              className="p-2 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                              title="Modifica"
                            >
                              <Edit className="h-4 w-4 text-orange-600" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedFornitore(fornitore);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                  Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} di {totalItems} elementi
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

      {/* Modals */}
      {showInfoModal && selectedFornitore && (
        <InfoFornitoreModal
          fornitore={selectedFornitore}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedFornitore(null);
          }}
        />
      )}

      {showDeleteModal && selectedFornitore && (
        <DeleteFornitoreModal
          fornitore={selectedFornitore}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedFornitore(null);
          }}
          onDelete={() => {
            loadFornitori();
            setShowDeleteModal(false);
            setSelectedFornitore(null);
          }}
        />
      )}
    </div>
  );
}
