'use client';

import { ArrowLeft } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/contexts/UserContext';
import { useState, useEffect } from 'react';

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
  '/fatture': 'Fatture',
  '/fatture/attive': 'Fatture Attive',
  '/fatture/passive': 'Fatture Passive',
  '/fatture/f24': 'F24',
  '/fatture/movimenti': 'Movimenti',
  '/note-spesa': 'Note Spesa',
  '/scadenziario': 'Scadenziario',
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
  const { user } = useUser();
  const [commessaName, setCommessaName] = useState('');
  const [commessaCode, setCommessaCode] = useState('');

  // Listen for commessa data updates
  useEffect(() => {
    const handleCommessaLoaded = () => {
      setCommessaName(sessionStorage.getItem('current-commessa-name') || '');
      setCommessaCode(sessionStorage.getItem('current-commessa-code') || '');
    };

    // Initial load
    handleCommessaLoaded();

    // Listen for updates
    window.addEventListener('commessa-loaded', handleCommessaLoaded);

    return () => {
      window.removeEventListener('commessa-loaded', handleCommessaLoaded);
    };
  }, [pathname]);

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
      // Don't show title until commessa data is loaded
      if (!commessaName) {
        return null; // Hide navbar title
      }
      let title = 'Dettaglio Commessa';
      if (commessaName) {
        title += ` - ${commessaName}`;
      }
      if (commessaCode) {
        title += ` ${commessaCode}`;
      }
      return title;
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

    // Fatture patterns
    if (pathname === '/fatture/nuova-emessa') {
      return null; // Nasconde il titolo perché è già nella pagina
    }

    if (pathname === '/fatture/nuova-ricevuta') {
      return null; // Nasconde il titolo perché è già nella pagina
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

  const sectionName = getSectionName();

  // Nascondi la navbar se il titolo è null (pagine con header proprio)
  if (sectionName === null) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Back button + Section Name */}
        <div className="flex items-center gap-3">
          {/* Back button (se necessario) */}
          {shouldShowBackButton() && (
            <button
              onClick={() => router.back()}
              className="h-11 w-11 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all flex-shrink-0"
              title="Torna indietro"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
          )}

          {/* Section Name */}
          <h1 className="text-4xl font-bold text-foreground" data-page-title>
            {pathname === '/dashboard' && user?.firstName
              ? `Bentornato, ${user.firstName}`
              : sectionName}
          </h1>
        </div>

        {/* Right side: Slot per action buttons (popolato dalle pagine) */}
        <div id="navbar-actions" className="flex items-center gap-3" />
      </div>
    </div>
  );
}
