'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    verifyInviteToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyInviteToken = async () => {
    try {
      const supabase = createClient();

      // Check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // User clicked invite link while logged in - redirect to dashboard
        router.push('/dashboard');
        return;
      }

      // Get token from URL
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || type !== 'invite') {
        toast.error('Link di invito non valido');
        router.push('/sign-in');
        return;
      }

      // Verify token with Supabase (this will return user info if valid)
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'invite',
      });

      if (error) {
        toast.error('Link di invito scaduto o non valido');
        router.push('/sign-in');
        return;
      }

      if (data.user) {
        setEmail(data.user.email || '');
      }

      setVerifying(false);
    } catch {
      toast.error('Errore nella verifica dell\'invito');
      router.push('/sign-in');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('La password deve contenere almeno 8 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Le password non corrispondono');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Update user password
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success('Password impostata con successo! Accesso in corso...');

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);

    } catch {
      toast.error('Errore nell\'impostazione della password');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifica invito in corso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-xl border-2 border-border bg-card shadow-sm">
          {/* Header */}
          <div className="border-b-2 border-border bg-card p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Benvenuto! 👋</h1>
            <p className="text-muted-foreground">
              Sei stato invitato a unirti alla piattaforma
            </p>
            {email && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border-2 border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  Account: <span className="font-bold">{email}</span>
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSetPassword} className="p-6 sm:p-8 space-y-6">
            {/* Sezione Password */}
            <div className="space-y-6 p-6 rounded-xl border-2 border-border bg-card shadow-sm">
              <div className="border-b-2 border-border pb-3">
                <h3 className="text-lg font-semibold">Imposta la tua Password</h3>
                <p className="text-sm text-muted-foreground">
                  Scegli una password sicura per il tuo account
                </p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium text-sm">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimo 8 caratteri"
                    required
                    className="h-11 bg-background border-2 border-border rounded-lg px-4 text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  La password deve contenere almeno 8 caratteri
                </p>
              </div>

              {/* Conferma Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium text-sm">
                  Conferma Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la password"
                    required
                    className="h-11 bg-background border-2 border-border rounded-lg px-4 text-base pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/sign-in')}
                disabled={loading}
                className="flex-1 sm:flex-initial border-2 border-border h-11 px-6 font-semibold"
              >
                Ho già un account
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 px-6 text-base font-semibold"
              >
                {loading ? 'Impostazione in corso...' : 'Imposta password e accedi'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
