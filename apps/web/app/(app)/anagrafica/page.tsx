'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Building2, Landmark, Plus, Search, Info, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { InfoClienteModal } from '@/components/features/anagrafica/InfoClienteModal';
import { DeleteClienteModal } from '@/components/features/anagrafica/DeleteClienteModal';
import { InfoFornitoreModal } from '@/components/features/anagrafica/InfoFornitoreModal';
import { DeleteFornitoreModal } from '@/components/features/anagrafica/DeleteFornitoreModal';

type TabType = 'clienti' | 'fornitori' | 'banche';

type Cliente = {
  id: string;
  forma_giuridica: 'persona_fisica' | 'persona_giuridica';
  nome?: string;
  cognome?: string;
  ragione_sociale?: string;
  tipologia_settore: string;
  email?: string;
  telefono?: string;
  sede_legale_citta?: string;
};

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
};

function AnagraficaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('clienti');
  const [loading, setLoading] = useState(true);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedFornitore, setSelectedFornitore] = useState<Fornitore | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Pagination states
  const [currentPageClienti, setCurrentPageClienti] = useState(1);
  const [itemsPerPageClienti, setItemsPerPageClienti] = useState(10);
  const [currentPageFornitori, setCurrentPageFornitori] = useState(1);
  const [itemsPerPageFornitori, setItemsPerPageFornitori] = useState(10);

  // Set active tab from URL parameter on mount
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && (tab === 'clienti' || tab === 'fornitori' || tab === 'banche')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === 'clienti') {
      loadClienti();
    } else if (activeTab === 'fornitori') {
      loadFornitori();
    }
  }, [activeTab]);

  const loadClienti = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('clienti')
        .select('*')
        .order('cognome', { ascending: true, nullsFirst: false })
        .order('ragione_sociale', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setClienti(data || []);
    } catch {

      toast.error('Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  const loadFornitori = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('fornitori')
        .select('*')
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

  const getDisplayName = (cliente: Cliente) => {
    if (cliente.forma_giuridica === 'persona_fisica') {
      return `${cliente.cognome || ''} ${cliente.nome || ''}`.trim();
    }
    return cliente.ragione_sociale || 'N/A';
  };

  const getInitials = (cliente: Cliente) => {
    if (cliente.forma_giuridica === 'persona_fisica') {
      const nome = cliente.nome?.charAt(0).toUpperCase() || '';
      const cognome = cliente.cognome?.charAt(0).toUpperCase() || '';
      return `${nome}${cognome}`;
    }
    return cliente.ragione_sociale?.substring(0, 2).toUpperCase() || '??';
  };

  const getFornitoreDisplayName = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      return `${fornitore.cognome || ''} ${fornitore.nome || ''}`.trim();
    }
    return fornitore.ragione_sociale || 'N/A';
  };

  const getFornitoreInitials = (fornitore: Fornitore) => {
    if (fornitore.forma_giuridica === 'persona_fisica') {
      const nome = fornitore.nome?.charAt(0).toUpperCase() || '';
      const cognome = fornitore.cognome?.charAt(0).toUpperCase() || '';
      return `${nome}${cognome}`;
    }
    return fornitore.ragione_sociale?.substring(0, 2).toUpperCase() || '??';
  };

  // Filter clienti based on search
  const clientiFiltrati = clienti.filter(cliente => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const displayName = getDisplayName(cliente).toLowerCase();

    return (
      displayName.includes(searchLower) ||
      cliente.tipologia_settore?.toLowerCase().includes(searchLower) ||
      cliente.email?.toLowerCase().includes(searchLower) ||
      cliente.telefono?.includes(searchTerm)
    );
  });

  // Group clienti alphabetically - unused for now but kept for future feature
  /*
  const clientiRaggruppati = clientiFiltrati.reduce((acc, cliente) => {
    let firstLetter = '#';
    if (cliente.forma_giuridica === 'persona_fisica' && cliente.cognome) {
      firstLetter = cliente.cognome.charAt(0).toUpperCase();
    } else if (cliente.ragione_sociale) {
      firstLetter = cliente.ragione_sociale.charAt(0).toUpperCase();
    }

    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(cliente);
    return acc;
  }, {} as Record<string, Cliente[]>);
  */

  // Filter fornitori based on search
  const fornitoriFiltrati = fornitori.filter(fornitore => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const displayName = getFornitoreDisplayName(fornitore).toLowerCase();

    return (
      displayName.includes(searchLower) ||
      fornitore.tipologia_settore?.toLowerCase().includes(searchLower) ||
      fornitore.email?.toLowerCase().includes(searchLower) ||
      fornitore.telefono?.includes(searchTerm)
    );
  });

  // Group fornitori alphabetically - unused for now but kept for future feature
  /*
  const fornitoriRaggruppati = fornitoriFiltrati.reduce((acc, fornitore) => {
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
  */

  // Pagination for clienti
  const totalClienti = clientiFiltrati.length;
  const totalPagesClienti = Math.ceil(totalClienti / itemsPerPageClienti);
  const startIndexClienti = (currentPageClienti - 1) * itemsPerPageClienti;
  const endIndexClienti = startIndexClienti + itemsPerPageClienti;
  const clientiPaginati = clientiFiltrati.slice(startIndexClienti, endIndexClienti);

  // Regroup paginated clienti
  const clientiRaggruppatiPaginati = clientiPaginati.reduce((acc, cliente) => {
    let firstLetter = '#';
    if (cliente.forma_giuridica === 'persona_fisica' && cliente.cognome) {
      firstLetter = cliente.cognome.charAt(0).toUpperCase();
    } else if (cliente.ragione_sociale) {
      firstLetter = cliente.ragione_sociale.charAt(0).toUpperCase();
    }
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(cliente);
    return acc;
  }, {} as Record<string, Cliente[]>);

  // Pagination for fornitori
  const totalFornitori = fornitoriFiltrati.length;
  const totalPagesFornitori = Math.ceil(totalFornitori / itemsPerPageFornitori);
  const startIndexFornitori = (currentPageFornitori - 1) * itemsPerPageFornitori;
  const endIndexFornitori = startIndexFornitori + itemsPerPageFornitori;
  const fornitoriPaginati = fornitoriFiltrati.slice(startIndexFornitori, endIndexFornitori);

  // Regroup paginated fornitori
  const fornitoriRaggruppatiPaginati = fornitoriPaginati.reduce((acc, fornitore) => {
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

  const tabs = [
    { id: 'clienti' as TabType, label: 'Clienti', icon: Users, color: 'emerald' },
    { id: 'fornitori' as TabType, label: 'Fornitori', icon: Building2, color: 'blue' },
    { id: 'banche' as TabType, label: 'Banche', icon: Landmark, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb pageName="Anagrafica" />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Anagrafica</h2>
        <p className="text-muted-foreground">
          Gestisci clienti, fornitori e banche
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="flex border-b-2 border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 p-4 font-semibold transition-all duration-[450ms] ease-in-out ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-600 border-b-4'
                    : 'text-muted-foreground hover:bg-muted/20 border-b-4 border-transparent'
                }`}
              >
                <Icon className="h-5 w-5 transition-transform duration-[450ms] ease-in-out" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Clienti Tab */}
          {activeTab === 'clienti' && (
            <div className="space-y-6 animate-in fade-in duration-[450ms]">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {clientiFiltrati.length} {clientiFiltrati.length === 1 ? 'cliente' : 'clienti'}
                </p>
                <Button
                  onClick={() => router.push('/anagrafica/clienti/nuovo')}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Nuovo Cliente
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Cerca cliente per nome, settore, email o telefono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-border"
                />
              </div>

              {/* Clienti List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Caricamento...</p>
                </div>
              ) : Object.keys(clientiRaggruppatiPaginati).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Nessun cliente trovato' : 'Nessun cliente inserito'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => router.push('/anagrafica/clienti/nuovo')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Aggiungi il primo cliente
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(clientiRaggruppatiPaginati)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([letter, clientiGruppo]) => (
                      <div key={letter} className="space-y-2">
                        {/* Letter Header */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <span className="text-xl font-bold text-emerald-600">{letter}</span>
                          </div>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Clients in this letter */}
                        <div className="space-y-2">
                          {clientiGruppo.map((cliente) => (
                            <div
                              key={cliente.id}
                              className="w-full p-4 rounded-lg border-2 border-border bg-background transition-all hover:border-emerald-500 hover:shadow-md"
                            >
                              <div className="flex items-center gap-4">
                                {/* Avatar with Initials */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                                  cliente.forma_giuridica === 'persona_fisica'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {getInitials(cliente)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-lg">
                                      {getDisplayName(cliente)}
                                    </h4>
                                    <span className="text-muted-foreground/60 text-base">-</span>
                                    <div className="flex items-center gap-3 text-base text-muted-foreground/80">
                                      {cliente.telefono && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(cliente.telefono!);
                                            toast.success('Telefono copiato!');
                                          }}
                                          className="hover:text-foreground hover:underline transition-colors cursor-pointer"
                                        >
                                          {cliente.telefono}
                                        </button>
                                      )}
                                      {cliente.email && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(cliente.email!);
                                            toast.success('Email copiata!');
                                          }}
                                          className="hover:text-foreground hover:underline transition-colors cursor-pointer"
                                        >
                                          {cliente.email}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setSelectedCliente(cliente);
                                      setShowInfoModal(true);
                                    }}
                                    className="p-2 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    title="Info"
                                  >
                                    <Info className="h-4 w-4 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/anagrafica/clienti/${cliente.id}/modifica`)}
                                    className="p-2 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
                                    title="Modifica"
                                  >
                                    <Edit className="h-4 w-4 text-orange-600" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCliente(cliente);
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
              )}

              {/* Pagination Clienti */}
              {totalClienti > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="flex items-center justify-between px-4 py-4">
                    {/* Left side - Info and Items per page */}
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {startIndexClienti + 1}-{Math.min(endIndexClienti, totalClienti)} di {totalClienti} elementi
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Elementi per pagina:</span>
                        <Select
                          value={itemsPerPageClienti.toString()}
                          onValueChange={(value) => {
                            setItemsPerPageClienti(Number(value));
                            setCurrentPageClienti(1);
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
                        onClick={() => setCurrentPageClienti(prev => Math.max(1, prev - 1))}
                        disabled={currentPageClienti === 1}
                        className="h-9 w-9 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPagesClienti }, (_, i) => i + 1)
                          .filter(page => {
                            if (page === 1 || page === totalPagesClienti) return true;
                            if (page >= currentPageClienti - 1 && page <= currentPageClienti + 1) return true;
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
                                  variant={currentPageClienti === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPageClienti(page)}
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
                        onClick={() => setCurrentPageClienti(prev => Math.min(totalPagesClienti, prev + 1))}
                        disabled={currentPageClienti === totalPagesClienti}
                        className="h-9 w-9 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Fornitori Tab */}
          {activeTab === 'fornitori' && (
            <div className="space-y-6 animate-in fade-in duration-[450ms]">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {fornitoriFiltrati.length} {fornitoriFiltrati.length === 1 ? 'fornitore' : 'fornitori'}
                </p>
                <Button
                  onClick={() => router.push('/anagrafica/fornitori/nuovo')}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Nuovo Fornitore
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Cerca fornitore per nome, settore, email o telefono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-border"
                />
              </div>

              {/* Fornitori List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Caricamento...</p>
                </div>
              ) : Object.keys(fornitoriRaggruppatiPaginati).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'Nessun fornitore trovato' : 'Nessun fornitore inserito'}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={() => router.push('/anagrafica/fornitori/nuovo')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Aggiungi il primo fornitore
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(fornitoriRaggruppatiPaginati)
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
                              className="w-full p-4 rounded-lg border-2 border-border bg-background transition-all hover:border-emerald-500 hover:shadow-md"
                            >
                              <div className="flex items-center gap-4">
                                {/* Avatar with Initials */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                                  fornitore.forma_giuridica === 'persona_fisica'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {getFornitoreInitials(fornitore)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-lg">
                                      {getFornitoreDisplayName(fornitore)}
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
                                    className="p-2 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    title="Info"
                                  >
                                    <Info className="h-4 w-4 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={() => router.push(`/anagrafica/fornitori/${fornitore.id}/modifica`)}
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
              )}

              {/* Pagination Fornitori */}
              {totalFornitori > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="flex items-center justify-between px-4 py-4">
                    {/* Left side - Info and Items per page */}
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-muted-foreground">
                        Mostrando {startIndexFornitori + 1}-{Math.min(endIndexFornitori, totalFornitori)} di {totalFornitori} elementi
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Elementi per pagina:</span>
                        <Select
                          value={itemsPerPageFornitori.toString()}
                          onValueChange={(value) => {
                            setItemsPerPageFornitori(Number(value));
                            setCurrentPageFornitori(1);
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
                        onClick={() => setCurrentPageFornitori(prev => Math.max(1, prev - 1))}
                        disabled={currentPageFornitori === 1}
                        className="h-9 w-9 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPagesFornitori }, (_, i) => i + 1)
                          .filter(page => {
                            if (page === 1 || page === totalPagesFornitori) return true;
                            if (page >= currentPageFornitori - 1 && page <= currentPageFornitori + 1) return true;
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
                                  variant={currentPageFornitori === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPageFornitori(page)}
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
                        onClick={() => setCurrentPageFornitori(prev => Math.min(totalPagesFornitori, prev + 1))}
                        disabled={currentPageFornitori === totalPagesFornitori}
                        className="h-9 w-9 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Banche Tab */}
          {activeTab === 'banche' && (
            <div className="text-center py-12 animate-in fade-in duration-300">
              <Landmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Sezione banche in sviluppo...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showInfoModal && selectedCliente && activeTab === 'clienti' && (
        <InfoClienteModal
          cliente={selectedCliente}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedCliente(null);
          }}
        />
      )}

      {showDeleteModal && selectedCliente && activeTab === 'clienti' && (
        <DeleteClienteModal
          cliente={selectedCliente}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCliente(null);
          }}
          onDelete={() => {
            loadClienti();
            setShowDeleteModal(false);
            setSelectedCliente(null);
          }}
        />
      )}

      {showInfoModal && selectedFornitore && activeTab === 'fornitori' && (
        <InfoFornitoreModal
          fornitore={selectedFornitore}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedFornitore(null);
          }}
        />
      )}

      {showDeleteModal && selectedFornitore && activeTab === 'fornitori' && (
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

export default function AnagraficaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Caricamento...</div>}>
      <AnagraficaPageContent />
    </Suspense>
  );
}
