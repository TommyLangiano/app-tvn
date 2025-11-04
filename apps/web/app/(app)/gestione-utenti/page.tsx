'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { UserAvatar } from '@/components/common/UserAvatar';
import { UserStatusBadge } from '@/components/common/UserStatusBadge';
import { RoleBadge } from '@/components/common/RoleBadge';
import { usePermissions } from '@/hooks/usePermissions';
import { getTenantUsers } from '@/lib/users/profiles';
import type { UserListItem } from '@/types/user-profile';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function GestioneUtentiPage() {
  const router = useRouter();
  const { can, role, isOwner, isAdmin } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
  }, []);

  const loadCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersData = await getTenantUsers();
      setUsers(usersData);
    } catch (error) {
      toast.error('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
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
      <Breadcrumb pageName="Gestione Utenti" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Utenti</h2>
          <p className="text-muted-foreground">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'utente trovato' : 'utenti trovati'}
          </p>
        </div>
        {can('users:create') && (
          <Link href="/gestione-utenti/nuovo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuovo Utente
            </Button>
          </Link>
        )}
      </div>

      {/* Filtri */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-colors"
          onClick={() => setShowFilters(!showFilters)}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Cerca e Filtri</h3>
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
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Azzera filtri
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Barra di ricerca */}
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome, email, posizione..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-lg border-2 border-border bg-background"
                  />
                </div>
              </div>

              {/* Filtro Ruolo */}
              <div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue />
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
              </div>

              {/* Filtro Stato */}
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-lg border-2 border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="active">Attivi</SelectItem>
                    <SelectItem value="inactive">Inattivi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
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
                    onClick={() => router.push(`/gestione-utenti/${user.id}`)}
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

    </div>
  );
}
