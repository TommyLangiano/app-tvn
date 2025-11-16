'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Inserisci la tua email');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        toast.error('Errore durante l\'invio dell\'email');
        console.error('Reset password error:', error);
        return;
      }

      setEmailSent(true);
      toast.success('Email inviata! Controlla la tua casella di posta.');
    } catch (error) {
      console.error('Reset password exception:', error);
      toast.error('Si è verificato un errore');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="max-w-md w-full">
          {/* Success Card */}
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 border-4 border-green-200">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Email Inviata!
            </h1>

            {/* Message */}
            <p className="text-muted-foreground mb-6">
              Abbiamo inviato un link per reimpostare la password a:
            </p>
            <p className="text-foreground font-medium mb-8 break-all">
              {email}
            </p>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-foreground mb-2">
                <strong>Cosa fare ora:</strong>
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Controlla la tua casella di posta</li>
                <li>Clicca sul link nell&apos;email (valido 1 ora)</li>
                <li>Inserisci la tua nuova password</li>
              </ol>
            </div>

            {/* Note */}
            <p className="text-xs text-muted-foreground mb-6">
              Non hai ricevuto l&apos;email? Controlla la cartella spam o{' '}
              <button
                onClick={() => setEmailSent(false)}
                className="text-primary hover:underline font-medium"
              >
                riprova
              </button>
            </p>

            {/* Back to Login */}
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Torna al Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
              Password Dimenticata?
            </h1>
            <p className="text-muted-foreground">
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
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

            <Button
              type="submit"
              className="h-11 w-full text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Invio in corso...' : 'Invia Link di Reset'}
            </Button>

            {/* Back to Login */}
            <div className="text-center pt-2">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
