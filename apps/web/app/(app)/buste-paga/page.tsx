'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, Plus, FileText, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MonthNavigator } from '@/components/ui/month-navigator';
import { NuovaBustaPagaModal } from '@/components/features/buste-paga/NuovaBustaPagaModal';
import { DataTable, DataTableColumn } from '@/components/ui/data-table';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import type { BustaPaga } from '@/types/busta-paga';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export default function BustePagaPage() {
  const [navbarActionsContainer, setNavbarActionsContainer] = useState<HTMLElement | null>(null);
  const [showNuovaModal, setShowNuovaModal] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bustePaga, setBustePaga] = useState<BustaPaga[]>([]);

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);

  useEffect(() => {
    setNavbarActionsContainer(document.getElementById('navbar-actions'));
    loadInitialData();
  }, []);

  useEffect(() => {
    if (tenantId) {
      loadBustePaga();
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

  const loadBustePaga = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('buste_paga')
        .select(`
          *,
          dipendenti (
            nome,
            cognome,
            matricola
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('mese', currentMonth + 1)
        .eq('anno', currentYear)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setBustePaga(data || []);
    } catch (error) {
      console.error('Error loading buste paga:', error);
      toast.error('Errore nel caricamento delle buste paga');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleSuccess = () => {
    loadBustePaga();
  };

  const handleDelete = async (bustaPaga: BustaPaga) => {
    if (!confirm(`Sei sicuro di voler eliminare la busta paga di ${bustaPaga.dipendenti?.cognome} ${bustaPaga.dipendenti?.nome}?`)) {
      return;
    }

    try {
      const supabase = createClient();

      // Elimina prima il file se esiste
      if (bustaPaga.allegato_url) {
        await supabase.storage
          .from('app-storage')
          .remove([bustaPaga.allegato_url]);
      }

      // Elimina la busta paga (i dettagli verranno eliminati in cascade)
      const { error } = await supabase
        .from('buste_paga')
        .delete()
        .eq('id', bustaPaga.id);

      if (error) throw error;

      toast.success('Busta paga eliminata con successo');
      loadBustePaga();
    } catch (error) {
      console.error('Error deleting busta paga:', error);
      toast.error('Errore nell\'eliminazione della busta paga');
    }
  };

  const columns: DataTableColumn<BustaPaga>[] = [
    {
      key: 'dipendente',
      label: 'Dipendente',
      sortable: true,
      render: (busta) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {busta.dipendenti?.cognome} {busta.dipendenti?.nome}
          </span>
          {busta.dipendenti?.matricola && (
            <span className="text-xs text-muted-foreground">
              Matricola: {busta.dipendenti.matricola}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'periodo',
      label: 'Periodo',
      sortable: true,
      render: (busta) => (
        <span className="font-medium">
          {MESI[busta.mese - 1]} {busta.anno}
        </span>
      ),
    },
    {
      key: 'ore_totali',
      label: 'Ore Totali',
      sortable: true,
      render: (busta) => (
        <span className="font-medium">
          {Number(busta.ore_totali).toFixed(2)} h
        </span>
      ),
    },
    {
      key: 'importo_totale',
      label: 'Importo Totale',
      sortable: true,
      render: (busta) => (
        <span className="font-bold text-primary">
          {formatCurrency(Number(busta.importo_totale))}
        </span>
      ),
    },
    {
      key: 'costo_orario',
      label: 'Costo Orario',
      sortable: true,
      render: (busta) => (
        <span className="text-sm text-muted-foreground">
          {formatCurrency(Number(busta.costo_orario))}/h
        </span>
      ),
    },
    {
      key: 'allegato',
      label: 'Allegato',
      sortable: false,
      render: (busta) => (
        <>
          {busta.allegato_url && (
            <FileText className="h-5 w-5 text-primary" />
          )}
        </>
      ),
    },
    {
      key: 'actions',
      label: 'Azioni',
      sortable: false,
      render: (busta) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Implementare visualizzazione dettaglio
              toast.info('Dettaglio in arrivo...');
            }}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(busta)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

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
      {loading ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      ) : bustePaga.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nessuna busta paga presente per {MESI[currentMonth]} {currentYear}. Clicca su "Inserisci Busta Paga" per iniziare.
          </p>
        </div>
      ) : (
        <DataTable
          data={bustePaga}
          columns={columns}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

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
