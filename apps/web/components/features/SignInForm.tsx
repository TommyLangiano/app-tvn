'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

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
    } catch (error) {
      console.error('Auth error:', error);
      toast.error('Si è verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <span className="text-xl font-bold">TVN</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {isSignUp ? 'Crea il tuo account' : 'Bentornato'}
            </h2>
            <p className="mt-2 text-muted">
              {isSignUp
                ? 'Inizia la tua prova gratuita di 14 giorni'
                : 'Accedi al tuo workspace per continuare'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                'Caricamento...'
              ) : (
                <>
                  {isSignUp ? 'Inizia gratuitamente' : 'Accedi'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {isSignUp ? (
                  <>
                    Hai già un account?{' '}
                    <span className="font-medium text-primary">Accedi</span>
                  </>
                ) : (
                  <>
                    Non hai un account?{' '}
                    <span className="font-medium text-primary">Registrati</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {isSignUp && (
            <p className="mt-6 text-center text-xs text-muted">
              Registrandoti accetti i nostri{' '}
              <a href="#" className="text-primary hover:underline">
                Termini di Servizio
              </a>{' '}
              e la{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Right Side - Visual Only */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-success/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
