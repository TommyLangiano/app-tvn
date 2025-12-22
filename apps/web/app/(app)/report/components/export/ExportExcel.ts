import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { AnalyticsData } from '@/lib/analytics';
import type { DateRange } from '../FilterBar';
import { formatCurrency } from '@/lib/utils/currency';

export function exportToExcel(data: AnalyticsData, filters: { dateRange: DateRange }) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: KPIs
  const kpisData = [
    ['REPORT AZIENDALE'],
    [''],
    ['Periodo:', `${format(filters.dateRange.from, 'dd MMMM yyyy', { locale: it })} - ${format(filters.dateRange.to, 'dd MMMM yyyy', { locale: it })}`],
    ['Generato:', format(new Date(), 'dd/MM/yyyy HH:mm')],
    [''],
    ['INDICATORI CHIAVE (KPI)'],
    [''],
    ['Indicatore', 'Valore'],
    ['Fatturato Totale', formatCurrency(data.kpis.totalRevenue)],
    ['Costi Totali', formatCurrency(data.kpis.totalCosts)],
    ['Margine', formatCurrency(data.kpis.margin)],
    ['Margine %', `${data.kpis.marginPercentage.toFixed(1)}%`],
    ['Commesse Attive', data.kpis.activeProjects],
    ['Ore Lavorate Totali', `${data.kpis.totalHours.toFixed(0)}h`],
  ];

  const kpisSheet = XLSX.utils.aoa_to_sheet(kpisData);
  XLSX.utils.book_append_sheet(workbook, kpisSheet, 'KPI');

  // Sheet 2: Revenue by Month
  if (data.revenueByMonth.length > 0) {
    const revenueData = [
      ['ANDAMENTO MENSILE'],
      [''],
      ['Mese', 'Fatturato', 'Costi', 'Margine'],
      ...data.revenueByMonth.map(item => [
        item.month,
        item.fatturato,
        item.costi,
        item.margine,
      ]),
    ];

    const revenueSheet = XLSX.utils.aoa_to_sheet(revenueData);

    // Format currency columns
    const range = XLSX.utils.decode_range(revenueSheet['!ref'] || 'A1');
    for (let row = 3; row <= range.e.r; row++) {
      for (let col = 1; col <= 3; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (revenueSheet[cellAddress]) {
          revenueSheet[cellAddress].z = '€#,##0.00';
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Andamento Mensile');
  }

  // Sheet 3: Costs by Category
  if (data.costsByCategory.length > 0) {
    const costsData = [
      ['DISTRIBUZIONE COSTI PER CATEGORIA'],
      [''],
      ['Categoria', 'Importo', 'Percentuale'],
      ...data.costsByCategory.map(item => [
        item.name,
        item.value,
        `${item.percentage.toFixed(1)}%`,
      ]),
    ];

    const costsSheet = XLSX.utils.aoa_to_sheet(costsData);

    // Format currency column
    const range = XLSX.utils.decode_range(costsSheet['!ref'] || 'A1');
    for (let row = 3; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 });
      if (costsSheet[cellAddress]) {
        costsSheet[cellAddress].z = '€#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(workbook, costsSheet, 'Costi per Categoria');
  }

  // Sheet 4: Margin by Project
  if (data.marginByProject.length > 0) {
    const marginData = [
      ['MARGINE PER COMMESSA'],
      [''],
      ['Commessa', 'Fatturato', 'Costi', 'Margine', 'Margine %'],
      ...data.marginByProject.map(item => [
        item.titolo,
        item.fatturato,
        item.costi,
        item.margine,
        `${item.marginPercentage.toFixed(1)}%`,
      ]),
    ];

    const marginSheet = XLSX.utils.aoa_to_sheet(marginData);

    // Format currency columns
    const range = XLSX.utils.decode_range(marginSheet['!ref'] || 'A1');
    for (let row = 3; row <= range.e.r; row++) {
      for (let col = 1; col <= 3; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (marginSheet[cellAddress]) {
          marginSheet[cellAddress].z = '€#,##0.00';
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, marginSheet, 'Margine Commesse');
  }

  // Sheet 5: Top Clients
  if (data.topClients.length > 0) {
    const clientsData = [
      ['TOP CLIENTI PER FATTURATO'],
      [''],
      ['Cliente', 'Fatturato', 'N° Commesse', 'Media per Commessa'],
      ...data.topClients.map(item => [
        item.ragione_sociale,
        item.fatturato,
        item.numeroCommesse,
        item.fatturato / item.numeroCommesse,
      ]),
    ];

    const clientsSheet = XLSX.utils.aoa_to_sheet(clientsData);

    // Format currency columns
    const range = XLSX.utils.decode_range(clientsSheet['!ref'] || 'A1');
    for (let row = 3; row <= range.e.r; row++) {
      const cellAddressB = XLSX.utils.encode_cell({ r: row, c: 1 });
      const cellAddressD = XLSX.utils.encode_cell({ r: row, c: 3 });
      if (clientsSheet[cellAddressB]) {
        clientsSheet[cellAddressB].z = '€#,##0.00';
      }
      if (clientsSheet[cellAddressD]) {
        clientsSheet[cellAddressD].z = '€#,##0.00';
      }
    }

    XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Top Clienti');
  }

  // Sheet 6: Hours by Employee
  if (data.hoursByEmployee.length > 0) {
    const hoursData = [
      ['ORE LAVORATE PER DIPENDENTE'],
      [''],
      ['Dipendente', 'Ore Totali', 'Ore Produttive', 'Ore Pausa'],
      ...data.hoursByEmployee.map(item => [
        `${item.nome} ${item.cognome}`,
        item.ore_lavorate,
        item.ore_produttive,
        item.ore_pausa,
      ]),
    ];

    const hoursSheet = XLSX.utils.aoa_to_sheet(hoursData);

    // Format hours columns with 1 decimal
    const range = XLSX.utils.decode_range(hoursSheet['!ref'] || 'A1');
    for (let row = 3; row <= range.e.r; row++) {
      for (let col = 1; col <= 3; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (hoursSheet[cellAddress]) {
          hoursSheet[cellAddress].z = '0.0"h"';
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, hoursSheet, 'Ore Dipendenti');
  }

  // Sheet 7: Alerts
  if (data.alerts.length > 0) {
    const alertsData = [
      ['ALERT E INSIGHTS'],
      [''],
      ['Tipo', 'Titolo', 'Messaggio'],
      ...data.alerts.map(item => [
        item.type === 'error' ? 'CRITICO' :
        item.type === 'warning' ? 'ATTENZIONE' :
        item.type === 'success' ? 'POSITIVO' : 'INFO',
        item.title,
        item.message,
      ]),
    ];

    const alertsSheet = XLSX.utils.aoa_to_sheet(alertsData);
    XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alert');
  }

  // Save file
  const fileName = `Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
