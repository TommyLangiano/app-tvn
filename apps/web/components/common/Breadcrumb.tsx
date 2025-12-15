'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BreadcrumbProps {
  pageName: string;
}

export function Breadcrumb({ pageName }: BreadcrumbProps) {
  const pathname = usePathname();

  // Genera il percorso dei breadcrumb - rimuove 'dashboard' dalla visualizzazione
  const paths = pathname.split('/').filter(Boolean);

  // Mappa per tradurre i nomi delle pagine
  const pageLabels: { [key: string]: string } = {
    'rapportini': 'Registro Presenze',
    'registro-presenze': 'Registro Presenze',
    'commesse': 'Commesse',
    'anagrafica': 'Anagrafica',
    'gestione-utenti': 'Gestione Utenti',
    'utenti': 'Gestione Utenti',
    'impostazioni': 'Impostazioni',
    'settings': 'Impostazioni',
  };

  const breadcrumbItems = paths
    .filter(path => path !== 'dashboard') // Rimuove 'dashboard' dal breadcrumb
    .map((path) => {
      const actualIndex = paths.indexOf(path);
      const href = '/' + paths.slice(0, actualIndex + 1).join('/');
      const label = pageLabels[path] || path.charAt(0).toUpperCase() + path.slice(1);
      return { href, label };
    });

  return (
    <div>
      <div className="rounded-xl border border-border bg-card px-4 sm:px-6 py-3 sm:py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Nome pagina a sinistra */}
          <h1 className="text-lg sm:text-xl font-bold tracking-tight break-words">{pageName}</h1>

          {/* Breadcrumb navigation a destra */}
          {breadcrumbItems.length > 1 ? (
            <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto scrollbar-hide">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                Dashboard
              </Link>

              {breadcrumbItems.slice(0, -1).map((item) => (
                <div key={item.href} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                </div>
              ))}
            </nav>
          ) : (
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap text-xs sm:text-sm"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
