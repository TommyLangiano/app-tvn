/**
 * Nuovo Utente Page
 *
 * Dedicated page for creating new users
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { UserForm, type UserFormData } from '@/components/features/utenti/UserForm';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NuovoUtentePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true);

      // Separate file from data
      const { document_file, ...userData } = data;

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore nella creazione dell&apos;utente');
      }

      const result = await response.json();

      // Upload document if present
      if (document_file && result.user?.id) {
        try {
          const formData = new FormData();
          formData.append('file', document_file);
          formData.append('user_id', result.user.id);

          const uploadResponse = await fetch('/api/users/upload-document', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            toast.warning('Utente creato ma errore nel caricamento del documento');
          }
        } catch {
          // Ignore upload errors
        }
      }

      // Success message based on invite method
      if (result.invite_sent) {
        toast.success(
          <div>
            <p className="font-medium">Utente creato con successo!</p>
            <p className="text-sm">Email di invito inviata a {data.email}</p>
          </div>
        );
      } else {
        toast.success('Utente creato con successo');
      }

      // Redirect to users list
      router.push('/gestione-utenti');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore nella creazione dell&apos;utente';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/gestione-utenti');
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb pageName="Nuovo Utente" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/gestione-utenti"
          className="flex items-center justify-center h-10 w-10 rounded-lg border-2 border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Crea Nuovo Utente</h1>
          <p className="text-muted-foreground mt-1">
            Aggiungi un nuovo utente al tuo team
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <UserForm onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
