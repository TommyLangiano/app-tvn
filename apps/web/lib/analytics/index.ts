import { createClient } from '@/lib/supabase/client';
import { format, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

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
  }>;
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
      .select('id, commessa_id, data_emissione, importo_totale')
      .in('commessa_id', commessaIds)
      .gte('data_emissione', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_emissione', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch fatture passive (costs)
    const { data: fatturePassive } = await supabase
      .from('fatture_passive')
      .select('id, commessa_id, data_emissione, importo_totale')
      .in('commessa_id', commessaIds)
      .gte('data_emissione', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_emissione', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch scontrini (costs with categories)
    const { data: scontrini } = await supabase
      .from('scontrini')
      .select('id, commessa_id, data_emissione, importo_totale, categoria')
      .in('commessa_id', commessaIds)
      .gte('data_emissione', format(filters.dateFrom, 'yyyy-MM-dd'))
      .lte('data_emissione', format(filters.dateTo, 'yyyy-MM-dd'));

    // Fetch clienti
    const clientiIds = [...new Set(commesse.map(c => c.cliente_id).filter(id => id))];
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
    const dipendentiIds = [...new Set((rapportini || []).map(r => r.dipendente_id).filter(id => id))];
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
  clienti: any[];
  rapportini: any[];
  dipendenti: any[];
  filters: AnalyticsFilters;
}): AnalyticsData {
  const { commesse, fatture, fatturePassive, scontrini, clienti, rapportini, dipendenti, filters } = params;

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

  // Alerts
  const alerts = generateAlerts(kpis, marginByProject);

  return {
    kpis,
    revenueByMonth,
    costsByCategory,
    marginByProject,
    hoursByEmployee,
    topClients,
    alerts,
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

function generateAlerts(kpis: any, marginByProject: any[]) {
  const alerts: any[] = [];

  // Check for projects with negative margin
  const lossProjects = marginByProject.filter(p => p.margine < 0);

  if (lossProjects.length > 0) {
    alerts.push({
      type: 'error',
      title: 'Commesse in perdita',
      message: `${lossProjects.length} commessa/e con margine negativo`,
      priority: 1,
    });
  }

  // Check for low margin percentage
  if (kpis.marginPercentage < 10 && kpis.totalRevenue > 0) {
    alerts.push({
      type: 'warning',
      title: 'Margine basso',
      message: `Il margine è solo del ${kpis.marginPercentage.toFixed(1)}%`,
      priority: 2,
    });
  }

  // Check for good performance
  if (kpis.marginPercentage > 30 && kpis.totalRevenue > 0) {
    alerts.push({
      type: 'success',
      title: 'Ottima performance',
      message: `Margine eccellente: ${kpis.marginPercentage.toFixed(1)}%`,
      priority: 3,
    });
  }

  // Check for high costs
  if (kpis.totalCosts > kpis.totalRevenue * 0.8 && kpis.totalRevenue > 0) {
    alerts.push({
      type: 'warning',
      title: 'Costi elevati',
      message: `I costi rappresentano l'${((kpis.totalCosts / kpis.totalRevenue) * 100).toFixed(0)}% del fatturato`,
      priority: 2,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'success',
      title: 'Tutto ok',
      message: 'Nessun problema rilevato',
      priority: 3,
    });
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}
