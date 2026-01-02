'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthNavigator } from '@/components/ui/month-navigator';
import { NuovaBustaPagaModal } from '@/components/features/buste-paga/NuovaBustaPagaModal';
import { createClient } from '@/lib/supabase/client';

export default function BustePagaPage() {
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);
  const [showNuovaModal, setShowNuovaModal] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
    loadTenantId();
  }, []);

  const loadTenantId = async () => {
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

  const handleMonthChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleSuccess = () => {
    // TODO: Ricarica la lista delle buste paga
  };

  return (
    <div className="space-y-6">
      {/* Portal: Pulsante nella Navbar */}
      {navbarActionsContainer && createPortal(
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowNuovaModal(true)}
            className="gap-2 h-10 rounded-sm"
          >
            <Plus className="h-4 w-4" />
            Inserisci Busta Paga
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
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          Nessuna busta paga presente per questo mese. Clicca su "Inserisci Busta Paga" per iniziare.
        </p>
      </div>

      {/* Modal Nuova Busta Paga */}
      {tenantId && (
        <NuovaBustaPagaModal
          isOpen={showNuovaModal}
          onClose={() => setShowNuovaModal(false)}
          onSuccess={handleSuccess}
          tenantId={tenantId}
          preselectedMonth={currentMonth + 1}
          preselectedYear={currentYear}
        />
      )}
    </div>
  );
}
