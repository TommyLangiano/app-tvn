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
    'rapportini': 'Rapportini',
    'commesse': 'Commesse',
    'anagrafica': 'Anagrafica',
    'utenti': 'Gestione Utenti',
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
    <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4 shadow-sm">
      {/* Nome pagina a sinistra */}
      <h1 className="text-2xl font-bold tracking-tight">{pageName}</h1>

      {/* Breadcrumb navigation a destra - mostra solo se ci sono sottopagine */}
      {breadcrumbItems.length > 1 && (
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>

          {breadcrumbItems.map((item, index) => (
            <div key={item.href} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {index === breadcrumbItems.length - 1 ? (
                <span className="font-medium text-foreground">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
