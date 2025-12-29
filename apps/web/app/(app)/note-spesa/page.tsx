'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Plus, Search, FileText, ChevronRight, User, Calendar } from 'lucide-react';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabsFilter, TabItem } from '@/components/ui/tabs-filter';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { NuovaNotaSpesaModal } from '@/components/features/note-spesa/NuovaNotaSpesaModal';
import { NotaSpesaDetailSheet } from '@/components/features/note-spesa/NotaSpesaDetailSheet';
import { DeleteNotaSpesaModal } from '@/components/features/note-spesa/DeleteNotaSpesaModal';
import { cn } from '@/lib/utils';

type TabType = 'tutte' | 'in_attesa' | 'approvate' | 'rifiutate';

interface NotaSpesa {
  id: string;
  numero_nota?: string;
  dipendente_id: string;
  commessa_id: string;
  data_spesa?: string;
  data_nota?: string;
  importo: number;
  categoria: string;
  descrizione?: string | null;
  allegato_url?: string | null;
  allegati?: any[];
  stato: 'in_attesa' | 'da_approvare' | 'approvata' | 'rifiutata';
  note_approvazione?: string | null;
  approvata_da?: string | null;
  approvata_il?: string | null;
  created_at: string;
  updated_at?: string;
  dipendenti?: {
    id: string;
    nome: string;
    cognome: string;
    email?: string;
  };
  commesse?: {
    id: string;
    nome_commessa?: string;
    titolo?: string;
    codice_commessa?: string;
  };
}

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
}

interface Commessa {
  id: string;
  nome_commessa: string;
  codice_commessa?: string;
}

export default function NoteSpesaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tutte');
  const [noteSpese, setNoteSpese] = useState<NotaSpesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);

  // Filters
  const [filtroCategoria, setFiltroCategoria] = useState<string>('tutte');
  const [filtroDipendente, setFiltroDipendente] = useState<string>('tutti');
  const [filtroCommessa, setFiltroCommessa] = useState<string>('tutte');

  // Data for filters
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);

  // Modals & Sheets
  const [showNuovaModal, setShowNuovaModal] = useState(false);
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const CATEGORIE_NOTA_SPESA = [
    'Carburante',
    'Vitto',
    'Alloggio',
    'Trasporti',
    'Materiali',
    'Altro'
  ];

  useEffect(() => {
    loadData();
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const userTenant = tenants && tenants.length > 0 ? tenants[0] : null;
      if (!userTenant) return;

      // Load note spese
      const { data: noteData } = await supabase
        .from('note_spesa')
        .select(`
          *,
          dipendenti!note_spesa_dipendente_id_fkey (
            id,
            nome,
            cognome,
            email
          ),
          commesse!note_spesa_commessa_id_fkey (
            id,
            nome_commessa,
            codice_commessa
          )
        `)
        .eq('tenant_id', userTenant.tenant_id)
        .order('created_at', { ascending: false });

      setNoteSpese(noteData || []);

      // Load dipendenti for filter
      const { data: dipData } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome')
        .eq('tenant_id', userTenant.tenant_id)
        .order('cognome, nome');

      setDipendenti(dipData || []);

      // Load commesse for filter
      const { data: commData } = await supabase
        .from('commesse')
        .select('id, nome_commessa, codice_commessa')
        .eq('tenant_id', userTenant.tenant_id)
        .order('nome_commessa');

      setCommesse(commData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Filter logic
  const filteredNoteSpese = () => {
    let filtered = [...noteSpese];

    // Tab filter
    if (activeTab === 'in_attesa') {
      filtered = filtered.filter(n => n.stato === 'in_attesa' || n.stato === 'da_approvare');
    } else if (activeTab === 'approvate') {
      filtered = filtered.filter(n => n.stato === 'approvata');
    } else if (activeTab === 'rifiutate') {
      filtered = filtered.filter(n => n.stato === 'rifiutata');
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => {
        const dipendente = n.dipendenti ? `${n.dipendenti.nome} ${n.dipendenti.cognome}`.toLowerCase() : '';
        const commessa = n.commesse?.nome_commessa?.toLowerCase() || '';
        const categoria = n.categoria.toLowerCase();
        const descrizione = n.descrizione?.toLowerCase() || '';
        const numeroNota = n.numero_nota?.toLowerCase() || '';

        return dipendente.includes(query) ||
               commessa.includes(query) ||
               categoria.includes(query) ||
               descrizione.includes(query) ||
               numeroNota.includes(query);
      });
    }

    // Category filter
    if (filtroCategoria !== 'tutte') {
      filtered = filtered.filter(n => n.categoria === filtroCategoria);
    }

    // Dipendente filter
    if (filtroDipendente !== 'tutti') {
      filtered = filtered.filter(n => n.dipendente_id === filtroDipendente);
    }

    // Commessa filter
    if (filtroCommessa !== 'tutte') {
      filtered = filtered.filter(n => n.commessa_id === filtroCommessa);
    }

    return filtered;
  };

  const allFilteredNoteSpese = filteredNoteSpese();
  const totalNoteSpese = allFilteredNoteSpese.length;
  const totalPages = Math.ceil(totalNoteSpese / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNoteSpese = allFilteredNoteSpese.slice(startIndex, endIndex);

  const counts = {
    tutte: noteSpese.length,
    in_attesa: noteSpese.filter(n => n.stato === 'in_attesa' || n.stato === 'da_approvare').length,
    approvate: noteSpese.filter(n => n.stato === 'approvata').length,
    rifiutate: noteSpese.filter(n => n.stato === 'rifiutata').length,
  };

  const tabs: TabItem<TabType>[] = [
    { value: 'tutte', label: 'Tutte', count: counts.tutte },
    { value: 'in_attesa', label: 'In Attesa', count: counts.in_attesa },
    { value: 'approvate', label: 'Approvate', count: counts.approvate },
    { value: 'rifiutate', label: 'Rifiutate', count: counts.rifiutate },
  ];

  const handleRowClick = (notaSpesa: NotaSpesa) => {
    setSelectedNotaSpesa(notaSpesa);
    setIsSheetOpen(true);
  };

  const handleDelete = () => {
    setIsSheetOpen(false);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteModal(false);
    setSelectedNotaSpesa(null);
    loadData();
  };

  const handleUpdate = () => {
    loadData();
  };

  const getStatoBadge = (stato: string) => {
    const badges = {
      'in_attesa': { label: 'In Attesa', class: 'bg-yellow-100 text-yellow-700' },
      'da_approvare': { label: 'Da Approvare', class: 'bg-yellow-100 text-yellow-700' },
      'approvata': { label: 'Approvata', class: 'bg-green-100 text-green-700' },
      'rifiutata': { label: 'Rifiutata', class: 'bg-red-100 text-red-700' },
    };
    const badge = badges[stato as keyof typeof badges] || { label: stato, class: 'bg-gray-100 text-gray-700' };
    return (
      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', badge.class)}>
        {badge.label}
      </span>
    );
  };

  // DataTable columns
  const columns: DataTableColumn<NotaSpesa>[] = [
    {
      key: 'data',
      label: 'Data',
      sortable: true,
      width: 'w-36',
      render: (nota) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground">
            {formatDate(nota.data_spesa || nota.data_nota || nota.created_at)}
          </span>
        </div>
      ),
    },
    {
      key: 'dipendente',
      label: 'Dipendente',
      sortable: true,
      width: 'w-auto',
      render: (nota) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground">
            {nota.dipendenti ? `${nota.dipendenti.cognome} ${nota.dipendenti.nome}` : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'commessa',
      label: 'Commessa',
      sortable: true,
      width: 'w-auto',
      render: (nota) => (
        <span className="text-sm text-foreground">
          {nota.commesse?.nome_commessa || nota.commesse?.titolo || 'N/A'}
        </span>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      sortable: true,
      width: 'w-32',
      render: (nota) => (
        <span className="text-sm text-foreground">
          {nota.categoria}
        </span>
      ),
    },
    {
      key: 'importo',
      label: 'Importo',
      sortable: true,
      width: 'w-32',
      render: (nota) => (
        <span className="text-sm font-bold text-foreground">
          {formatCurrency(nota.importo)}
        </span>
      ),
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: false,
      width: 'w-36',
      render: (nota) => getStatoBadge(nota.stato),
    },
    {
      key: 'allegato',
      label: 'Allegato',
      sortable: false,
      width: 'w-24',
      render: (nota) => (
        <>
          {(nota.allegato_url || (nota.allegati && nota.allegati.length > 0)) && (
            <div className="flex items-center justify-center">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
          )}
        </>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Note Spesa</h1>
            <p className="text-sm text-muted-foreground">
              Gestisci le note spesa dei dipendenti
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabsFilter<TabType>
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per dipendente, commessa, categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-2"
          />
        </div>

        {/* Category filter */}
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-2">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte le categorie</SelectItem>
            {CATEGORIE_NOTA_SPESA.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Dipendente filter */}
        <Select value={filtroDipendente} onValueChange={setFiltroDipendente}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-2">
            <SelectValue placeholder="Dipendente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i dipendenti</SelectItem>
            {dipendenti.map((dip) => (
              <SelectItem key={dip.id} value={dip.id}>
                {dip.cognome} {dip.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Commessa filter */}
        <Select value={filtroCommessa} onValueChange={setFiltroCommessa}>
          <SelectTrigger className="w-full sm:w-48 bg-white border-2">
            <SelectValue placeholder="Commessa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutte">Tutte le commesse</SelectItem>
            {commesse.map((com) => (
              <SelectItem key={com.id} value={com.id}>
                {com.nome_commessa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DataTable */}
      <DataTable
        data={paginatedNoteSpese}
        columns={columns}
        loading={loading}
        onRowClick={handleRowClick}
        emptyTitle="Nessuna nota spesa trovata"
        emptyDescription="Non ci sono note spesa da visualizzare"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1} - {Math.min(endIndex, totalNoteSpese)} di {totalNoteSpese} note spesa
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Precedente
            </Button>
            <div className="text-sm">
              Pagina {currentPage} di {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Successiva
            </Button>
          </div>
        </div>
      )}

      {/* Navbar Actions - Portal */}
      {navbarActionsContainer &&
        createPortal(
          <Button
            onClick={() => setShowNuovaModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuova Nota Spesa
          </Button>,
          navbarActionsContainer
        )}

      {/* Nuova Nota Spesa Modal */}
      {showNuovaModal && (
        <NuovaNotaSpesaModal
          onClose={() => setShowNuovaModal(false)}
          onSuccess={() => {
            setShowNuovaModal(false);
            loadData();
          }}
        />
      )}

      {/* Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden">
          {selectedNotaSpesa && (
            <NotaSpesaDetailSheet
              notaSpesa={selectedNotaSpesa}
              onClose={() => setIsSheetOpen(false)}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Modal */}
      {showDeleteModal && selectedNotaSpesa && createPortal(
        <DeleteNotaSpesaModal
          notaSpesa={selectedNotaSpesa}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDeleteConfirm}
        />,
        document.body
      )}
    </div>
  );
}
