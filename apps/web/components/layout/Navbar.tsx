'use client';

import { Search, Bell, ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/contexts/UserContext';

// Mappa dei percorsi ai nomi delle sezioni
const sectionNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/report': 'Report',
  '/calendario': 'Calendario',
  '/anagrafica': 'Anagrafica',
  '/presenze': 'Presenze',
  '/assenze-ferie': 'Assenze & Ferie',
  '/assunzioni': 'Assunzioni',
  '/gestione-hr': 'Gestione HR',
  '/stipendi': 'Stipendi',
  '/commesse': 'Commesse',
  '/rapportini': 'Registro Presenze',
  '/registro-presenze': 'Registro Presenze',
  '/fatture/attive': 'Fatture Attive',
  '/fatture/passive': 'Fatture Passive',
  '/fatture/f24': 'F24',
  '/fatture/movimenti': 'Movimenti',
  '/mezzi-attrezzature': 'Mezzi & Attrezzature',
  '/magazzino': 'Magazzino',
  '/dipendenti': 'Dipendenti',
  '/clienti': 'Clienti',
  '/fornitori': 'Fornitori',
  '/documenti': 'Documenti',
  '/impostazioni': 'Impostazioni',
  '/utenti-ruoli': 'Utenti & Ruoli',
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount] = useState(3); // TODO: Get from API
  const { user } = useUser(); // Get user from context - no more API calls!

  // Check if we should show back button
  const shouldShowBackButton = () => {
    return (
      pathname.match(/^\/commesse\/[^/]+$/) ||
      pathname.match(/^\/commesse\/[^/]+\/modifica$/) ||
      pathname === '/dipendenti/nuovo' ||
      pathname.match(/^\/dipendenti\/[^/]+$/) ||
      pathname.match(/^\/dipendenti\/[^/]+\/modifica$/) ||
      pathname === '/fornitori/nuovo' ||
      pathname.match(/^\/fornitori\/[^/]+\/modifica$/) ||
      pathname === '/clienti/nuovo' ||
      pathname.match(/^\/clienti\/[^/]+\/modifica$/) ||
      pathname === '/utenti-ruoli/ruolo/nuovo' ||
      pathname.match(/^\/utenti-ruoli\/ruolo\/[^/]+\/modifica$/)
    );
  };

  // Get section name from pathname
  const getSectionName = () => {
    // Check for specific patterns first
    if (pathname === '/commesse/nuova') {
      return 'Nuova Commessa';
    }

    if (pathname.match(/^\/commesse\/[^/]+\/modifica$/)) {
      return 'Modifica Commessa';
    }

    if (pathname.match(/^\/commesse\/[^/]+$/)) {
      return 'Dettaglio Commessa';
    }

    // Fornitori patterns
    if (pathname === '/fornitori/nuovo') {
      return 'Nuovo Fornitore';
    }

    if (pathname.match(/^\/fornitori\/[^/]+\/modifica$/)) {
      return 'Modifica Fornitore';
    }

    // Dipendenti patterns
    if (pathname === '/dipendenti/nuovo') {
      return 'Nuovo Dipendente';
    }

    if (pathname.match(/^\/dipendenti\/[^/]+\/modifica$/)) {
      return 'Modifica Dipendente';
    }

    if (pathname.match(/^\/dipendenti\/[^/]+$/)) {
      return 'Dettaglio Dipendente';
    }

    // Clienti patterns
    if (pathname === '/clienti/nuovo') {
      return 'Nuovo Cliente';
    }

    if (pathname.match(/^\/clienti\/[^/]+\/modifica$/)) {
      return 'Modifica Cliente';
    }

    // Utenti-Ruoli patterns
    if (pathname === '/utenti-ruoli/ruolo/nuovo') {
      return 'Crea Ruolo Personalizzato';
    }

    if (pathname.match(/^\/utenti-ruoli\/ruolo\/[^/]+\/modifica$/)) {
      return 'Modifica Ruolo';
    }

    // Exact match
    if (sectionNames[pathname]) {
      return sectionNames[pathname];
    }

    // Try to match partial paths (e.g., /commesse/123 -> Commesse)
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const basePath = `/${pathParts[0]}`;
      if (sectionNames[basePath]) {
        return sectionNames[basePath];
      }
    }

    return 'Dashboard';
  };

  // Get section description
  const getSectionDescription = () => {
    const descriptions: Record<string, string> = {
      '/dashboard': 'Panoramica generale delle tue attività',
      '/commesse': 'Gestisci e monitora tutte le tue commesse',
      '/commesse/nuova': 'Crea una nuova commessa e definisci i dettagli del progetto',
      '/rapportini': 'Visualizza e crea rapportini di lavoro',
      '/dipendenti': 'Gestisci i dipendenti e il personale',
      '/dipendenti/nuovo': 'Inserisci i dati del dipendente',
      '/clienti': 'Gestisci l\'anagrafica dei tuoi clienti',
      '/clienti/nuovo': 'Inserisci i dati del cliente',
      '/fornitori': 'Gestisci l\'anagrafica dei tuoi fornitori',
      '/fornitori/nuovo': 'Inserisci i dati del fornitore',
      '/utenti-ruoli': 'Amministra utenti e permessi',
      '/utenti-ruoli/ruolo/nuovo': 'Crea un ruolo su misura per la tua azienda con permessi specifici',
      '/impostazioni': 'Configura le impostazioni del sistema',
    };

    // Exact match first
    if (descriptions[pathname]) return descriptions[pathname];

    // Check if we're in a commessa detail page
    if (pathname.match(/^\/commesse\/[^/]+$/)) {
      return 'Visualizza e gestisci tutti i dettagli della commessa';
    }

    // Check if we're in a commessa edit page
    if (pathname.match(/^\/commesse\/[^/]+\/modifica$/)) {
      return 'Modifica i dettagli e le informazioni della commessa';
    }

    // Check if we're in a role edit page
    if (pathname.match(/^\/utenti-ruoli\/ruolo\/[^/]+\/modifica$/)) {
      return 'Modifica nome, descrizione e permessi del ruolo';
    }

    // Check if we're in a fornitore edit page
    if (pathname.match(/^\/fornitori\/[^/]+\/modifica$/)) {
      return 'Modifica i dati del fornitore';
    }

    // Check if we're in a dipendente detail page
    if (pathname.match(/^\/dipendenti\/[^/]+$/)) {
      return 'Visualizza e gestisci tutti i dettagli del dipendente';
    }

    // Check if we're in a dipendente edit page
    if (pathname.match(/^\/dipendenti\/[^/]+\/modifica$/)) {
      return 'Modifica i dati del dipendente';
    }

    // Check if we're in a cliente edit page
    if (pathname.match(/^\/clienti\/[^/]+\/modifica$/)) {
      return 'Modifica i dati del cliente';
    }

    // Check for base paths
    for (const [path, desc] of Object.entries(descriptions)) {
      if (pathname.startsWith(path)) return desc;
    }

    return '';
  };

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-2">
        {/* Left - Section Name with optional back button */}
        <div className="flex items-center gap-3">
          {shouldShowBackButton() && (
            <button
              onClick={() => router.back()}
              className="h-11 w-11 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all flex-shrink-0"
              title="Torna indietro"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          )}

          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-foreground">
              {pathname === '/dashboard' && user?.firstName
                ? `Dashboard, Bentornato ${user.firstName}`
                : getSectionName()}
            </h1>
            {getSectionDescription() && (
              <p className="text-sm text-muted-foreground mt-1">
                {getSectionDescription()}
              </p>
            )}
          </div>
        </div>

        {/* Right - Search + Notifications */}
        <div className="flex items-center gap-3">

          {/* Search Bar - Modern with icon on right */}
          <div className="relative w-96">
            <Input
              type="search"
              placeholder="Commesse, Rapportini, Clienti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pr-10 bg-surface border-border rounded-lg focus-visible:ring-1 focus-visible:ring-primary transition-all"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
          </div>

          {/* Notification Button - Modern Square Design */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative h-11 w-11 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all">
                <Bell className="h-5 w-5 text-foreground" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm">
                    {notificationCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="max-h-96 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <p className="text-sm font-medium text-foreground">Nuova commessa assegnata</p>
                  <p className="text-xs text-muted">Commessa #1234 - Via Roma 123</p>
                  <p className="text-xs text-muted">2 ore fa</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <p className="text-sm font-medium text-foreground">Rapportino da approvare</p>
                  <p className="text-xs text-muted">Mario Rossi - 13/01/2025</p>
                  <p className="text-xs text-muted">5 ore fa</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                  <p className="text-sm font-medium text-foreground">Fattura in scadenza</p>
                  <p className="text-xs text-muted">Fattura #FAT-2025-001</p>
                  <p className="text-xs text-muted">1 giorno fa</p>
                </DropdownMenuItem>
              </div>
              <div className="border-t border-border p-2">
                <Button variant="ghost" className="w-full h-9 text-sm text-primary hover:bg-primary/5">
                  Vedi tutte le notifiche
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
