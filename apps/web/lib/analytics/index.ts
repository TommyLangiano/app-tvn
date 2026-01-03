import { createClient } from '@/lib/supabase/client';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth, addMonths, differenceInDays } from 'date-fns';
import {
  calculateCashFlowForecast,
  calculateBudgetVsActual,
  calculateAgingReport,
  generateEnhancedAlerts,
  calculateProjectTimeline,
  calculateResourceUtilization,
  calculateProfitabilityTrends,
  calculateWorkingCapital,
} from './advanced-metrics';

export interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    totalCosts: number;
    margin: number;
    marginPercentage: number;
    activeProjects: number;
    totalHours: number;
    revenueChange: number;
    costsChange: number;
    marginChange: number;
    hoursChange: number;
  };
  revenueByMonth: Array<{
    month: string;
    fatturato: number;
    costi: number;
    margine: number;
  }>;
  costsByCategory: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  marginByProject: Array<{
    id: string;
    titolo: string;
    fatturato: number;
    costi: number;
    margine: number;
    marginPercentage: number;
  }>;
  hoursByEmployee: Array<{
    id: string;
    nome: string;
    cognome: string;
    ore_lavorate: number;
    ore_produttive: number;
    ore_pausa: number;
  }>;
  topClients: Array<{
    id: string;
    ragione_sociale: string;
    fatturato: number;
    numeroCommesse: number;
  }>;
  alerts: Array<{
    type: 'error' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    priority: number;
    suggestedActions?: string[];
    impact?: 'high' | 'medium' | 'low';
  }>;
  cashFlowForecast: {
    saldoIniziale: number;
    entratePrevistoMese1: number;
    uscitePrevistoMese1: number;
    entratePrevistoMese2: number;
    uscitePrevistoMese2: number;
    entratePrevistoMese3: number;
    uscitePrevistoMese3: number;
  };
  budgetVsActual: Array<{
    id: string;
    titolo: string;
    budgetPreventivo: number;
    costiEffettivi: number;
    fatturatoEffettivo: number;
    percentualeCompletamento: number;
    varianceBudget: number;
    variancePercentage: number;
  }>;
  agingReport: {
    range_0_30: { importo: number; numeroFatture: number };
    range_31_60: { importo: number; numeroFatture: number };
    range_61_90: { importo: number; numeroFatture: number };
    range_over_90: { importo: number; numeroFatture: number };
    totale: number;
    dso: number;
    clientiMorosi: Array<{
      id: string;
      ragione_sociale: string;
      importoScaduto: number;
      giorniRitardo: number;
    }>;
  };
  projectTimeline: Array<{
    id: string;
    titolo: string;
    data_inizio?: string;
    data_fine_prevista?: string;
    stato: string;
    percentualeCompletamento: number;
    cliente?: string;
  }>;
  resourceUtilization: Array<{
    dipendenteId: string;
    nome: string;
    cognome: string;
    oreLavorate: number;
    oreDisponibili: number;
    percentualeUtilizzo: number;
    numeroCommesse: number;
  }>;
  profitabilityTrends: Array<{
    mese: string;
    fatturato: number;
    costi: number;
    margine: number;
    marginePercentuale: number;
  }>;
  workingCapital: {
    creditiCommerciali: number;
    debitiCommerciali: number;
    liquiditaDisponibile: number;
    capitaleCircolanteNetto: number;
    rapportoLiquidita: number;
    giornoIncassoMedi: number;
    giornoPagamentoMedi: number;
    cicloCassa: number;
  };
  riepilogoEconomico: {
    fatturatoPrevisto: number;
    fatturatoEmesso: number;
    costiTotali: number;
    costiBustePaga: number;
    costiF24: number;
    noteSpesa: number;
    utileLordo: number;
    saldoIva: number;
  };
}

export interface AnalyticsFilters {
  dateFrom: Date;
  dateTo: Date;
  clienteId?: string;
  commessaId?: string;
  dipendenteId?: string;
}

function getEmptyAnalyticsData(): AnalyticsData {
  return {
    kpis: {
      totalRevenue: 0,
      totalCosts: 0,
      margin: 0,
      marginPercentage: 0,
      activeProjects: 0,
      totalHours: 0,
      revenueChange: 0,
      costsChange: 0,
      marginChange: 0,
      hoursChange: 0,
    },
    revenueByMonth: [],
    costsByCategory: [],
    marginByProject: [],
    hoursByEmployee: [],
    topClients: [],
    alerts: [{
      type: 'info',
      title: 'Nessun dato disponibile',
      message: 'Non ci sono dati per il periodo selezionato',
      priority: 1,
    }],
    cashFlowForecast: {
      saldoIniziale: 0,
      entratePrevistoMese1: 0,
      uscitePrevistoMese1: 0,
      entratePrevistoMese2: 0,
      uscitePrevistoMese2: 0,
      entratePrevistoMese3: 0,
      uscitePrevistoMese3: 0,
    },
    budgetVsActual: [],
    agingReport: {
      range_0_30: { importo: 0, numeroFatture: 0 },
      range_31_60: { importo: 0, numeroFatture: 0 },
      range_61_90: { importo: 0, numeroFatture: 0 },
      range_over_90: { importo: 0, numeroFatture: 0 },
      totale: 0,
      dso: 0,
      clientiMorosi: [],
    },
    projectTimeline: [],
    resourceUtilization: [],
    profitabilityTrends: [],
    workingCapital: {
      creditiCommerciali: 0,
      debitiCommerciali: 0,
      liquiditaDisponibile: 0,
      capitaleCircolanteNetto: 0,
      rapportoLiquidita: 0,
      giornoIncassoMedi: 0,
      giornoPagamentoMedi: 0,
      cicloCassa: 0,
    },
    riepilogoEconomico: {
      fatturatoPrevisto: 0,
      fatturatoEmesso: 0,
      costiTotali: 0,
      costiBustePaga: 0,
      costiF24: 0,
      noteSpesa: 0,
      utileLordo: 0,
      saldoIva: 0,
    },
  };
}

export async function getAnalyticsData(filters: AnalyticsFilters): Promise<AnalyticsData> {
  const supabase = createClient();

  try {
    // Get current user's tenant
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!userTenant?.tenant_id) throw new Error('No tenant found');

    const tenantId = userTenant.tenant_id;

    // Fetch commesse
    let commesseQuery = supabase
      .from('commesse')
      .select('*')
      .eq('tenant_id', tenantId);

    if (filters.clienteId) {
      commesseQuery = commesseQuery.eq('cliente_id', filters.clienteId);
    }

    if (filters.commessaId) {
      commesseQuery = commesseQuery.eq('id', filters.commessaId);
    }

    const { data: commesse, error: commesseError } = await commesseQuery;

    if (commesseError) {
      console.error('Error fetching commesse:', commesseError);
      return getEmptyAnalyticsData();
    }

    if (!commesse || commesse.length === 0) {
      return getEmptyAnalyticsData();
    }

    const commessaIds = commesse.map(c => c.id);

    // Fetch fatture attive (revenue)
    const { data: fatture } = await supabase
      .from('fatture_attive')
      .select('id, commessa_id, data_fattura, importo_totale, importo_imponibile, importo_iva')
      .in('commessa_id', commessaIds)
      .gte('data_fattura', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_fattura', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch fatture passive (costs)
    const { data: fatturePassive } = await supabase
      .from('fatture_passive')
      .select('id, commessa_id, data_fattura, importo_totale, importo_imponibile, importo_iva')
      .in('commessa_id', commessaIds)
      .gte('data_fattura', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_fattura', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch note spesa
    const { data: noteSpesa } = await supabase
      .from('note_spesa')
      .select('id, commessa_id, data_nota, importo')
      .in('commessa_id', commessaIds)
      .gte('data_nota', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_nota', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch buste paga dettaglio (costi del personale)
    // Filtrare per mese/anno in base al range di date
    const fromMonth = filters.dateFrom.getMonth() + 1;
    const fromYear = filters.dateFrom.getFullYear();
    const toMonth = filters.dateTo.getMonth() + 1;
    const toYear = filters.dateTo.getFullYear();

    const { data: bustePagaDettaglio, error: bustePagaError } = await supabase
      .from('buste_paga_dettaglio')
      .select(`
        id,
        commessa_id,
        importo_commessa,
        ore_commessa,
        buste_paga!inner(
          mese,
          anno,
          tenant_id
        )
      `)
      .eq('buste_paga.tenant_id', tenantId)
      .in('commessa_id', commessaIds);

    if (bustePagaError) {
      console.error('Error fetching buste paga:', bustePagaError);
    }

    console.log('🔍 Buste paga raw data:', bustePagaDettaglio);

    // Filtra client-side per mese/anno nel range
    const bustePagaFiltered = bustePagaDettaglio?.filter((bp: any) => {
      const bpYear = bp.buste_paga?.anno;
      const bpMonth = bp.buste_paga?.mese;

      if (!bpYear || !bpMonth) return false;

      if (fromYear === toYear) {
        return bpYear === fromYear && bpMonth >= fromMonth && bpMonth <= toMonth;
      } else {
        return (
          (bpYear === fromYear && bpMonth >= fromMonth) ||
          (bpYear === toYear && bpMonth <= toMonth) ||
          (bpYear > fromYear && bpYear < toYear)
        );
      }
    }) || [];

    console.log('🎯 Buste paga filtered:', bustePagaFiltered);
    console.log('💰 Total costi buste paga:', bustePagaFiltered.reduce((sum, bp) => sum + (bp.importo_commessa || 0), 0));

    // Fetch scontrini (costs with categories)
    const { data: scontrini } = await supabase
      .from('scontrini')
      .select('id, commessa_id, data_emissione, importo_totale, categoria')
      .in('commessa_id', commessaIds)
      .gte('data_emissione', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_emissione', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch clienti
    const clientiIds = Array.from(new Set(commesse.map(c => c.cliente_id).filter(id => id)));
    let clientiData: any[] = [];
    if (clientiIds.length > 0) {
      const { data } = await supabase
        .from('clienti')
        .select('id, ragione_sociale')
        .in('id', clientiIds);
      clientiData = data || [];
    }

    // Fetch rapportini
    let rapportiniQuery = supabase
      .from('rapportini')
      .select('id, dipendente_id, commessa_id, data_rapportino, ore_lavorate, tempo_pausa')
      .eq('tenant_id', tenantId)
      .gte('data_rapportino', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_rapportino', format(filters.dateTo, 'yyyy-MM-dd'));

    if (filters.commessaId) {
      rapportiniQuery = rapportiniQuery.eq('commessa_id', filters.commessaId);
    }

    if (filters.dipendenteId) {
      rapportiniQuery = rapportiniQuery.eq('dipendente_id', filters.dipendenteId);
    }

    const { data: rapportini } = await rapportiniQuery;

    // Fetch dipendenti
    const dipendentiIds = Array.from(new Set((rapportini || []).map(r => r.dipendente_id).filter(id => id)));
    let dipendentiData: any[] = [];
    if (dipendentiIds.length > 0) {
      const { data } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome')
        .in('id', dipendentiIds);
      dipendentiData = data || [];
    }

    // Build analytics data
    const analyticsData = buildAnalyticsData({
      commesse: commesse || [],
      fatture: fatture || [],
      fatturePassive: fatturePassive || [],
      scontrini: scontrini || [],
      noteSpesa: noteSpesa || [],
      bustePaga: bustePagaFiltered,
      clienti: clientiData,
      rapportini: rapportini || [],
      dipendenti: dipendentiData,
      filters,
    });

    return analyticsData;
  } catch (error) {
    console.error('Error in getAnalyticsData:', error);
    return getEmptyAnalyticsData();
  }
}

function buildAnalyticsData(params: {
  commesse: any[];
  fatture: any[];
  fatturePassive: any[];
  scontrini: any[];
  noteSpesa: any[];
  bustePaga: any[];
  clienti: any[];
  rapportini: any[];
  dipendenti: any[];
  filters: AnalyticsFilters;
}): AnalyticsData {
  const { commesse, fatture, fatturePassive, scontrini, noteSpesa, bustePaga, clienti, rapportini, dipendenti, filters } = params;

  // Calculate total revenue
  const totalRevenue = (fatture || []).reduce((sum, f) => sum + (f.importo_totale || 0), 0);

  // Calculate total costs
  const totalCosts =
    ((fatturePassive || []).reduce((sum, f) => sum + (f.importo_totale || 0), 0)) +
    ((scontrini || []).reduce((sum, s) => sum + (s.importo_totale || 0), 0));

  // Calculate margin
  const margin = totalRevenue - totalCosts;
  const marginPercentage = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

  // Active projects
  const activeProjects = commesse.filter(c => c.stato !== 'completata' && c.stato !== 'archiviata').length;

  // Total hours
  const totalHours = (rapportini || []).reduce((sum, r) => sum + (r.ore_lavorate || 0), 0);

  // KPIs
  const kpis = {
    totalRevenue,
    totalCosts,
    margin,
    marginPercentage,
    activeProjects,
    totalHours,
    revenueChange: 0,
    costsChange: 0,
    marginChange: 0,
    hoursChange: 0,
  };

  // Revenue by month
  const revenueByMonth = calculateRevenueByMonth(fatture, fatturePassive, scontrini, filters);

  // Costs by category
  const costsByCategory = calculateCostsByCategory(scontrini);

  // Margin by project
  const marginByProject = calculateMarginByProject(commesse, fatture, fatturePassive, scontrini);

  // Hours by employee
  const hoursByEmployee = calculateHoursByEmployee(rapportini, dipendenti);

  // Top clients
  const topClients = calculateTopClients(commesse, fatture, clienti);

  // Advanced metrics
  const cashFlowForecast = calculateCashFlowForecast(fatture, fatturePassive, scontrini);
  const budgetVsActual = calculateBudgetVsActual(commesse, fatture, fatturePassive, scontrini);
  const agingReport = calculateAgingReport(fatture, clienti);
  const projectTimeline = calculateProjectTimeline(commesse, clienti);
  const resourceUtilization = calculateResourceUtilization(rapportini, dipendenti);
  const profitabilityTrends = calculateProfitabilityTrends(fatture, fatturePassive, scontrini, filters);
  const workingCapital = calculateWorkingCapital(fatture, fatturePassive, scontrini);

  // Enhanced alerts with suggested actions
  const alerts = generateEnhancedAlerts(kpis, marginByProject, cashFlowForecast, agingReport, budgetVsActual);

  // Riepilogo Economico
  const riepilogoEconomico = calculateRiepilogoEconomico(commesse, fatture, fatturePassive, noteSpesa, bustePaga, []);

  return {
    kpis,
    revenueByMonth,
    costsByCategory,
    marginByProject,
    hoursByEmployee,
    topClients,
    alerts,
    cashFlowForecast,
    budgetVsActual,
    agingReport,
    projectTimeline,
    resourceUtilization,
    profitabilityTrends,
    workingCapital,
    riepilogoEconomico,
  };
}

function calculateRevenueByMonth(fatture: any[], fatturePassive: any[], scontrini: any[], filters: AnalyticsFilters) {
  const months = eachMonthOfInterval({
    start: filters.dateFrom,
    end: filters.dateTo,
  });

  return months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const fatturato = fatture
      .filter(f => {
        const date = new Date(f.data_emissione);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costiPassive = fatturePassive
      .filter(f => {
        const date = new Date(f.data_emissione);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costiScontrini = scontrini
      .filter(s => {
        const date = new Date(s.data_emissione);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((sum, s) => sum + (s.importo_totale || 0), 0);

    const costi = costiPassive + costiScontrini;

    return {
      month: format(month, 'MMM yyyy'),
      fatturato,
      costi,
      margine: fatturato - costi,
    };
  });
}

function calculateCostsByCategory(scontrini: any[]) {
  const categories: Record<string, number> = {};

  scontrini.forEach(s => {
    const categoria = s.categoria || 'Altro';
    categories[categoria] = (categories[categoria] || 0) + (s.importo_totale || 0);
  });

  const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

  return Object.entries(categories)
    .map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function calculateMarginByProject(commesse: any[], fatture: any[], fatturePassive: any[], scontrini: any[]) {
  return commesse
    .map(commessa => {
      const fatturatoCommessa = fatture
        .filter(f => f.commessa_id === commessa.id)
        .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

      const costiPassiveCommessa = fatturePassive
        .filter(f => f.commessa_id === commessa.id)
        .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

      const costiScontriniCommessa = scontrini
        .filter(s => s.commessa_id === commessa.id)
        .reduce((sum, s) => sum + (s.importo_totale || 0), 0);

      const costi = costiPassiveCommessa + costiScontriniCommessa;
      const margine = fatturatoCommessa - costi;
      const marginPercentage = fatturatoCommessa > 0 ? (margine / fatturatoCommessa) * 100 : 0;

      return {
        id: commessa.id,
        titolo: commessa.titolo,
        fatturato: fatturatoCommessa,
        costi,
        margine,
        marginPercentage,
      };
    })
    .filter(p => p.fatturato > 0 || p.costi > 0)
    .sort((a, b) => b.margine - a.margine);
}

function calculateHoursByEmployee(rapportini: any[], dipendenti: any[]) {
  const employeeHours: Record<string, any> = {};

  rapportini.forEach(rapportino => {
    const empId = rapportino.dipendente_id;
    if (!empId) return;

    if (!employeeHours[empId]) {
      const dip = dipendenti.find(d => d.id === empId);
      employeeHours[empId] = {
        id: empId,
        nome: dip?.nome || '',
        cognome: dip?.cognome || '',
        ore_lavorate: 0,
        ore_produttive: 0,
        ore_pausa: 0,
      };
    }

    const oreLavorate = rapportino.ore_lavorate || 0;
    const tempoPausa = (rapportino.tempo_pausa || 0) / 60; // convert minutes to hours

    employeeHours[empId].ore_lavorate += oreLavorate;
    employeeHours[empId].ore_pausa += tempoPausa;
    employeeHours[empId].ore_produttive += oreLavorate - tempoPausa;
  });

  return Object.values(employeeHours).sort((a: any, b: any) => b.ore_lavorate - a.ore_lavorate);
}

function calculateTopClients(commesse: any[], fatture: any[], clienti: any[]) {
  const clientStats: Record<string, any> = {};

  commesse.forEach(commessa => {
    const clienteId = commessa.cliente_id;
    if (!clienteId) return;

    if (!clientStats[clienteId]) {
      const cliente = clienti.find(c => c.id === clienteId);
      clientStats[clienteId] = {
        id: clienteId,
        ragione_sociale: cliente?.ragione_sociale || 'Sconosciuto',
        fatturato: 0,
        numeroCommesse: 0,
      };
    }

    const fatturatoCommessa = fatture
      .filter(f => f.commessa_id === commessa.id)
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    clientStats[clienteId].fatturato += fatturatoCommessa;
    clientStats[clienteId].numeroCommesse += 1;
  });

  return Object.values(clientStats)
    .filter((c: any) => c.fatturato > 0)
    .sort((a: any, b: any) => b.fatturato - a.fatturato)
    .slice(0, 10);
}

function calculateRiepilogoEconomico(
  commesse: any[],
  fatture: any[],
  fatturePassive: any[],
  noteSpesa: any[],
  bustePaga: any[],
  f24: any[] = []
) {
  // 1. Fatturato Totale Previsto: somma degli importo_commessa di tutte le commesse
  const fatturatoPrevisto = commesse.reduce((sum, c) => {
    return sum + (c.importo_commessa || c.budget_commessa || 0);
  }, 0);

  // 2. Totale Imponibile Fatturato: somma di tutte le fatture emesse (imponibile)
  const fatturatoEmesso = fatture.reduce((sum, f) => {
    return sum + (f.importo_imponibile || 0);
  }, 0);

  // 3. Totale Imponibile Costi: somma di tutte le fatture passive (imponibile)
  const costiTotali = fatturePassive.reduce((sum, f) => {
    return sum + (f.importo_imponibile || 0);
  }, 0);

  // 3b. Costi Buste Paga: somma di tutti gli importi delle buste paga
  const costiBustePaga = bustePaga.reduce((sum, bp) => {
    return sum + (bp.importo_commessa || 0);
  }, 0);

  // 3c. Costi F24: somma di tutti gli importi F24
  const costiF24 = f24.reduce((sum, f) => {
    return sum + (f.valore_f24_commessa || 0);
  }, 0);

  // 4. Note spesa: somma di tutte le note spesa
  const totaleNoteSpesa = noteSpesa.reduce((sum, n) => {
    return sum + (n.importo || 0);
  }, 0);

  // 5. Utile Lordo: Fatturato Emesso - Costi Totali - Costi Buste Paga - Costi F24 - Note spesa
  const utileLordo = fatturatoEmesso - costiTotali - costiBustePaga - costiF24 - totaleNoteSpesa;

  // 6. Saldo IVA: IVA fatture passive (IVA a credito) - IVA fatture attive (IVA a debito)
  const ivaFatturePassive = fatturePassive.reduce((sum, f) => {
    return sum + (f.importo_iva || 0);
  }, 0);

  const ivaFattureAttive = fatture.reduce((sum, f) => {
    return sum + (f.importo_iva || 0);
  }, 0);

  const saldoIva = ivaFatturePassive - ivaFattureAttive;

  return {
    fatturatoPrevisto,
    fatturatoEmesso,
    costiTotali,
    costiBustePaga,
    costiF24,
    noteSpesa: totaleNoteSpesa,
    utileLordo,
    saldoIva,
  };
}

