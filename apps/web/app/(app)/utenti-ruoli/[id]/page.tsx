/**
 * User Detail Page
 *
 * Page for viewing user details and performing actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/common/UserAvatar';
import { UserStatusBadge } from '@/components/common/UserStatusBadge';
import { RoleBadge } from '@/components/common/RoleBadge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Phone, Briefcase, FileText, Calendar, Edit, Ban, CheckCircle, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { getUserWithProfile } from '@/lib/users/profiles';
import type { UserWithProfile } from '@/types/user-profile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserWithProfile(params.id);
      if (!userData) {
        toast.error('Utente non trovato');
        router.push('/utenti-ruoli');
        return;
      }
      setUser(userData);
    } catch {
      toast.error('Errore nel caricamento dell&apos;utente');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleToggleStatus = async () => {
    if (!user) return;

    try {
      const newStatus = !user.is_active;

      const response = await fetch(`/api/users/${params.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) throw new Error('Errore nel cambio stato');

      toast.success(newStatus ? 'Utente riattivato' : 'Utente disattivato');
      loadUser();
    } catch {
      toast.error('Errore nel cambio stato');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nell&apos;eliminazione');
      }

      toast.success('Utente eliminato con successo');
      router.push('/utenti-ruoli');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nell&apos;eliminazione';
      toast.error(errorMessage);
    }
  };

  const handleResendInvite = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}/resend-invite`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Errore invio invito');

      toast.success('Email di invito inviata con successo');
    } catch {
      toast.error('Errore nell\'invio dell\'email');
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
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

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/utenti-ruoli"
          className="flex items-center justify-center h-10 w-10 rounded-lg border-2 border-border hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">Dettaglio Utente</h1>
          <p className="text-muted-foreground">Visualizza e gestisci le informazioni dell&apos;utente</p>
        </div>

        {/* Action Buttons - Stile Tabella */}
        <div className="flex gap-2">
          <Link href={`/utenti-ruoli/${params.id}/modifica`}>
            <button
              className="p-2 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
              title="Modifica"
            >
              <Edit className="h-4 w-4 text-orange-600" />
            </button>
          </Link>

          <button
            onClick={handleToggleStatus}
            className={`p-2 rounded-lg border-2 transition-colors ${
              user.is_active && user.is_active_in_tenant
                ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
                : 'border-green-200 bg-green-50 hover:bg-green-100'
            }`}
            title={user.is_active && user.is_active_in_tenant ? 'Blocca' : 'Sblocca'}
          >
            {user.is_active && user.is_active_in_tenant ? (
              <Ban className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
          </button>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="p-2 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            title="Elimina"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Informazioni Generali</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex items-center justify-center">
              <UserAvatar user={user} size="2xl" />
            </div>
            <div className="flex-1">
              {/* Nome e Badge - Full Width */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">{user.full_name || 'Senza nome'}</h2>
                  {user.username && (
                    <p className="text-sm text-muted-foreground font-mono mt-1">@{user.username}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <UserStatusBadge user={user} />
                  <RoleBadge role={user.role} />
                </div>
              </div>

              {/* Contact Info e Note in Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Contact Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground shrink-0">Email:</span>
                    <span className="text-sm">{user.email}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.email);
                        toast.success('Email copiata!');
                      }}
                      className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0 ml-1"
                      title="Copia email"
                    >
                      <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>

                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground shrink-0">Telefono:</span>
                      <span className="text-sm">{user.phone}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.phone || '');
                          toast.success('Telefono copiato!');
                        }}
                        className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors shrink-0 ml-1"
                        title="Copia telefono"
                      >
                        <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {user.position && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground shrink-0">Posizione:</span>
                      <span className="text-sm">{user.position}</span>
                    </div>
                  )}
                </div>

                {/* Right: Notes (plain text) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Note:</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap pl-6">
                    {user.notes || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout for Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HR Information Card */}
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Informazioni HR</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Data di Nascita</span>
              <span className="text-sm font-medium">{formatDate(user.birth_date)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Data Assunzione</span>
              <span className="text-sm font-medium">{formatDate(user.hire_date)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Data Visita Medica</span>
              <span className="text-sm font-medium">{formatDate(user.medical_checkup_date)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Scadenza Visita Medica</span>
              <span className="text-sm font-medium">{formatDate(user.medical_checkup_expiry)}</span>
            </div>
          </div>
        </div>

        {/* System Information Card */}
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Informazioni Sistema</h3>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Creato da</span>
              <span className="text-sm font-medium">{user.created_by || 'Sistema'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Data Creazione</span>
              <span className="text-sm font-medium">{formatDate(user.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Ultimo Accesso</span>
              <span className="text-sm font-medium">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('it-IT') : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <span className="text-sm text-muted-foreground">Email Verificata</span>
              {user.email_confirmed_at ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Sì
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <Ban className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                    No
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Documents Card */}
      {user.document_path && (
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Documenti</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-blue-200 bg-blue-50/50">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 flex-1">Documento caricato</span>
              <Button
                variant="outline"
                size="sm"
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-white border-2 border-blue-300 hover:bg-blue-100"
                onClick={async () => {
                  try {
                    const response = await fetch(`/api/users/download-document?path=${encodeURIComponent(user.document_path || '')}`);
                    if (!response.ok) throw new Error('Errore nel caricamento');
                    const { url } = await response.json();
                    window.open(url, '_blank');
                  } catch {
                    toast.error('Impossibile aprire il documento');
                  }
                }}
              >
                Visualizza
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Actions Card - Solo se l'utente non ha mai fatto login */}
      {!user.last_sign_in_at && (
        <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
          <div className="border-b border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Azioni</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-orange-200 bg-orange-50/50">
              <Mail className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-sm text-orange-900">Reinvia Email di Invito</p>
                <p className="text-xs text-orange-700/70">
                  L&apos;utente non ha ancora effettuato il primo accesso
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendInvite}
                className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-white border-2 border-orange-300 hover:bg-orange-100"
              >
                Reinvia
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l&apos;utente <strong>{user.full_name || user.email}</strong>.
              Questa operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Elimina Utente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
