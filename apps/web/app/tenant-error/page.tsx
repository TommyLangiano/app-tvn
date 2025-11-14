'use client';

import { AlertTriangle, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TenantErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo Header */}
        <div className="flex justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <span className="text-2xl font-bold">TVN</span>
          </div>
        </div>

        {/* Error Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 md:p-12 shadow-xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 border-4 border-red-200">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-foreground mb-4">
            Errore Dati Azienda
          </h1>

          {/* Message */}
          <p className="text-center text-muted-foreground text-lg mb-8">
            Non siamo riusciti a trovare i dati della tua azienda. Questo potrebbe essere dovuto a un problema tecnico durante la registrazione.
          </p>

          {/* Divider */}
          <div className="border-t border-border my-8" />

          {/* Actions */}
          <div className="space-y-4">
            {/* Contact Support */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 border border-blue-200 flex-shrink-0">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">Contatta il Supporto</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Il nostro team ti aiuterà a risolvere il problema e a ripristinare l&apos;accesso al tuo account.
                  </p>
                  <a
                    href="mailto:support@tvn.com?subject=Errore%20Dati%20Azienda"
                    className="inline-flex items-center justify-center gap-2 px-6 h-11 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium text-sm"
                  >
                    <Mail className="h-4 w-4" />
                    Invia Email al Supporto
                  </a>
                </div>
              </div>
            </div>

            {/* Return to Login */}
            <div className="flex justify-center pt-4">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Torna al Login
              </Link>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-8 pt-6 border-t border-border">
            <details className="cursor-pointer">
              <summary className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dettagli Tecnici
              </summary>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
                <p><strong>Errore:</strong> Dati tenant mancanti</p>
                <p><strong>Causa possibile:</strong> Interruzione durante la registrazione o problema di sincronizzazione database</p>
                <p><strong>Azione consigliata:</strong> Contattare il supporto tecnico per la riattivazione dell&apos;account</p>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Ci scusiamo per l&apos;inconveniente. Il nostro team è qui per aiutarti.
        </p>
      </div>
    </div>
  );
}
