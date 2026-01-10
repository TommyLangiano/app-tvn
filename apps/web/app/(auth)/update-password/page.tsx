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
      <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Left Side - Success Message */}
        <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20 xl:px-24 bg-white">
          <div className="mx-auto w-full max-w-[440px]">
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 border-4 border-emerald-200">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-3 text-center">
              Password Aggiornata!
            </h1>

            {/* Message */}
            <p className="text-base text-slate-600 mb-6 text-center">
              La tua password è stata reimpostata con successo.
            </p>

            <p className="text-sm text-slate-500 text-center">
              Verrai reindirizzato alla pagina di login per accedere con la nuova password...
            </p>
          </div>
        </div>

        {/* Right Side - Animated Gradient */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-slate-50">
            <div className="absolute top-0 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-emerald-400/40 to-emerald-600/40 rounded-full blur-3xl animate-blob"></div>
            <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-slate-300/40 to-emerald-300/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/30 to-white/60 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
            <div className="max-w-md text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" strokeWidth={2} />
              </div>

              <h3 className="text-3xl font-bold text-slate-900">
                Tutto pronto!
              </h3>
              <p className="text-lg text-slate-600">
                Ora puoi accedere con la tua nuova password
              </p>
            </div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes blob {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
          }

          .animate-blob {
            animation: blob 7s infinite;
          }

          .animation-delay-2000 {
            animation-delay: 2s;
          }

          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  const passwordStrength = password.length === 0 ? null :
    validatePassword(password) ? 'weak' : 'strong';

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-[440px]">
          {/* Title */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">
              Imposta Nuova Password
            </h2>
            <p className="text-base text-slate-600">
              Scegli una password sicura per il tuo account.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
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
                  className="h-12 pr-10 text-base border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <div className={`h-1.5 flex-1 rounded ${passwordStrength === 'weak' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <div className={`h-1.5 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    <div className={`h-1.5 flex-1 rounded ${passwordStrength === 'strong' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  </div>
                  <p className={`text-sm font-medium ${passwordStrength === 'weak' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {passwordStrength === 'weak' ? 'Password debole' : 'Password forte'}
                  </p>
                </div>
              )}

              {/* Requirements */}
              <div className="text-sm text-slate-600 space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-700 mb-2">Requisiti:</p>
                <p className={password.length >= 8 ? 'text-emerald-600 font-medium' : ''}>
                  {password.length >= 8 ? '✓' : '○'} Almeno 8 caratteri
                </p>
                <p className={/[A-Z]/.test(password) ? 'text-emerald-600 font-medium' : ''}>
                  {/[A-Z]/.test(password) ? '✓' : '○'} Una lettera maiuscola
                </p>
                <p className={/[a-z]/.test(password) ? 'text-emerald-600 font-medium' : ''}>
                  {/[a-z]/.test(password) ? '✓' : '○'} Una lettera minuscola
                </p>
                <p className={/[0-9]/.test(password) ? 'text-emerald-600 font-medium' : ''}>
                  {/[0-9]/.test(password) ? '✓' : '○'} Un numero
                </p>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
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
                  className="h-12 pr-10 text-base border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-600 font-medium">
                  ✗ Le password non corrispondono
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Aggiornamento...
                </span>
              ) : (
                'Aggiorna Password'
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Side - Animated Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-slate-50">
          <div className="absolute top-0 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-emerald-400/40 to-emerald-600/40 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-slate-300/40 to-emerald-300/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/30 to-white/60 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
          <div className="max-w-md text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl">
              <Eye className="h-10 w-10 text-emerald-600" strokeWidth={2} />
            </div>

            <h3 className="text-3xl font-bold text-slate-900">
              Sicurezza al primo posto
            </h3>
            <p className="text-lg text-slate-600">
              Scegli una password forte per proteggere il tuo account
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
