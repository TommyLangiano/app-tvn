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
  noteSpesa: number;
  utileLordo: number;
  saldoIva: number;
}

interface RiepilogoEconomicoChartProps {
  data: RiepilogoEconomicoData;
  loading?: boolean;
}

export const RiepilogoEconomicoChart = memo(({ data, loading = false }: RiepilogoEconomicoChartProps) => {
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
        label: 'Importo (€)',
        data: [
          data.fatturatoPrevisto,
          data.fatturatoEmesso,
          data.costiTotali,
          data.noteSpesa,
          data.utileLordo,
          data.saldoIva
        ],
        backgroundColor: 'rgb(5, 150, 105)', // emerald-600 (primary)
        borderColor: 'rgb(5, 150, 105)',
        borderWidth: 0,
        borderRadius: 6,
        borderSkipped: 'bottom',
        maxBarThickness: 60, // Larghezza massima barra
        barPercentage: 0.6, // Riduce larghezza barra
        categoryPercentage: 0.7, // Aumenta spazio tra categorie
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
        borderColor: 'rgb(5, 150, 105)',
        borderWidth: 2,
        padding: 16,
        displayColors: false,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 15,
          weight: '600' as const,
        },
        callbacks: {
          label: function(context: any) {
            return formatCurrencyExact(context.parsed.y);
          }
        }
      }
    },
    scales: {
      y: {
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
  }), []);

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="h-[450px] bg-muted animate-pulse rounded"></div>
      </div>
    );
  }

  // Controlla se non ci sono dati
  const hasNoData =
    data.fatturatoPrevisto === 0 &&
    data.fatturatoEmesso === 0 &&
    data.costiTotali === 0 &&
    data.noteSpesa === 0 &&
    data.utileLordo === 0 &&
    data.saldoIva === 0;

  if (hasNoData) {
    return (
      <div className="w-full h-[450px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Nessun dato disponibile per il periodo selezionato
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[450px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.loading !== nextProps.loading) return false;

  return (
    prevProps.data.fatturatoPrevisto === nextProps.data.fatturatoPrevisto &&
    prevProps.data.fatturatoEmesso === nextProps.data.fatturatoEmesso &&
    prevProps.data.costiTotali === nextProps.data.costiTotali &&
    prevProps.data.noteSpesa === nextProps.data.noteSpesa &&
    prevProps.data.utileLordo === nextProps.data.utileLordo &&
    prevProps.data.saldoIva === nextProps.data.saldoIva
  );
});

RiepilogoEconomicoChart.displayName = 'RiepilogoEconomicoChart';
