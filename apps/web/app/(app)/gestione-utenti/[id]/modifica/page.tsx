/**
 * Edit User Page
 *
 * Page for editing user details with pre-filled form
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { UserForm, type UserFormData } from '@/components/features/utenti/UserForm';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getUserWithProfile } from '@/lib/users/profiles';
import type { UserWithProfile } from '@/types/user-profile';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await getUserWithProfile(params.id);
      if (!userData) {
        toast.error('Utente non trovato');
        router.push('/gestione-utenti');
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

  const handleSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true);

      // Separate file from data
      const { document_file, ...userData } = data;

      // Update user
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nell&apos;aggiornamento');
      }

      // Upload document if present
      if (document_file) {
        try {
          const formData = new FormData();
          formData.append('file', document_file);
          formData.append('user_id', params.id);

          const uploadResponse = await fetch('/api/users/upload-document', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            toast.warning('Utente aggiornato ma errore nel caricamento del documento');
          }
        } catch {
          // Ignore upload errors
        }
      }

      toast.success('Utente aggiornato con successo');
      router.push(`/gestione-utenti/${params.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nell&apos;aggiornamento';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/gestione-utenti/${params.id}`);
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

  // Prepare default values for form
  const defaultValues: Partial<UserFormData> = {
    email: user.email,
    first_name: user.full_name?.split(' ')[0] || '',
    last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
    phone: user.phone || '',
    position: user.position || '',
    notes: user.notes || '',
    role: user.role,
    birth_date: user.birth_date || '',
    hire_date: user.hire_date || '',
    medical_checkup_date: user.medical_checkup_date || '',
    medical_checkup_expiry: user.medical_checkup_expiry || '',
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Gestione Utenti', href: '/gestione-utenti' },
          { label: user.full_name || user.email, href: `/gestione-utenti/${params.id}` },
          { label: 'Modifica' },
        ]}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={`/gestione-utenti/${params.id}`}
          className="flex items-center justify-center h-10 w-10 rounded-lg border-2 border-border hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex-1">
          <h1 className="text-2xl font-bold">Modifica Utente</h1>
          <p className="text-muted-foreground">Aggiorna le informazioni di {user.full_name || user.email}</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
        <div className="p-6">
          <UserForm
            defaultValues={defaultValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit
            isSubmitting={isSubmitting}
            existingDocument={user.document_path}
            userId={params.id}
          />
        </div>
      </div>
    </div>
  );
}
