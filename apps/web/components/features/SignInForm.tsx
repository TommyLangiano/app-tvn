'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight, Mail, Lock, Building2 } from 'lucide-react';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Compila tutti i campi');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Account creato! Controlla la tua email per confermare.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Accesso effettuato!');
        window.location.href = '/dashboard';
      }
    } catch {

      toast.error('Si è verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-[440px]">
          {/* Logo removed */}

          {/* Title */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">
              {isSignUp ? 'Inizia ora' : 'Bentornato'}
            </h2>
            <p className="text-base text-slate-600">
              {isSignUp
                ? 'Crea il tuo account e inizia la prova gratuita di 14 giorni'
                : 'Accedi alla tua piattaforma aziendale'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Indirizzo Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@azienda.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12 pl-11 pr-4 text-base border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </Label>
                {!isSignUp && (
                  <a
                    href="/reset-password"
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Dimenticata?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  minLength={6}
                  className="h-12 pl-11 pr-4 text-base border-slate-300"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Caricamento...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isSignUp ? 'Crea Account' : 'Accedi'}
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">
                  {isSignUp ? 'Hai già un account?' : 'Nuovo su TVN?'}
                </span>
              </div>
            </div>

            <div className="text-center">
              {isSignUp ? (
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
                  disabled={isLoading}
                >
                  Accedi al tuo account
                </button>
              ) : (
                <a
                  href="/signup"
                  className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
                >
                  Crea la tua azienda gratuitamente
                </a>
              )}
            </div>
          </form>

          {isSignUp && (
            <p className="mt-8 text-center text-xs text-slate-500 leading-relaxed">
              Creando un account accetti i nostri{' '}
              <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Termini di Servizio
              </a>{' '}
              e{' '}
              <a href="#" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Privacy Policy
              </a>
            </p>
          )}

        </div>
      </div>

      {/* Right Side - Animated Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-slate-50">
          {/* Animated blobs */}
          <div className="absolute top-0 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-emerald-400/40 to-emerald-600/40 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute bottom-0 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-slate-300/40 to-emerald-300/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/30 to-white/60 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-16">
          <div className="max-w-md text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl">
              <Building2 className="h-10 w-10 text-emerald-600" strokeWidth={2} />
            </div>

            <h3 className="text-3xl font-bold text-slate-900">
              Gestisci la tua azienda in modo intelligente
            </h3>
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
