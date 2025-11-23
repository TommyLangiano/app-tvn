'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

function AcceptInvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleInvite = async () => {
      const supabase = createClient();

      // Get token from URL
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || type !== 'invite') {
        toast.error('Link di invito non valido');
        router.push('/sign-in');
        return;
      }

      try {
        // IMPORTANT: Logout any existing session first
        await supabase.auth.signOut();

        // Verify the invite token by calling Supabase auth
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'invite',
        });

        if (error) {
          console.error('Invite verification error:', error);
          toast.error('Link di invito non valido o scaduto');
          router.push('/sign-in');
          return;
        }

        if (data.session) {
          // User is now logged in with the invite
          // Redirect to update-password page
          toast.success('Benvenuto! Imposta la tua password per continuare.');
          router.push('/update-password');
        } else {
          toast.error('Errore durante l\'accettazione dell\'invito');
          router.push('/sign-in');
        }
      } catch (err) {
        console.error('Accept invite error:', err);
        toast.error('Si è verificato un errore');
        router.push('/sign-in');
      } finally {
        setIsProcessing(false);
      }
    };

    handleInvite();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">
          {isProcessing ? 'Accettazione invito in corso...' : 'Reindirizzamento...'}
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    }>
      <AcceptInvitePageContent />
    </Suspense>
  );
}
