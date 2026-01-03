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
  fatturatoEmesso: number;
  costiTotali: number;
  costiBustePaga: number;
  costiF24: number;
  noteSpesa: number;
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
      'Tot. Imp. Fatturato',
      'Tot. Imp. Costi',
      'Note Spesa',
      'Utile Lordo',
      'Saldo IVA'
    ],
    datasets: [
      // Tutte le colonne standard (verde)
      {
        label: 'Valori',
        data: [
          data.fatturatoPrevisto,
          data.fatturatoEmesso,
          0, // Costi mostrati con stack
          data.noteSpesa,
          data.utileLordo,
          -data.saldoIva
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600 (primary)
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: 6,
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Prima parte della barra costi (verde - fatture)
      {
        label: 'Costi Fatture',
        data: [
          0,
          0,
          data.costiTotali,
          0,
          0,
          0
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600 (verde)
        borderWidth: 2,
        borderColor: 'rgb(5, 150, 105)',
        hoverBorderColor: 'rgb(4, 120, 87)', // emerald-700
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Seconda parte della barra costi (giallo - buste paga)
      {
        label: 'Costi Buste Paga',
        data: [
          0,
          0,
          data.costiBustePaga,
          0,
          0,
          0
        ],
        backgroundColor: 'rgb(234, 179, 8)', // yellow-600 (giallo)
        borderWidth: 2,
        borderColor: 'rgb(234, 179, 8)',
        hoverBorderColor: 'rgb(202, 138, 4)', // yellow-700
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        maxBarThickness: 60,
        barPercentage: 0.65,
        categoryPercentage: 0.75,
        stack: 'stack0',
      },
      // Terza parte della barra costi (rosso - F24)
      {
        label: 'Costi F24',
        data: [
          0,
          0,
          data.costiF24,
          0,
          0,
          0
        ],
        backgroundColor: 'rgb(220, 38, 38)', // red-600 (rosso)
        borderWidth: 2,
        borderColor: 'rgb(220, 38, 38)',
        hoverBorderColor: 'rgb(185, 28, 28)', // red-700
        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
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
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;

            if (value === 0) return null;

            // Per la colonna "Tot. Imp. Costi" mostra il dettaglio
            if (context.dataIndex === 2) {
              if (label === 'Costi Fatture') {
                return `Costi Fatture: ${formatCurrencyExact(value)}`;
              } else if (label === 'Costi Buste Paga') {
                return `Costi Buste Paga: ${formatCurrencyExact(value)}`;
              } else if (label === 'Costi F24') {
                return `Costi F24: ${formatCurrencyExact(value)}`;
              }
            }

            return formatCurrencyExact(value);
          },
          afterBody: function(context: any) {
            // Per la colonna "Tot. Imp. Costi" mostra il totale dopo tutte le label
            if (context[0]?.dataIndex === 2) {
              const totale = data.costiTotali + data.costiBustePaga + data.costiF24;
              return `\n━━━━━━━━━━━━━━━━\nTOTALE COSTI: ${formatCurrencyExact(totale)}`;
            }
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
      mode: 'index' as const,
      intersect: false,
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
    prevProps.data.fatturatoEmesso === nextProps.data.fatturatoEmesso &&
    prevProps.data.costiTotali === nextProps.data.costiTotali &&
    prevProps.data.costiBustePaga === nextProps.data.costiBustePaga &&
    prevProps.data.costiF24 === nextProps.data.costiF24 &&
    prevProps.data.noteSpesa === nextProps.data.noteSpesa &&
    prevProps.data.utileLordo === nextProps.data.utileLordo &&
    prevProps.data.saldoIva === nextProps.data.saldoIva
  );
});

RiepilogoEconomicoChart.displayName = 'RiepilogoEconomicoChart';
