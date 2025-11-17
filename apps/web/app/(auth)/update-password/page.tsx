'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user accessed via reset password link
    const checkToken = async () => {
      const supabase = createClient();

      // Check for hash fragment (password reset token from email)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        // Token found in URL - exchange it for session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });

        if (error) {
          console.error('Error setting session:', error);
          toast.error('Link non valido o scaduto');
          setTimeout(() => router.push('/reset-password'), 3000);
          return;
        }

        if (data.session) {
          setIsValidToken(true);
          // Clean URL from hash
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        // No token in URL - check existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setIsValidToken(true);
        } else {
          toast.error('Link non valido o scaduto');
          setTimeout(() => router.push('/reset-password'), 3000);
        }
      }
    };

    checkToken();
  }, [router]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'La password deve essere di almeno 8 caratteri';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'La password deve contenere almeno una lettera maiuscola';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'La password deve contenere almeno una lettera minuscola';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'La password deve contenere almeno un numero';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Le password non corrispondono');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error('Errore durante l\'aggiornamento della password');
        console.error('Update password error:', error);
        return;
      }

      // Logout user after password reset (force re-login)
      await supabase.auth.signOut();

      setPasswordUpdated(true);
      toast.success('Password aggiornata con successo!');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);
    } catch (error) {
      console.error('Update password exception:', error);
      toast.error('Si è verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Verifica del link in corso...</p>
        </div>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full">
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 border-4 border-green-200">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Password Aggiornata!
            </h1>

            {/* Message */}
            <p className="text-muted-foreground mb-6">
              La tua password è stata reimpostata con successo.
            </p>

            <p className="text-sm text-muted-foreground">
              Verrai reindirizzato alla pagina di login per accedere con la nuova password...
            </p>
          </div>
        </div>
      </div>
    );
  }

  const passwordStrength = password.length === 0 ? null :
    validatePassword(password) ? 'weak' : 'strong';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <span className="text-xl font-bold">TVN</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Imposta Nuova Password
            </h1>
            <p className="text-muted-foreground">
              Scegli una password sicura per il tuo account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Nuova Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Almeno 8 caratteri"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <div className={`h-1 flex-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div className={`h-1 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div className={`h-1 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                  <p className={`text-xs ${passwordStrength === 'weak' ? 'text-red-600' : 'text-green-600'}`}>
                    {passwordStrength === 'weak' ? 'Password debole' : 'Password forte'}
                  </p>
                </div>
              )}

              {/* Requirements */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className={password.length >= 8 ? 'text-green-600' : ''}>
                  {password.length >= 8 ? '✓' : '○'} Almeno 8 caratteri
                </p>
                <p className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} Una lettera maiuscola
                </p>
                <p className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                  {/[a-z]/.test(password) ? '✓' : '○'} Una lettera minuscola
                </p>
                <p className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                  {/[0-9]/.test(password) ? '✓' : '○'} Un numero
                </p>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Conferma Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Ripeti la password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600">
                  Le password non corrispondono
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
            >
              {isLoading ? 'Aggiornamento...' : 'Aggiorna Password'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
