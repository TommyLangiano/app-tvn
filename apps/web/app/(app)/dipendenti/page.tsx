'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Users, Plus, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ===== TYPES =====

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  mansione: string | null;
  qualifica: string | null;
  stato: string;
  data_assunzione: string | null;
  user_id: string | null;
  role_name: string | null;
  avatar_url: string | null;
  slug: string | null;
}

type SortField = 'nome' | 'mansione' | 'qualifica' | 'stato' | 'data_assunzione' | 'email';
type SortDirection = 'asc' | 'desc';

// ===== COMPONENT =====

export default function DipendentiPage() {
  const router = useRouter();

  // Data
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statoFilter, setStatoFilter] = useState('tutti');
  const [qualificaFilter, setQualificaFilter] = useState('tutti');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Advanced Filters
  const [mansioneFilter, setMansioneFilter] = useState('tutti');
  const [accountFilter, setAccountFilter] = useState('tutti');
  const [ruoloFilter, setRuoloFilter] = useState('tutti');
  const [dateRangeAssunzione, setDateRangeAssunzione] = useState<DateRange | undefined>();

  // Sorting
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Selection

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // ===== LOAD DATA =====

  useEffect(() => {
    loadDipendenti();
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
  }, []);

  const loadDipendenti = async () => {
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
        .from('dipendenti')
        .select(`
          id,
          nome,
          cognome,
          email,
          telefono,
          mansione,
          qualifica,
          stato,
          data_assunzione,
          user_id,
          avatar_url,
          slug
        `)
        .eq('tenant_id', userTenants.tenant_id)
        .order('cognome, nome');

      if (error) throw error;

      // Load role names separately for dipendenti with user_id
      const dipendentiWithUsers = (data || []).filter(d => d.user_id);
      const userIds = dipendentiWithUsers.map(d => d.user_id);

      let rolesMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, custom_role:custom_roles(name)')
          .in('id', userIds);

        if (usersData) {
          rolesMap = usersData.reduce((acc: Record<string, string>, user: any) => {
            acc[user.id] = user.custom_role?.name || null;
            return acc;
          }, {});
        }
      }

      const formattedData = (data || []).map((d: any) => ({
        ...d,
        role_name: d.user_id ? rolesMap[d.user_id] || null : null,
      }));

      setDipendenti(formattedData);
    } catch (error) {
      console.error('Error loading dipendenti:', error);
      toast.error('Errore nel caricamento dei dipendenti');
    } finally {
      setLoading(false);
    }
  };

  // ===== HELPERS =====

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getDisplayName = (dipendente: Dipendente) => {
    return `${dipendente.cognome} ${dipendente.nome}`.trim();
  };

  const getInitials = (dipendente: Dipendente) => {
    const nome = dipendente.nome?.[0] || '';
    const cognome = dipendente.cognome?.[0] || '';
    return (cognome + nome).toUpperCase();
  };

  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    const supabase = createClient();
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
    return data.publicUrl;
  };

  // Get unique values for filters
  const uniqueMansioni = Array.from(new Set(dipendenti.map(d => d.mansione).filter(Boolean)));
  const uniqueQualifiche = Array.from(new Set(dipendenti.map(d => d.qualifica).filter(Boolean)));
  const uniqueRuoli = Array.from(new Set(dipendenti.map(d => d.role_name).filter(Boolean)));

  // ===== FILTERING & SORTING =====

  const filteredAndSortedDipendenti = useMemo(() => {
    let result = [...dipendenti];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(dipendente => {
        const displayName = getDisplayName(dipendente).toLowerCase();
        return (
          displayName.includes(searchLower) ||
          dipendente.qualifica?.toLowerCase().includes(searchLower) ||
          dipendente.mansione?.toLowerCase().includes(searchLower) ||
          dipendente.email?.toLowerCase().includes(searchLower) ||
          dipendente.telefono?.includes(searchTerm)
        );
      });
    }

    // Basic filters
    if (statoFilter !== 'tutti') {
      result = result.filter(d => d.stato === statoFilter);
    }

    if (qualificaFilter !== 'tutti') {
      result = result.filter(d => d.qualifica === qualificaFilter);
    }

    // Advanced filters
    if (mansioneFilter !== 'tutti') {
      result = result.filter(d => d.mansione === mansioneFilter);
    }

    if (accountFilter !== 'tutti') {
      if (accountFilter === 'con_account') {
        result = result.filter(d => d.user_id !== null);
      } else {
        result = result.filter(d => d.user_id === null);
      }
    }

    if (ruoloFilter !== 'tutti') {
      result = result.filter(d => d.role_name === ruoloFilter);
    }

    if (dateRangeAssunzione?.from) {
      result = result.filter(d =>
        d.data_assunzione && new Date(d.data_assunzione) >= dateRangeAssunzione.from!
      );
    }

    if (dateRangeAssunzione?.to) {
      result = result.filter(d =>
        d.data_assunzione && new Date(d.data_assunzione) <= dateRangeAssunzione.to!
      );
    }

    // Sorting
    result.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'nome':
          aVal = getDisplayName(a).toLowerCase();
          bVal = getDisplayName(b).toLowerCase();
          break;
        case 'mansione':
          aVal = a.mansione?.toLowerCase() || '';
          bVal = b.mansione?.toLowerCase() || '';
          break;
        case 'qualifica':
          aVal = a.qualifica?.toLowerCase() || '';
          bVal = b.qualifica?.toLowerCase() || '';
          break;
        case 'stato':
          aVal = a.stato?.toLowerCase() || '';
          bVal = b.stato?.toLowerCase() || '';
          break;
        case 'data_assunzione':
          aVal = a.data_assunzione ? new Date(a.data_assunzione).getTime() : 0;
          bVal = b.data_assunzione ? new Date(b.data_assunzione).getTime() : 0;
          break;
        case 'email':
          aVal = a.email?.toLowerCase() || '';
          bVal = b.email?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [
    dipendenti,
    searchTerm,
    statoFilter,
    qualificaFilter,
    mansioneFilter,
    accountFilter,
    ruoloFilter,
    dateRangeAssunzione,
    sortField,
    sortDirection,
  ]);

  // Pagination
  const paginatedDipendenti = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDipendenti.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDipendenti, currentPage, itemsPerPage]);

  // ===== HANDLERS =====

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };


  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (format === 'csv') {
      const headers = ['Nome', 'Cognome', 'Email', 'Telefono', 'Mansione', 'Qualifica', 'Stato', 'Data Assunzione', 'Account', 'Ruolo'];
      const rows = filteredAndSortedDipendenti.map(d => [
        d.nome,
        d.cognome,
        d.email || '',
        d.telefono || '',
        d.mansione || '',
        d.qualifica || '',
        d.stato,
        d.data_assunzione ? formatDate(d.data_assunzione) : '',
        d.user_id ? 'Sì' : 'No',
        d.role_name || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `dipendenti_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast.success('Export CSV completato');
    } else {
      toast.info(`Export ${format.toUpperCase()} in sviluppo`);
    }
  };

  const resetAdvancedFilters = () => {
    setMansioneFilter('tutti');
    setAccountFilter('tutti');
    setRuoloFilter('tutti');
    setDateRangeAssunzione(undefined);
  };

  const hasActiveAdvancedFilters =
    mansioneFilter !== 'tutti' ||
    accountFilter !== 'tutti' ||
    ruoloFilter !== 'tutti' ||
    dateRangeAssunzione?.from !== undefined ||
    dateRangeAssunzione?.to !== undefined;

  // ===== DATATABLE COLUMNS =====

  const columns: DataTableColumn<Dipendente>[] = [
    {
      key: 'avatar',
      label: '',
      sortable: false,
      width: 'w-12',
      className: 'px-2',
      render: (dipendente) => (
        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-sm overflow-hidden">
          {getAvatarUrl(dipendente.avatar_url) ? (
            <img
              src={getAvatarUrl(dipendente.avatar_url)!}
              alt={getDisplayName(dipendente)}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(dipendente)
          )}
        </div>
      ),
    },
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (dipendente) => (
        <div className="text-sm text-foreground font-medium">
          {getDisplayName(dipendente)}
        </div>
      ),
    },
    {
      key: 'mansione',
      label: 'Mansione',
      sortable: true,
      render: (dipendente) => (
        <div className="text-sm text-foreground">
          {dipendente.mansione || '-'}
        </div>
      ),
    },
    {
      key: 'stato',
      label: 'Stato',
      sortable: true,
      className: 'pl-4 pr-2',
      render: (dipendente) => (
        <span
          className={`inline-flex items-center px-3 py-1 rounded-sm text-xs font-medium ${
            dipendente.stato === 'attivo'
              ? 'bg-green-100 text-green-700'
              : dipendente.stato === 'licenziato'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {dipendente.stato === 'attivo' ? 'Attivo' : dipendente.stato === 'licenziato' ? 'Licenziato' : dipendente.stato}
        </span>
      ),
    },
    {
      key: 'data_assunzione',
      label: 'Data Assunzione',
      sortable: true,
      render: (dipendente) => (
        <div className="text-sm text-foreground">
          {dipendente.data_assunzione ? formatDate(dipendente.data_assunzione) : '-'}
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (dipendente) => (
        <div className="text-sm text-foreground">
          {dipendente.email || '-'}
        </div>
      ),
    },
    {
      key: 'account',
      label: 'Account',
      sortable: false,
      render: (dipendente) => (
        <div className="text-sm text-foreground">
          {dipendente.user_id ? (
            <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium bg-blue-100 text-blue-700">
              Attivo
            </span>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      key: 'role_name',
      label: 'Ruolo',
      sortable: false,
      render: (dipendente) => (
        <div className="text-sm text-foreground">
          {dipendente.role_name || '-'}
        </div>
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

  // ===== RENDER =====

  return (
    <div className="space-y-6">
      {/* Navbar Portal Button */}
      {navbarActionsContainer &&
        createPortal(
          <Button
            onClick={() => router.push('/dipendenti/nuovo')}
            className="gap-2 h-10 rounded-sm"
          >
            <Plus className="h-4 w-4" />
            Nuovo Dipendente
          </Button>,
          navbarActionsContainer
        )}

      {/* DataTable */}
      <DataTable<Dipendente>
        data={paginatedDipendenti}
        columns={columns}
        keyField="id"
        loading={loading}
        emptyIcon={Users}
        emptyTitle="Nessun dipendente trovato"
        emptyDescription={searchTerm ? 'Prova con una ricerca diversa' : 'Inizia aggiungendo un nuovo dipendente'}
        // Search
        searchable
        searchPlaceholder="Cerca dipendenti..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        // Toolbar Filters
        toolbarFilters={
          <>
            <Select value={statoFilter} onValueChange={setStatoFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutti gli stati</SelectItem>
                <SelectItem value="attivo">Attivo</SelectItem>
                <SelectItem value="licenziato">Licenziato</SelectItem>
              </SelectContent>
            </Select>

            <Select value={qualificaFilter} onValueChange={setQualificaFilter}>
              <SelectTrigger className="h-11 w-full lg:w-[180px] border-2 border-border rounded-sm bg-white">
                <SelectValue placeholder="Qualifica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutti">Tutte le qualifiche</SelectItem>
                {uniqueQualifiche.map(q => (
                  <SelectItem key={q} value={q!}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        // Advanced Filters
        advancedFilters={
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Filtri Avanzati</h3>
              <Button variant="ghost" size="sm" onClick={resetAdvancedFilters}>
                Reset
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={mansioneFilter} onValueChange={setMansioneFilter}>
                <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Mansione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutte le mansioni</SelectItem>
                  {uniqueMansioni.map(m => (
                    <SelectItem key={m} value={m!}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti</SelectItem>
                  <SelectItem value="con_account">Con Account</SelectItem>
                  <SelectItem value="senza_account">Senza Account</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ruoloFilter} onValueChange={setRuoloFilter}>
                <SelectTrigger className="h-11 border-2 border-border rounded-sm bg-white">
                  <SelectValue placeholder="Ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i ruoli</SelectItem>
                  {uniqueRuoli.map(r => (
                    <SelectItem key={r} value={r!}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DateRangePicker
                date={dateRangeAssunzione}
                onDateChange={setDateRangeAssunzione}
                placeholder="Data Assunzione"
                className="h-11 border-2 border-border rounded-sm bg-white"
              />
            </div>
          </div>
        }
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        hasActiveAdvancedFilters={hasActiveAdvancedFilters}
        // Sorting
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        // Export
        exportButton={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 gap-2 border-2 border-border rounded-sm bg-white">
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Esporta</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Esporta CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>Esporta Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>Esporta PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        // Pagination
        currentPage={currentPage}
        pageSize={itemsPerPage}
        totalItems={filteredAndSortedDipendenti.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setItemsPerPage(size);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        // Row Click
        onRowClick={(dipendente) => router.push(`/dipendenti/${dipendente.slug || dipendente.id}`)}
      />
    </div>
  );
}
