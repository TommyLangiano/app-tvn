'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import {
  TrendingUp,
  DollarSign,
  Target,
  Briefcase,
  Clock,
} from 'lucide-react';
import { KPICard } from './components/KPICard';
import { FilterBar, type ReportFilters } from './components/FilterBar';
import { RevenueChart } from './components/charts/RevenueChart';
import { CostsBreakdown } from './components/charts/CostsBreakdown';
import { MarginByProject } from './components/charts/MarginByProject';
import { EmployeeHours } from './components/charts/EmployeeHours';
import { ClientsAnalysis } from './components/charts/ClientsAnalysis';
import { AlertsPanel } from './components/charts/AlertsPanel';
import { CashFlowForecast } from './components/charts/CashFlowForecast';
import { BudgetVsActual } from './components/charts/BudgetVsActual';
import { AgingReport } from './components/charts/AgingReport';
import { ProjectTimeline } from './components/charts/ProjectTimeline';
import { ResourceUtilization } from './components/charts/ResourceUtilization';
import { ProfitabilityTrends } from './components/charts/ProfitabilityTrends';
import { WorkingCapital } from './components/charts/WorkingCapital';
import { exportToPDF } from './components/export/ExportPDF';
import { exportToExcel } from './components/export/ExportExcel';
import { getAnalyticsData, type AnalyticsData } from '@/lib/analytics';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export default function ReportPage() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const [filters, setFilters] = useState<ReportFilters>({
    periodo: 'questo-mese',
    dateRange: {
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    },
  });

  // For filter dropdowns
  const [clienti, setClienti] = useState<Array<{ id: string; ragione_sociale: string }>>([]);
  const [commesse, setCommesse] = useState<Array<{ id: string; titolo: string }>>([]);
  const [dipendenti, setDipendenti] = useState<Array<{ id: string; nome: string; cognome: string }>>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const supabase = createClient();

      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenant?.tenant_id) return;

      // Load clienti
      const { data: clientiData } = await supabase
        .from('clienti')
        .select('id, ragione_sociale')
        .eq('tenant_id', userTenant.tenant_id)
        .order('ragione_sociale');

      if (clientiData) setClienti(clientiData);

      // Load commesse
      const { data: commesseData } = await supabase
        .from('commesse')
        .select('id, titolo')
        .eq('tenant_id', userTenant.tenant_id)
        .order('titolo');

      if (commesseData) setCommesse(commesseData);

      // Load dipendenti
      const { data: dipendentiData } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome')
        .eq('tenant_id', userTenant.tenant_id)
        .order('cognome, nome');

      if (dipendentiData) setDipendenti(dipendentiData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const data = await getAnalyticsData({
        dateFrom: filters.dateRange.from,
        dateTo: filters.dateRange.to,
        clienteId: filters.clienteId,
        commessaId: filters.commessaId,
        dipendenteId: filters.dipendenteId,
      });

      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Errore nel caricamento dei dati analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!analyticsData) {
      toast.error('Nessun dato da esportare');
      return;
    }

    try {
      exportToPDF(analyticsData, { dateRange: filters.dateRange });
      toast.success('Report PDF esportato con successo');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Errore durante l\'esportazione del PDF');
    }
  };

  const handleExportExcel = () => {
    if (!analyticsData) {
      toast.error('Nessun dato da esportare');
      return;
    }

    try {
      exportToExcel(analyticsData, { dateRange: filters.dateRange });
      toast.success('Report Excel esportato con successo');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Errore durante l\'esportazione di Excel');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Report Azienda
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analisi completa delle performance aziendali
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          clienti={clienti}
          commesse={commesse}
          dipendenti={dipendenti}
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <KPICard
            title="Fatturato Totale"
            value={analyticsData?.kpis.totalRevenue || 0}
            icon={DollarSign}
            format="currency"
            trend={
              analyticsData?.kpis.revenueChange
                ? {
                    value: analyticsData.kpis.revenueChange,
                    label: 'vs periodo precedente',
                  }
                : undefined
            }
            loading={loading}
          />
          <KPICard
            title="Margine"
            value={analyticsData?.kpis.margin || 0}
            icon={TrendingUp}
            format="currency"
            trend={
              analyticsData?.kpis.marginChange
                ? {
                    value: analyticsData.kpis.marginChange,
                    label: 'vs periodo precedente',
                  }
                : undefined
            }
            loading={loading}
          />
          <KPICard
            title="Margine %"
            value={analyticsData?.kpis.marginPercentage || 0}
            icon={Target}
            format="percentage"
            loading={loading}
          />
          <KPICard
            title="Commesse Attive"
            value={analyticsData?.kpis.activeProjects || 0}
            icon={Briefcase}
            format="number"
            loading={loading}
          />
          <KPICard
            title="Ore Lavorate"
            value={analyticsData?.kpis.totalHours || 0}
            icon={Clock}
            format="hours"
            trend={
              analyticsData?.kpis.hoursChange
                ? {
                    value: analyticsData.kpis.hoursChange,
                    label: 'vs periodo precedente',
                  }
                : undefined
            }
            loading={loading}
          />
        </div>

        {/* Alerts Panel */}
        {analyticsData && analyticsData.alerts.length > 0 && (
          <div className="mb-6">
            <AlertsPanel alerts={analyticsData.alerts} loading={loading} />
          </div>
        )}

        {/* Cash Flow Forecast - Full Width */}
        <div className="mb-6">
          <CashFlowForecast
            data={analyticsData?.cashFlowForecast || {
              saldoIniziale: 0,
              entratePrevistoMese1: 0,
              uscitePrevistoMese1: 0,
              entratePrevistoMese2: 0,
              uscitePrevistoMese2: 0,
              entratePrevistoMese3: 0,
              uscitePrevistoMese3: 0,
            }}
            loading={loading}
          />
        </div>

        {/* Two Column Layout - Budget vs Actual + Aging Report */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BudgetVsActual
            data={analyticsData?.budgetVsActual || []}
            loading={loading}
          />
          <AgingReport
            data={analyticsData?.agingReport || {
              range_0_30: { importo: 0, numeroFatture: 0 },
              range_31_60: { importo: 0, numeroFatture: 0 },
              range_61_90: { importo: 0, numeroFatture: 0 },
              range_over_90: { importo: 0, numeroFatture: 0 },
              totale: 0,
              dso: 0,
              clientiMorosi: [],
            }}
            loading={loading}
          />
        </div>

        {/* Revenue Chart - Full Width */}
        <div className="mb-6">
          <RevenueChart
            data={analyticsData?.revenueByMonth || []}
            loading={loading}
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CostsBreakdown
            data={analyticsData?.costsByCategory || []}
            loading={loading}
          />
          <ClientsAnalysis
            data={analyticsData?.topClients || []}
            loading={loading}
          />
        </div>

        {/* Margin by Project - Full Width */}
        <div className="mb-6">
          <MarginByProject
            data={analyticsData?.marginByProject || []}
            loading={loading}
          />
        </div>

        {/* Employee Hours - Full Width */}
        <div className="mb-6">
          <EmployeeHours
            data={analyticsData?.hoursByEmployee || []}
            loading={loading}
          />
        </div>

        {/* Profitability Trends - Full Width */}
        <div className="mb-6">
          <ProfitabilityTrends
            data={analyticsData?.profitabilityTrends || []}
            loading={loading}
          />
        </div>

        {/* Two Column Layout - Resource Utilization + Working Capital */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ResourceUtilization
            data={analyticsData?.resourceUtilization || []}
            loading={loading}
          />
          <WorkingCapital
            data={analyticsData?.workingCapital || {
              creditiCommerciali: 0,
              debitiCommerciali: 0,
              liquiditaDisponibile: 0,
              capitaleCircolanteNetto: 0,
              rapportoLiquidita: 0,
              giornoIncassoMedi: 0,
              giornoPagamentoMedi: 0,
              cicloCassa: 0,
            }}
            loading={loading}
          />
        </div>

        {/* Project Timeline - Full Width */}
        <div className="mb-6">
          <ProjectTimeline
            data={analyticsData?.projectTimeline || []}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
