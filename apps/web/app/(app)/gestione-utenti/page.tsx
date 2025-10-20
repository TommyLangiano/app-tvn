'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { UserWithRole } from '@/types/tenant';
import { NuovoUtenteModal } from '@/components/features/utenti/NuovoUtenteModal';
import { DeleteUserModal } from '@/components/features/utenti/DeleteUserModal';

export default function GestioneUtentiPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [showNuovoModal, setShowNuovoModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get current user's tenant and role
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', currentUser.id)
        .single();

      if (!userTenant) return;

      setCurrentUserRole(userTenant.role);

      // Only owners and admins can see this page
      if (userTenant.role !== 'admin' && userTenant.role !== 'owner') {
        toast.error('Non hai i permessi per accedere a questa pagina');
        return;
      }

      // Get all users in the same tenant
      const { data: tenantUsers } = await supabase
        .from('user_tenants')
        .select('user_id, role, created_at')
        .eq('tenant_id', userTenant.tenant_id);

      if (!tenantUsers) {
        setUsers([]);
        return;
      }

      // Fetch user details from API
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');

      const { users: allUsers } = await response.json();

      // Match users with their roles
      const usersWithRoles: UserWithRole[] = tenantUsers
        .map(tu => {
          const user = allUsers.find((u: { id: string }) => u.id === tu.user_id);
          if (!user) return null;

          return {
            id: user.id,
            email: user.email,
            role: tu.role,
            full_name: user.user_metadata?.full_name,
            created_at: tu.created_at,
          };
        })
        .filter(Boolean) as UserWithRole[];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        );
      case 'operaio':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
            <UserIcon className="h-3 w-3" />
            Operaio
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 text-xs font-medium">
            <UserIcon className="h-3 w-3" />
            {role}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (currentUserRole !== 'admin' && currentUserRole !== 'owner') {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Non hai i permessi per accedere a questa pagina</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Gestione Utenti' }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Utenti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci gli utenti della tua azienda
          </p>
        </div>
        <Button onClick={() => setShowNuovoModal(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuovo Utente
        </Button>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b-2 border-border">
              <tr>
                <th className="text-left p-4 font-semibold">Utente</th>
                <th className="text-left p-4 font-semibold">Email</th>
                <th className="text-left p-4 font-semibold">Ruolo</th>
                <th className="text-left p-4 font-semibold">Data Creazione</th>
                <th className="text-right p-4 font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nessun utente trovato
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.full_name || user.email.split('@')[0]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="p-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="gap-1 border-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Elimina
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showNuovoModal && (
        <NuovoUtenteModal
          onClose={() => setShowNuovoModal(false)}
          onSuccess={() => {
            setShowNuovoModal(false);
            loadUsers();
          }}
        />
      )}

      {showDeleteModal && selectedUser && (
        <DeleteUserModal
          user={selectedUser}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedUser(null);
            loadUsers();
          }}
        />
      )}
    </div>
  );
}
