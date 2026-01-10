'use client';

import { memo, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Formatta valuta con notazione k per migliaia (solo per assi)
const formatCurrencyNoDecimals = (value: number) => {
  const absValue = Math.abs(value);
  const isNegative = value < 0;

  if (absValue >= 1000) {
    return `${isNegative ? '-' : ''}€${(absValue / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Formatta valuta esatta per tooltip
const formatCurrencyExact = (value: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Registra i componenti Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RiepilogoEconomicoData {
  fatturatoPrevisto: number;
  imponibileRicavi: number;
  imponibileCostiFatture: number;
  costiBustePaga: number;
  costiF24: number;
  noteSpesaApprovate: number;
  utileLordo: number;
  saldoIva: number;
}

interface RiepilogoEconomicoChartProps {
  data: RiepilogoEconomicoData;
}

export const RiepilogoEconomicoChart = memo(({ data }: RiepilogoEconomicoChartProps) => {
  const chartData = useMemo(() => ({
    labels: [
      'Importo Contratto',
      'Imponibile Ricavi',
      'Imponibile Costi',
      'Utile Lordo',
      'Saldo IVA'
    ],
    datasets: [
      // Colonne standard (verde)
      {
        label: 'Importo Contratto',
        data: [
          data.fatturatoPrevisto,
          0,
          0,
          0,
          0
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: 6,
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Imponibile Ricavi
      {
        label: 'Imponibile Ricavi',
        data: [
          0,
          data.imponibileRicavi,
          0,
          0,
          0
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: 6,
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Imponibile Costi - Fatture (verde)
      {
        label: 'Fatture Passive',
        data: [
          0,
          0,
          data.imponibileCostiFatture,
          0,
          0
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Imponibile Costi - Buste Paga (giallo)
      {
        label: 'Buste Paga',
        data: [
          0,
          0,
          data.costiBustePaga,
          0,
          0
        ],
        backgroundColor: 'rgb(234, 179, 8)', // yellow-600
        borderWidth: 2,
        borderColor: 'rgb(234, 179, 8)',
        hoverBorderColor: 'rgb(202, 138, 4)', // yellow-700
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Imponibile Costi - F24 (arancione)
      {
        label: 'F24',
        data: [
          0,
          0,
          data.costiF24,
          0,
          0
        ],
        backgroundColor: 'rgb(249, 115, 22)', // orange-500
        borderWidth: 2,
        borderColor: 'rgb(249, 115, 22)',
        hoverBorderColor: 'rgb(234, 88, 12)', // orange-600
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Imponibile Costi - Note Spesa (viola)
      {
        label: 'Note Spesa Approvate',
        data: [
          0,
          0,
          data.noteSpesaApprovate,
          0,
          0
        ],
        backgroundColor: 'rgb(168, 85, 247)', // purple-500
        borderWidth: 2,
        borderColor: 'rgb(168, 85, 247)',
        hoverBorderColor: 'rgb(147, 51, 234)', // purple-600
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Utile Lordo
      {
        label: 'Utile Lordo',
        data: [
          0,
          0,
          0,
          data.utileLordo,
          0
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: 6,
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Saldo IVA
      {
        label: 'Saldo IVA',
        data: [
          0,
          0,
          0,
          0,
          data.saldoIva
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: 6,
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      }
    ]
  }), [data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderWidth: 2,
        borderColor: '#059669',
        padding: 16,
        displayColors: true,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 15,
          weight: 600,
        },
        callbacks: {
          title: function(context: any) {
            if (!context || !context[0]) return '';
            const dataIndex = context[0].dataIndex;

            // Per colonna "Imponibile Costi" mostra titolo personalizzato
            if (dataIndex === 2) {
              return 'Imponibile Costi';
            }

            return context[0].label || '';
          },
          beforeBody: function(context: any) {
            if (!context || !context[0]) return [];
            const dataIndex = context[0].dataIndex;

            // SOLO per colonna "Imponibile Costi" (index 2)
            if (dataIndex === 2) {
              const lines: string[] = [];

              if (data.imponibileCostiFatture > 0) {
                lines.push(`Imp. Fatture Ricevute: ${formatCurrencyExact(data.imponibileCostiFatture)}`);
              }
              if (data.costiBustePaga > 0) {
                lines.push(`Buste Paga: ${formatCurrencyExact(data.costiBustePaga)}`);
              }
              if (data.costiF24 > 0) {
                lines.push(`F24: ${formatCurrencyExact(data.costiF24)}`);
              }
              if (data.noteSpesaApprovate > 0) {
                lines.push(`Note Spesa Approvate: ${formatCurrencyExact(data.noteSpesaApprovate)}`);
              }

              return lines;
            }

            // Per TUTTE le altre colonne (0, 1, 3, 4) NON mostrare nulla
            return [];
          },
          label: function(context: any): string | undefined {
            const dataIndex = context.dataIndex;

            // Per colonna "Imponibile Costi" (index 2) NON mostrare label
            if (dataIndex === 2) {
              return undefined;
            }

            // Per tutte le altre colonne (0, 1, 3, 4)
            const value = context.parsed.y;
            const label = context.dataset.label || '';

            if (value === 0) return undefined;

            if (label === 'Imponibile Ricavi') {
              return `Imp. Fatture Emesse: ${formatCurrencyExact(value)}`;
            }
            if (label === 'Importo Contratto' || label === 'Utile Lordo' || label === 'Saldo IVA') {
              return formatCurrencyExact(value);
            }

            return `${label}: ${formatCurrencyExact(value)}`;
          },
          afterBody: function(context: any) {
            if (!context || !context[0]) return '';
            const dataIndex = context[0].dataIndex;

            // SOLO per colonna "Imponibile Costi" (index 2)
            if (dataIndex === 2) {
              const totale = data.imponibileCostiFatture + data.costiBustePaga + data.costiF24 + data.noteSpesaApprovate;
              return `\n━━━━━━━━━━━━━━━━\nTOTALE COSTI: ${formatCurrencyExact(totale)}`;
            }

            // Per TUTTE le altre colonne NON mostrare nulla
            return '';
          }
        },
        footerFont: {
          size: 16,
          weight: 'bold' as const,
        },
        footerColor: '#1f2937',
      }
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        suggestedMax: undefined, // Lascia che il grafico si adatti automaticamente
        grace: '5%', // Aggiungi 5% di spazio sopra il valore massimo
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 8,
          callback: function(value: any) {
            return formatCurrencyNoDecimals(value);
          },
          font: {
            size: 16,
            weight: 'bold' as const,
          }
        }
      },
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 13,
            weight: 'bold' as const,
          }
        }
      }
    },
    interaction: {
      mode: 'point' as const,
      intersect: true,
    },
  }), [data]);

  return (
    <div className="w-full h-[550px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data.fatturatoPrevisto === nextProps.data.fatturatoPrevisto &&
    prevProps.data.imponibileRicavi === nextProps.data.imponibileRicavi &&
    prevProps.data.imponibileCostiFatture === nextProps.data.imponibileCostiFatture &&
    prevProps.data.costiBustePaga === nextProps.data.costiBustePaga &&
    prevProps.data.costiF24 === nextProps.data.costiF24 &&
    prevProps.data.noteSpesaApprovate === nextProps.data.noteSpesaApprovate &&
    prevProps.data.utileLordo === nextProps.data.utileLordo &&
    prevProps.data.saldoIva === nextProps.data.saldoIva
  );
});

RiepilogoEconomicoChart.displayName = 'RiepilogoEconomicoChart';
