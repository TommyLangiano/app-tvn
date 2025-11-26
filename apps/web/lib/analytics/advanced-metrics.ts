import { differenceInDays, addMonths } from 'date-fns';

// Cash Flow Forecast calculation
export function calculateCashFlowForecast(
  fatture: any[],
  fatturePassive: any[],
  scontrini: any[]
) {
  const today = new Date();

  // Saldo iniziale (approssimato come fatturato - costi ultimi 30 giorni)
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentRevenue = fatture
    .filter(f => new Date(f.data_emissione) >= last30Days)
    .reduce((sum, f) => sum + (f.importo_totale || 0), 0);
  const recentCosts =
    fatturePassive.filter(f => new Date(f.data_emissione) >= last30Days).reduce((sum, f) => sum + (f.importo_totale || 0), 0) +
    scontrini.filter(s => new Date(s.data_emissione) >= last30Days).reduce((sum, s) => sum + (s.importo_totale || 0), 0);

  const saldoIniziale = recentRevenue - recentCosts;

  // Calcola media entrate e uscite ultimi 3 mesi
  const last90Days = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const totalRevenue3M = fatture
    .filter(f => new Date(f.data_emissione) >= last90Days)
    .reduce((sum, f) => sum + (f.importo_totale || 0), 0);
  const totalCosts3M =
    fatturePassive.filter(f => new Date(f.data_emissione) >= last90Days).reduce((sum, f) => sum + (f.importo_totale || 0), 0) +
    scontrini.filter(s => new Date(s.data_emissione) >= last90Days).reduce((sum, s) => sum + (s.importo_totale || 0), 0);

  const avgMonthlyRevenue = totalRevenue3M / 3;
  const avgMonthlyCosts = totalCosts3M / 3;

  return {
    saldoIniziale,
    entratePrevistoMese1: avgMonthlyRevenue,
    uscitePrevistoMese1: avgMonthlyCosts,
    entratePrevistoMese2: avgMonthlyRevenue * 0.95, // Slightly conservative
    uscitePrevistoMese2: avgMonthlyCosts * 1.05,
    entratePrevistoMese3: avgMonthlyRevenue * 0.90,
    uscitePrevistoMese3: avgMonthlyCosts * 1.10,
  };
}

// Budget vs Actual calculation
export function calculateBudgetVsActual(
  commesse: any[],
  fatture: any[],
  fatturePassive: any[],
  scontrini: any[]
) {
  return commesse.map(commessa => {
    const fatturatoEffettivo = fatture
      .filter(f => f.commessa_id === commessa.id)
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

    const costiEffettivi =
      fatturePassive.filter(f => f.commessa_id === commessa.id).reduce((sum, f) => sum + (f.importo_totale || 0), 0) +
      scontrini.filter(s => s.commessa_id === commessa.id).reduce((sum, s) => sum + (s.importo_totale || 0), 0);

    // Use budget_preventivo if available, otherwise estimate from current data
    const budgetPreventivo = commessa.budget_preventivo || fatturatoEffettivo * 1.2;

    // Estimate completion percentage (simplified - in real app this should come from project management)
    const percentualeCompletamento = fatturatoEffettivo > 0
      ? Math.min(100, (fatturatoEffettivo / budgetPreventivo) * 100)
      : 0;

    const varianceBudget = budgetPreventivo - costiEffettivi;
    const variancePercentage = budgetPreventivo > 0
      ? ((budgetPreventivo - costiEffettivi) / budgetPreventivo) * 100
      : 0;

    return {
      id: commessa.id,
      titolo: commessa.titolo,
      budgetPreventivo,
      costiEffettivi,
      fatturatoEffettivo,
      percentualeCompletamento,
      varianceBudget,
      variancePercentage,
    };
  }).sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage));
}

// Aging Report calculation
export function calculateAgingReport(
  fatture: any[],
  clienti: any[]
) {
  const today = new Date();

  const agingData = {
    range_0_30: { importo: 0, numeroFatture: 0 },
    range_31_60: { importo: 0, numeroFatture: 0 },
    range_61_90: { importo: 0, numeroFatture: 0 },
    range_over_90: { importo: 0, numeroFatture: 0 },
    totale: 0,
    dso: 0,
    clientiMorosi: [] as Array<{
      id: string;
      ragione_sociale: string;
      importoScaduto: number;
      giorniRitardo: number;
    }>,
  };

  // Group unpaid invoices by age
  const unpaidFatture = fatture.filter(f => !f.pagata && f.data_scadenza);

  const clientiMorosiMap: Record<string, { importo: number; maxGiorni: number }> = {};

  unpaidFatture.forEach(fattura => {
    const scadenza = new Date(fattura.data_scadenza);
    const giorniRitardo = differenceInDays(today, scadenza);
    const importo = fattura.importo_totale || 0;

    agingData.totale += importo;

    if (giorniRitardo <= 30) {
      agingData.range_0_30.importo += importo;
      agingData.range_0_30.numeroFatture++;
    } else if (giorniRitardo <= 60) {
      agingData.range_31_60.importo += importo;
      agingData.range_31_60.numeroFatture++;
    } else if (giorniRitardo <= 90) {
      agingData.range_61_90.importo += importo;
      agingData.range_61_90.numeroFatture++;
    } else {
      agingData.range_over_90.importo += importo;
      agingData.range_over_90.numeroFatture++;
    }

    // Track clients with overdue invoices
    if (giorniRitardo > 30 && fattura.cliente_id) {
      if (!clientiMorosiMap[fattura.cliente_id]) {
        clientiMorosiMap[fattura.cliente_id] = { importo: 0, maxGiorni: 0 };
      }
      clientiMorosiMap[fattura.cliente_id].importo += importo;
      clientiMorosiMap[fattura.cliente_id].maxGiorni = Math.max(
        clientiMorosiMap[fattura.cliente_id].maxGiorni,
        giorniRitardo
      );
    }
  });

  // Calculate DSO (Days Sales Outstanding)
  const totalRevenue = fatture.reduce((sum, f) => sum + (f.importo_totale || 0), 0);
  agingData.dso = totalRevenue > 0 ? (agingData.totale / totalRevenue) * 365 : 0;

  // Build clienti morosi list
  agingData.clientiMorosi = Object.entries(clientiMorosiMap)
    .map(([clienteId, data]) => {
      const cliente = clienti.find(c => c.id === clienteId);
      return {
        id: clienteId,
        ragione_sociale: cliente?.ragione_sociale || 'Sconosciuto',
        importoScaduto: data.importo,
        giorniRitardo: data.maxGiorni,
      };
    })
    .sort((a, b) => b.importoScaduto - a.importoScaduto);

  return agingData;
}

// Enhanced Alerts with suggested actions
export function generateEnhancedAlerts(
  kpis: any,
  marginByProject: any[],
  cashFlowForecast: any,
  agingReport: any,
  budgetVsActual: any[]
) {
  const alerts: Array<{
    type: 'error' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    priority: number;
    suggestedActions?: string[];
    impact?: 'high' | 'medium' | 'low';
  }> = [];

  // Cash Flow Alerts
  const saldoMese1 = cashFlowForecast.saldoIniziale + cashFlowForecast.entratePrevistoMese1 - cashFlowForecast.uscitePrevistoMese1;
  const saldoMese2 = saldoMese1 + cashFlowForecast.entratePrevistoMese2 - cashFlowForecast.uscitePrevistoMese2;

  if (saldoMese1 < 0) {
    alerts.push({
      type: 'error',
      title: 'Cash Flow Negativo tra 30 giorni',
      message: `Il saldo previsto sarà negativo tra 30 giorni. Azione immediata richiesta.`,
      priority: 1,
      impact: 'high',
      suggestedActions: [
        'Accelerare la riscossione dei crediti scaduti',
        'Posticipare pagamenti non urgenti',
        'Contattare la banca per linea di credito temporanea',
        'Emettere fatture in sospeso immediatamente',
      ],
    });
  } else if (saldoMese2 < 0) {
    alerts.push({
      type: 'warning',
      title: 'Cash Flow Negativo tra 60 giorni',
      message: `Il saldo diventerà negativo tra 60 giorni se il trend continua.`,
      priority: 2,
      impact: 'high',
      suggestedActions: [
        'Monitorare incassi e pagamenti settimanalmente',
        'Pianificare flussi di cassa con clienti principali',
        'Considerare riduzione spese discrezionali',
      ],
    });
  }

  // Aging Report Alerts
  const criticalOverdue = agingReport.range_over_90.importo;
  if (criticalOverdue > 0) {
    alerts.push({
      type: 'error',
      title: 'Crediti Scaduti da oltre 90 giorni',
      message: `€${criticalOverdue.toFixed(0)} in fatture scadute da oltre 90 giorni. Rischio insolvenza.`,
      priority: 1,
      impact: 'high',
      suggestedActions: [
        'Inviare sollecito formale ai clienti morosi',
        'Considerare azioni legali per importi significativi',
        'Sospendere nuove forniture fino a pagamento',
        'Valutare cessione del credito (factoring)',
      ],
    });
  }

  if (agingReport.dso > 60) {
    alerts.push({
      type: 'warning',
      title: 'DSO Elevato',
      message: `Days Sales Outstanding: ${agingReport.dso.toFixed(0)} giorni (target: <45 giorni)`,
      priority: 2,
      impact: 'medium',
      suggestedActions: [
        'Implementare politiche di pagamento più stringenti',
        'Offrire sconti per pagamenti anticipati',
        'Richiedere acconti su nuovi progetti',
      ],
    });
  }

  // Budget Variance Alerts
  const projectsOverBudget = budgetVsActual.filter(p => p.variancePercentage < -10);
  if (projectsOverBudget.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${projectsOverBudget.length} Commesse Oltre Budget`,
      message: `Ci sono commesse con costi superiori al preventivo del 10%+`,
      priority: 2,
      impact: 'high',
      suggestedActions: [
        'Analizzare cause degli extra-costi per commessa',
        'Aggiornare preventivi clienti se contrattualmente possibile',
        'Implementare controlli settimanali su budget progetti',
        'Rivedere processi di stima costi',
      ],
    });
  }

  // Loss Projects Alert
  const lossProjects = marginByProject.filter(p => p.margine < 0);
  if (lossProjects.length > 0) {
    alerts.push({
      type: 'error',
      title: 'Commesse in Perdita',
      message: `${lossProjects.length} commessa/e con margine negativo`,
      priority: 1,
      impact: 'high',
      suggestedActions: [
        'Identificare cause delle perdite (materiali, ore extra, errori)',
        'Valutare se continuare o chiudere le commesse',
        'Negoziare varianti contrattuali con clienti',
        'Ridurre costi operativi dove possibile',
      ],
    });
  }

  // Low Margin Alert
  if (kpis.marginPercentage < 10 && kpis.totalRevenue > 0) {
    alerts.push({
      type: 'warning',
      title: 'Margine Aziendale Basso',
      message: `Il margine è solo del ${kpis.marginPercentage.toFixed(1)}% (target: >20%)`,
      priority: 2,
      impact: 'medium',
      suggestedActions: [
        'Aumentare prezzi su nuovi preventivi',
        'Ottimizzare processi per ridurre costi',
        'Focus su commesse ad alto margine',
        'Rinegoziare condizioni con fornitori',
      ],
    });
  }

  // Success Alert
  if (kpis.marginPercentage > 30 && kpis.totalRevenue > 0) {
    alerts.push({
      type: 'success',
      title: 'Ottima Performance',
      message: `Margine eccellente: ${kpis.marginPercentage.toFixed(1)}%`,
      priority: 3,
      impact: 'low',
      suggestedActions: [
        'Mantenere focus su commesse profittevoli',
        'Considerare investimenti in crescita',
        'Premiare team per risultati',
      ],
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      title: 'Situazione Stabile',
      message: 'Nessun problema critico rilevato. Continuare il monitoraggio.',
      priority: 3,
      impact: 'low',
    });
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}

// Project Timeline calculation
export function calculateProjectTimeline(
  commesse: any[],
  clienti: any[]
) {
  return commesse.map(commessa => {
    const cliente = clienti.find(c => c.id === commessa.cliente_id);

    // Stima percentuale completamento basata su date
    let percentualeCompletamento = 0;
    if (commessa.data_inizio && commessa.data_fine_prevista) {
      const start = new Date(commessa.data_inizio);
      const end = new Date(commessa.data_fine_prevista);
      const now = new Date();
      const total = differenceInDays(end, start);
      const elapsed = differenceInDays(now, start);
      percentualeCompletamento = Math.min(100, Math.max(0, (elapsed / total) * 100));

      // Se completata, 100%
      if (commessa.stato === 'completata') {
        percentualeCompletamento = 100;
      }
    }

    return {
      id: commessa.id,
      titolo: commessa.titolo,
      data_inizio: commessa.data_inizio,
      data_fine_prevista: commessa.data_fine_prevista,
      stato: commessa.stato,
      percentualeCompletamento,
      cliente: cliente?.ragione_sociale,
    };
  });
}

// Resource Utilization calculation
export function calculateResourceUtilization(
  rapportini: any[],
  dipendenti: any[]
) {
  // Ore disponibili mensili standard (assumiamo 160 ore/mese per dipendente a tempo pieno)
  const oreDisponibiliMensili = 160;

  return dipendenti.map(dipendente => {
    const rapportiniDipendente = rapportini.filter(r => r.dipendente_id === dipendente.id);

    const oreLavorate = rapportiniDipendente.reduce((sum, r) => {
      const ore = r.ore_lavorate || 0;
      const minuti = r.minuti_lavorati || 0;
      return sum + ore + (minuti / 60);
    }, 0);

    const numeroCommesse = new Set(rapportiniDipendente.map(r => r.commessa_id)).size;
    const percentualeUtilizzo = (oreLavorate / oreDisponibiliMensili) * 100;

    return {
      dipendenteId: dipendente.id,
      nome: dipendente.nome,
      cognome: dipendente.cognome,
      oreLavorate,
      oreDisponibili: oreDisponibiliMensili,
      percentualeUtilizzo,
      numeroCommesse,
    };
  });
}

// Profitability Trends calculation
export function calculateProfitabilityTrends(
  fatture: any[],
  fatturePassive: any[],
  scontrini: any[],
  filters: { dateFrom: Date; dateTo: Date }
) {
  const { dateFrom, dateTo } = filters;
  const months: any[] = [];

  let currentDate = new Date(dateFrom);
  while (currentDate <= dateTo) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

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
    const margine = fatturato - costi;
    const marginePercentuale = fatturato > 0 ? (margine / fatturato) * 100 : 0;

    months.push({
      mese: currentDate.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' }),
      fatturato,
      costi,
      margine,
      marginePercentuale,
    });

    currentDate = addMonths(currentDate, 1);
  }

  return months;
}

// Working Capital Analysis calculation
export function calculateWorkingCapital(
  fatture: any[],
  fatturePassive: any[],
  scontrini: any[]
) {
  const today = new Date();

  // Crediti commerciali (fatture attive non pagate)
  const creditiCommerciali = fatture
    .filter(f => f.stato !== 'pagata' && f.stato !== 'annullata')
    .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

  // Debiti commerciali (fatture passive non pagate)
  const debitiCommerciali = fatturePassive
    .filter(f => f.stato !== 'pagata' && f.stato !== 'annullata')
    .reduce((sum, f) => sum + (f.importo_totale || 0), 0);

  // Liquidità disponibile (approssimata come fatture pagate meno costi pagati ultimi 30gg)
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const incassiRecenti = fatture
    .filter(f => f.stato === 'pagata' && new Date(f.data_pagamento || f.data_emissione) >= last30Days)
    .reduce((sum, f) => sum + (f.importo_totale || 0), 0);
  const pagamentiRecenti =
    fatturePassive
      .filter(f => f.stato === 'pagata' && new Date(f.data_pagamento || f.data_emissione) >= last30Days)
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0) +
    scontrini
      .filter(s => new Date(s.data_emissione) >= last30Days)
      .reduce((sum, s) => sum + (s.importo_totale || 0), 0);

  const liquiditaDisponibile = Math.max(0, incassiRecenti - pagamentiRecenti);

  // Capitale circolante netto
  const capitaleCircolanteNetto = creditiCommerciali - debitiCommerciali + liquiditaDisponibile;

  // Current Ratio (attività correnti / passività correnti)
  const attivitaCorrenti = creditiCommerciali + liquiditaDisponibile;
  const passivitaCorrenti = debitiCommerciali || 1; // Evita divisione per zero
  const rapportoLiquidita = attivitaCorrenti / passivitaCorrenti;

  // DSO - Days Sales Outstanding
  const last90Days = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fatturato90gg = fatture
    .filter(f => new Date(f.data_emissione) >= last90Days)
    .reduce((sum, f) => sum + (f.importo_totale || 0), 0);
  const fatturatoGiornaliero = fatturato90gg / 90;
  const giornoIncassoMedi = fatturatoGiornaliero > 0 ? creditiCommerciali / fatturatoGiornaliero : 0;

  // DPO - Days Payable Outstanding
  const costi90gg =
    fatturePassive
      .filter(f => new Date(f.data_emissione) >= last90Days)
      .reduce((sum, f) => sum + (f.importo_totale || 0), 0) +
    scontrini
      .filter(s => new Date(s.data_emissione) >= last90Days)
      .reduce((sum, s) => sum + (s.importo_totale || 0), 0);
  const costiGiornalieri = costi90gg / 90;
  const giornoPagamentoMedi = costiGiornalieri > 0 ? debitiCommerciali / costiGiornalieri : 0;

  // Cash Conversion Cycle
  const cicloCassa = giornoIncassoMedi - giornoPagamentoMedi;

  return {
    creditiCommerciali,
    debitiCommerciali,
    liquiditaDisponibile,
    capitaleCircolanteNetto,
    rapportoLiquidita,
    giornoIncassoMedi,
    giornoPagamentoMedi,
    cicloCassa,
  };
}
