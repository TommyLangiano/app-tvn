import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { AnalyticsData } from '@/lib/analytics';
import type { DateRange } from '../FilterBar';

export function exportToPDF(data: AnalyticsData, filters: { dateRange: DateRange }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Aziendale', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Period
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const periodText = `Periodo: ${format(filters.dateRange.from, 'dd MMMM yyyy', { locale: it })} - ${format(filters.dateRange.to, 'dd MMMM yyyy', { locale: it })}`;
  doc.text(periodText, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // KPIs Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Indicatori Chiave (KPI)', 14, yPos);
  yPos += 8;

  const kpiData = [
    ['Fatturato Totale', formatCurrency(data.kpis.totalRevenue)],
    ['Costi Totali', formatCurrency(data.kpis.totalCosts)],
    ['Margine', formatCurrency(data.kpis.margin)],
    ['Margine %', `${data.kpis.marginPercentage.toFixed(1)}%`],
    ['Commesse Attive', data.kpis.activeProjects.toString()],
    ['Ore Lavorate', `${data.kpis.totalHours.toFixed(0)}h`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Indicatore', 'Valore']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Revenue by Month
  if (data.revenueByMonth.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Andamento Mensile', 14, yPos);
    yPos += 8;

    const revenueData = data.revenueByMonth.map(item => [
      item.month,
      formatCurrency(item.fatturato),
      formatCurrency(item.costi),
      formatCurrency(item.margine),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Mese', 'Fatturato', 'Costi', 'Margine']],
      body: revenueData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Costs by Category
  if (data.costsByCategory.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuzione Costi per Categoria', 14, yPos);
    yPos += 8;

    const costsData = data.costsByCategory.map(item => [
      item.name,
      formatCurrency(item.value),
      `${item.percentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Categoria', 'Importo', 'Percentuale']],
      body: costsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Margin by Project
  if (data.marginByProject.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Margine per Commessa (Top 10)', 14, yPos);
    yPos += 8;

    const marginData = data.marginByProject.slice(0, 10).map(item => [
      item.titolo.length > 30 ? item.titolo.substring(0, 30) + '...' : item.titolo,
      formatCurrency(item.fatturato),
      formatCurrency(item.costi),
      formatCurrency(item.margine),
      `${item.marginPercentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Commessa', 'Fatturato', 'Costi', 'Margine', 'Margine %']],
      body: marginData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 60 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Top Clients
  if (data.topClients.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Clienti per Fatturato', 14, yPos);
    yPos += 8;

    const clientsData = data.topClients.map(item => [
      item.ragione_sociale.length > 40 ? item.ragione_sociale.substring(0, 40) + '...' : item.ragione_sociale,
      formatCurrency(item.fatturato),
      item.numeroCommesse.toString(),
      formatCurrency(item.fatturato / item.numeroCommesse),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Cliente', 'Fatturato', 'N° Commesse', 'Media/Commessa']],
      body: clientsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Hours by Employee
  if (data.hoursByEmployee.length > 0) {
    doc.addPage();
    yPos = 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ore Lavorate per Dipendente (Top 15)', 14, yPos);
    yPos += 8;

    const hoursData = data.hoursByEmployee.slice(0, 15).map(item => [
      `${item.nome} ${item.cognome}`,
      `${item.ore_lavorate.toFixed(1)}h`,
      `${item.ore_produttive.toFixed(1)}h`,
      `${item.ore_pausa.toFixed(1)}h`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Dipendente', 'Ore Totali', 'Ore Produttive', 'Ore Pausa']],
      body: hoursData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Alerts
  if (data.alerts.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Alert e Insights', 14, yPos);
    yPos += 8;

    const alertsData = data.alerts.map(item => [
      item.type === 'error' ? '🔴' : item.type === 'warning' ? '🟡' : item.type === 'success' ? '🟢' : 'ℹ️',
      item.title,
      item.message,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Tipo', 'Titolo', 'Messaggio']],
      body: alertsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
      },
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Pagina ${i} di ${pageCount}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }

  // Save
  const fileName = `Report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(fileName);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
