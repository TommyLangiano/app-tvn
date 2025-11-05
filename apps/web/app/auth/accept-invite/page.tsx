'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function AcceptInvitePage() {
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border-2 border-border bg-card p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Benvenuto!</h1>
            <p className="text-muted-foreground">
              Sei stato invitato a unirsi alla piattaforma
            </p>
            {email && (
              <p className="text-sm text-muted-foreground mt-2">
                Account: <span className="font-medium">{email}</span>
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">Imposta la tua password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 8 caratteri"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                La password deve contenere almeno 8 caratteri
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Conferma password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base font-semibold"
            >
              {loading ? 'Impostazione in corso...' : 'Imposta password e accedi'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Hai già un account?{' '}
              <button
                onClick={() => router.push('/sign-in')}
                className="text-primary hover:underline font-medium"
              >
                Accedi qui
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
