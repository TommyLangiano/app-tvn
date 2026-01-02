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
      {
        label: 'Costi Fatture',
        data: [
          0, // Importo Contratto
          0, // Fatturato
          data.costiTotali, // Solo costi fatture
          0, // Note Spesa
          0, // Utile Lordo
          0  // Saldo IVA
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600 (verde)
        borderColor: 'rgb(5, 150, 105)',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: 'bottom' as const,
        maxBarThickness: 60,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
        stack: 'costi' as const,
      },
      {
        label: 'Costi Buste Paga',
        data: [
          0, // Importo Contratto
          0, // Fatturato
          data.costiBustePaga, // Solo costi buste paga
          0, // Note Spesa
          0, // Utile Lordo
          0  // Saldo IVA
        ],
        backgroundColor: 'rgb(234, 179, 8)', // yellow-600 (giallo)
        borderColor: 'rgb(234, 179, 8)',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: 'bottom' as const,
        maxBarThickness: 60,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
        stack: 'costi' as const,
      },
      {
        label: 'Altri Valori',
        data: [
          data.fatturatoPrevisto,
          data.fatturatoEmesso,
          0, // Costi sono stacked
          data.noteSpesa,
          data.utileLordo,
          -data.saldoIva // Inverti segno
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600 (primary)
        borderColor: 'rgb(5, 150, 105)',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: 'bottom' as const,
        maxBarThickness: 60,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
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

            if (value === 0) return null; // Non mostrare valori a 0

            // Per la colonna "Tot. Imp. Costi" mostra il dettaglio
            if (context.dataIndex === 2) {
              if (label === 'Costi Fatture') {
                return `Costi Fatture: ${formatCurrencyExact(value)}`;
              } else if (label === 'Costi Buste Paga') {
                return `Costi Buste Paga: ${formatCurrencyExact(value)}`;
              }
            }

            return formatCurrencyExact(value);
          },
          afterBody: function(context: any) {
            // Per la colonna "Tot. Imp. Costi" mostra il totale
            if (context[0]?.dataIndex === 2) {
              const totale = data.costiTotali + data.costiBustePaga;
              return `\nTotale Costi: ${formatCurrencyExact(totale)}`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          maxTicksLimit: 6,
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

  // Mostra sempre il grafico, anche durante il loading o con dati a 0
  // Il grafico mostrerà le barre con altezza 0 se non ci sono dati
  return (
    <div className="w-full h-[450px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Memoizza solo se i dati sono identici
  return (
    prevProps.data.fatturatoPrevisto === nextProps.data.fatturatoPrevisto &&
    prevProps.data.fatturatoEmesso === nextProps.data.fatturatoEmesso &&
    prevProps.data.costiTotali === nextProps.data.costiTotali &&
    prevProps.data.costiBustePaga === nextProps.data.costiBustePaga &&
    prevProps.data.noteSpesa === nextProps.data.noteSpesa &&
    prevProps.data.utileLordo === nextProps.data.utileLordo &&
    prevProps.data.saldoIva === nextProps.data.saldoIva
  );
});

RiepilogoEconomicoChart.displayName = 'RiepilogoEconomicoChart';
