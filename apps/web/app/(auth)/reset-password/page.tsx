'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Building2, CheckCircle2 } from 'lucide-react';
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
              Email Inviata!
            </h1>

            {/* Message */}
            <p className="text-base text-slate-600 mb-6 text-center">
              Abbiamo inviato un link per reimpostare la password a:
            </p>
            <p className="text-lg text-slate-900 font-semibold mb-8 break-all text-center">
              {email}
            </p>

            {/* Instructions */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
              <p className="text-sm font-semibold text-slate-900 mb-3">
                Cosa fare ora:
              </p>
              <ol className="text-sm text-slate-700 space-y-2 ml-4 list-decimal">
                <li>Controlla la tua casella di posta</li>
                <li>Clicca sul link nell&apos;email (valido 1 ora)</li>
                <li>Inserisci la tua nuova password</li>
              </ol>
            </div>

            {/* Note */}
            <p className="text-sm text-slate-600 mb-8 text-center">
              Non hai ricevuto l&apos;email? Controlla la cartella spam o{' '}
              <button
                onClick={() => setEmailSent(false)}
                className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                riprova
              </button>
            </p>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al Login
              </Link>
            </div>
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
                <Mail className="h-10 w-10 text-emerald-600" strokeWidth={2} />
              </div>

              <h3 className="text-3xl font-bold text-slate-900">
                Recupera il tuo account
              </h3>
              <p className="text-lg text-slate-600">
                Ti abbiamo inviato tutte le istruzioni via email
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

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-[440px]">
          {/* Title */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-3">
              Password Dimenticata?
            </h2>
            <p className="text-base text-slate-600">
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
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
                  Invio in corso...
                </span>
              ) : (
                'Invia Link di Reset'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500">
                  Ricordi la password?
                </span>
              </div>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al Login
              </Link>
            </div>
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
              <Building2 className="h-10 w-10 text-emerald-600" strokeWidth={2} />
            </div>

            <h3 className="text-3xl font-bold text-slate-900">
              Recupera il tuo account
            </h3>
            <p className="text-lg text-slate-600">
              Ti aiuteremo a ripristinare l&apos;accesso al tuo account
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
