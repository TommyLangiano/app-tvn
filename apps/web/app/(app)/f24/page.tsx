'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Receipt, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthNavigator } from '@/components/ui/month-navigator';
import { NuovoF24Modal } from '@/components/features/f24/NuovoF24Modal';
import { F24DetailView } from '@/components/features/f24/F24DetailView';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { F24, F24Dettaglio } from '@/types/f24';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function F24Page() {
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);
  const [showNuovoModal, setShowNuovoModal] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [f24, setF24] = useState<F24 | null>(null);
  const [f24Dettaglio, setF24Dettaglio] = useState<F24Dettaglio[]>([]);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
    loadInitialData();
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadF24();
    }
  }, [tenantId, currentMonth, currentYear]);

  const loadInitialData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (userTenants) {
      setTenantId(userTenants.tenant_id);
    }
  };

  const loadF24 = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const supabase = createClient();

      // Carica F24 del mese corrente
      const { data: f24Data, error: f24Error } = await supabase
        .from('f24')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('mese', currentMonth + 1)
        .eq('anno', currentYear)
        .maybeSingle();

      if (f24Error) throw f24Error;

      setF24(f24Data);

      // Se esiste F24, carica anche il dettaglio
      if (f24Data) {
        const { data: dettaglioData, error: dettaglioError } = await supabase
          .from('f24_dettaglio')
          .select(`
            *,
            commesse (
              id,
              nome_commessa,
              cliente_commessa,
              titolo
            )
          `)
          .eq('f24_id', f24Data.id)
          .order('valore_f24_commessa', { ascending: false });

        if (dettaglioError) throw dettaglioError;

        console.log('🔍 F24 Dettaglio caricato:', dettaglioData);
        setF24Dettaglio(dettaglioData || []);
      } else {
        setF24Dettaglio([]);
      }
    } catch (error) {
      console.error('Error loading F24:', error);
      toast.error('Errore nel caricamento dell\'F24');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleSuccess = () => {
    loadF24();
    setShowNuovoModal(false);
  };

  const handleEdit = () => {
    setShowNuovoModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Portal: Pulsante nella Navbar */}
      {navbarActionsContainer && createPortal(
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNuovoModal(true)}
            className="gap-2 h-10 rounded-sm"
            disabled={loading || !!f24}
          >
            <Plus className="h-4 w-4" />
            {f24 ? 'Modifica F24' : 'Inserisci F24'}
          </Button>
        </div>,
        navbarActionsContainer
      )}

      {/* Month Navigator */}
      <MonthNavigator
        currentMonth={currentMonth}
        currentYear={currentYear}
        onMonthChange={handleMonthChange}
      />

      {/* Content */}
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      ) : !f24 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nessun F24 presente per {MESI[currentMonth]} {currentYear}. Clicca su "Inserisci F24" per iniziare.
          </p>
        </div>
      ) : (
        <F24DetailView
          f24={f24}
          dettaglio={f24Dettaglio}
          onEdit={handleEdit}
          onUpdate={loadF24}
        />
      )}

      {/* Modal Nuovo F24 */}
      {tenantId && (
        <NuovoF24Modal
          isOpen={showNuovoModal}
          onClose={() => setShowNuovoModal(false)}
          onSuccess={handleSuccess}
          tenantId={tenantId}
          preselectedMonth={currentMonth + 1}
          preselectedYear={currentYear}
          existingF24={f24}
        />
      )}
    </div>
  );
}
