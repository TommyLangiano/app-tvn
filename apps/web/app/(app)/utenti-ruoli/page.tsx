'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  Lock,
  Eye,
  Crown,
  HardHat,
  Briefcase,
  Calculator,
  FileText,
  Wrench,
  ClipboardList,
  UserCircle,
  Building2,
  Headphones,
  Settings,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/common/UserAvatar';
import { UserStatusBadge } from '@/components/common/UserStatusBadge';
import { RoleBadge } from '@/components/common/RoleBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { getTenantUsers } from '@/lib/users/profiles';
import type { UserListItem } from '@/types/user-profile';
import { getTenantRoles, getSystemRoles, getCustomRoles, getRoleUserCount } from '@/lib/roles';
import type { CustomRole } from '@/lib/roles';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DeleteRoleModal } from '@/components/features/roles/DeleteRoleModal';

export default function GestioneUtentiPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();

  // Tab state - leggi da URL query params
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'utenti');

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Roles state
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [systemRoles, setSystemRoles] = useState<CustomRole[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);

  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtri toggle
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
    loadRoles();
  }, []);

  // Aggiorna il tab quando cambia il parametro URL
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const loadCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch {
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getTenantUsers();
      setUsers(usersData);
    } catch {
      toast.error('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      const [allRoles, sysRoles, custRoles] = await Promise.all([
        getTenantRoles(),
        getSystemRoles(),
        getCustomRoles(),
      ]);
      setRoles(allRoles);
      setSystemRoles(sysRoles);
      setCustomRoles(custRoles);
    } catch {
      toast.error('Errore nel caricamento dei ruoli');
    } finally {
      setRolesLoading(false);
    }
  };


  // Filtra utenti
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Escludi l'utente corrente dalla lista
      if (currentUserId && user.id === currentUserId) {
        return false;
      }

      // Filtro ricerca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          user.email?.toLowerCase().includes(searchLower) ||
          user.full_name?.toLowerCase().includes(searchLower) ||
          user.position?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro ruolo
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      // Filtro stato
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && (!user.is_active || !user.is_active_in_tenant)) {
          return false;
        }
        if (statusFilter === 'inactive' && (user.is_active && user.is_active_in_tenant)) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter, currentUserId]);

  // Calcola paginazione
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter, searchTerm]);

  // Helper per icona ruolo
  const getRoleIcon = (role: any) => {
    // Se è un ruolo di sistema, usa l'icona predefinita
    if (role.is_system_role && role.system_role_key) {
      switch (role.system_role_key) {
        case 'owner':
          return Crown;
        case 'admin':
          return Shield;
        case 'admin_readonly':
          return Eye;
        case 'dipendente':
          return UserCircle;
        default:
          return Lock;
      }
    }

    // Per ruoli personalizzati, usa l'icona salvata
    if (role.icon) {
      const iconMap: Record<string, any> = {
        Users,
        Briefcase,
        Wrench,
        ClipboardList,
        Calculator,
        FileText,
        UserCircle,
        Building2,
        Headphones,
        Settings,
        ShoppingCart,
        TrendingUp,
        Lock,
        Shield,
      };
      return iconMap[role.icon] || Lock;
    }

    return Lock;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full grid grid-cols-2 h-auto bg-transparent border-b border-border rounded-none p-0 gap-0">
          <TabsTrigger
            value="utenti"
            className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Users className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger
            value="ruoli"
            className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Shield className="h-4 w-4" />
            Ruoli
          </TabsTrigger>
        </TabsList>

        {/* TAB: Utenti */}
        <TabsContent value="utenti" className="space-y-6">
          {/* Header con Ricerca e Filtri */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Barra di ricerca */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email, posizione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 border-2 border-border rounded-lg bg-card w-full"
              />
            </div>

            {/* Filtro Ruolo */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-11 border-2 border-border rounded-lg bg-card">
                <SelectValue placeholder="Ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i ruoli</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="admin_readonly">Admin Read-Only</SelectItem>
                <SelectItem value="operaio">Operaio</SelectItem>
                <SelectItem value="billing_manager">Billing Manager</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro Stato */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-11 border-2 border-border rounded-lg bg-card">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="inactive">Inattivi</SelectItem>
              </SelectContent>
            </Select>

            {/* Nuovo Utente */}
            {can('users:create') && (
              <Button
                onClick={() => router.push('/utenti-ruoli/nuovo')}
                className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-11 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Utente</span>
                <span className="sm:hidden">Nuovo</span>
              </Button>
            )}
          </div>

      {/* Tabella Utenti */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background border-b-2 border-border">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Utente</th>
                <th className="text-left p-4 font-semibold text-sm">Email</th>
                <th className="text-left p-4 font-semibold text-sm">Ruolo</th>
                <th className="text-left p-4 font-semibold text-sm">Posizione</th>
                <th className="text-center p-4 font-semibold text-sm">Stato</th>
                <th className="text-left p-4 font-semibold text-sm">Ultimo Accesso</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nessun utente trovato con i filtri selezionati
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/utenti-ruoli/${user.id}`)}
                    className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer group"
                  >
                    {/* Utente (Avatar + Nome) */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="md" />
                        <div>
                          <p className="font-medium">{user.full_name || 'Senza nome'}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {user.username || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </td>

                    {/* Ruolo */}
                    <td className="p-4">
                      <RoleBadge role={user.role} />
                    </td>

                    {/* Posizione */}
                    <td className="p-4">
                      <span className="text-sm">{user.position || '—'}</span>
                    </td>

                    {/* Stato */}
                    <td className="p-4 text-center">
                      <UserStatusBadge user={user} />
                    </td>

                    {/* Ultimo Accesso */}
                    <td className="p-4">
                      <span className="text-sm">{formatDate(user.last_sign_in_at)}</span>
                    </td>

                    {/* Freccia indicatore */}
                    <td className="p-4">
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <>
          <hr className="border-border" />

          <div className="flex items-center justify-between px-4 py-4">
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
        </>
      )}
        </TabsContent>

        {/* TAB: Ruoli */}
        <TabsContent value="ruoli" className="space-y-6">
          {rolesLoading ? (
            <div className="text-center py-12 text-muted-foreground">Caricamento ruoli...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card Crea Nuovo Ruolo */}
              <div
                onClick={() => {
                  const customRolesCount = customRoles.length;
                  if (customRolesCount >= 15) {
                    toast.error('Limite massimo di 15 ruoli personalizzati raggiunto');
                    return;
                  }
                  router.push('/utenti-ruoli/ruolo/nuovo');
                }}
                className="rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 p-6 cursor-pointer transition-all hover:shadow-lg group"
              >
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="p-4 rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition-colors mb-4">
                    <Plus className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-emerald-900">Crea Nuovo Ruolo</h3>
                  <p className="text-sm text-emerald-700">
                    Aggiungi un ruolo personalizzato per la tua azienda
                  </p>
                  <p className="text-xs text-emerald-600 mt-2">
                    {customRoles.length}/15 ruoli creati
                  </p>
                </div>
              </div>

              {/* Ruoli esistenti */}
              {roles.filter(r => r.system_role_key !== 'owner').map((role) => {
                const IconComponent = getRoleIcon(role);
                const isSystem = role.is_system_role;

                return (
                  <div
                    key={role.id}
                    className="rounded-xl border-2 border-border bg-card p-6 hover:shadow-lg transition-all"
                  >
                    {/* Header con icona e badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-emerald-100">
                        <IconComponent className="h-6 w-6 text-emerald-600" />
                      </div>
                      {isSystem ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                          <Shield className="h-3 w-3" />
                          Sistema
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200 font-medium">
                          <Lock className="h-3 w-3" />
                          Personalizzato
                        </span>
                      )}
                    </div>

                    {/* Nome e descrizione */}
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">{role.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                        {role.description || 'Nessuna descrizione'}
                      </p>
                    </div>

                    {/* Info utenti */}
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">0</span> utenti assegnati
                      </span>
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center gap-2">
                      {isSystem ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/utenti-ruoli/ruolo/${role.id}/modifica`);
                          }}
                        >
                          Visualizza Permessi
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/utenti-ruoli/ruolo/${role.id}/modifica`);
                            }}
                          >
                            Modifica
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoleToDelete(role);
                            }}
                          >
                            Elimina
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Role Modal */}
      {roleToDelete && (
        <DeleteRoleModal
          role={roleToDelete}
          onClose={() => setRoleToDelete(null)}
          onDelete={() => {
            setRoleToDelete(null);
            loadRoles();
          }}
        />
      )}
    </div>
  );
}
