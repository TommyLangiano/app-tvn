'use client';

import { memo, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';

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

interface ChartDataItem {
  name: string;
  shortName: string;
  value: number;
  color: string;
}

// Memoizza il componente Tooltip per evitare re-render
const CustomTooltip = memo(({ active, payload }: any) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">
        {data.payload.name}
      </p>
      <p className="text-sm font-medium" style={{ color: data.payload.color }}>
        {formatCurrency(data.value)}
      </p>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// Memoizza il componente XAxisTick per evitare re-render
const CustomXAxisTick = memo(({ x, y, payload }: any) => {
  // Se è "Utile Lordo", mostra anche la formula sotto
  const isUtileLordo = payload.value === 'Utile Lordo';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="middle"
        fill="currentColor"
        className="text-xs font-medium"
      >
        {payload.value}
      </text>
      {isUtileLordo && (
        <text
          x={0}
          y={0}
          dy={30}
          textAnchor="middle"
          fill="#9ca3af"
          className="text-[10px]"
        >
          (Tot. Imp. Fatt. - Tot. Imp. Costi - Note Sp.)
        </text>
      )}
    </g>
  );
});

CustomXAxisTick.displayName = 'CustomXAxisTick';


// Helper per calcolare il colore basato sul valore (esternalizzato per essere puro)
const getColorForUtileLordo = (value: number): string => {
  return value >= 0 ? '#059669' : '#dc2626'; // emerald or red
};

const getColorForSaldoIva = (value: number): string => {
  return value >= 0 ? '#8b5cf6' : '#ec4899'; // violet or pink
};

// Componente principale memoizzato con shallow comparison ottimizzato
export const RiepilogoEconomicoChart = memo(({ data, loading = false }: RiepilogoEconomicoChartProps) => {
  // Memoizza il formatter dell'asse Y per evitare ricreazioni
  const yAxisTickFormatter = useCallback((value: number) => {
    return formatCurrency(value).replace(/\s/g, '');
  }, []);

  // Memoizza i dati del grafico - si ricalcola solo quando `data` cambia
  const chartData = useMemo<ChartDataItem[]>(() => {
    return [
      {
        name: 'Importo Contratto',
        shortName: 'Importo Contratto',
        value: data.fatturatoPrevisto,
        color: '#3b82f6', // blue
      },
      {
        name: 'Totale Imponibile Fatturato',
        shortName: 'Tot. Imp. Fatturato',
        value: data.fatturatoEmesso,
        color: '#10b981', // green
      },
      {
        name: 'Totale Imponibile Costi',
        shortName: 'Tot. Imp. Costi',
        value: data.costiTotali,
        color: '#ef4444', // red
      },
      {
        name: 'Note Spesa',
        shortName: 'Note Spesa',
        value: data.noteSpesa,
        color: '#f59e0b', // amber
      },
      {
        name: 'Utile Lordo',
        shortName: 'Utile Lordo',
        value: data.utileLordo,
        color: getColorForUtileLordo(data.utileLordo),
      },
      {
        name: 'Saldo IVA',
        shortName: 'Saldo IVA',
        value: data.saldoIva,
        color: getColorForSaldoIva(data.saldoIva),
      },
    ];
  }, [data.fatturatoPrevisto, data.fatturatoEmesso, data.costiTotali, data.noteSpesa, data.utileLordo, data.saldoIva]);

  // Loading state (non memoizzato perché è semplice e cambia raramente)
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="[&_*]:outline-none [&_*]:focus:outline-none [&_.recharts-surface]:outline-none">
      <ResponsiveContainer width="100%" height={470}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 40, left: 60, bottom: 60 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="shortName"
            tick={<CustomXAxisTick />}
            interval={0}
            height={55}
          />
          <YAxis
            className="text-sm"
            tick={{ fill: 'currentColor' }}
            tickFormatter={yAxisTickFormatter}
            width={80}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            maxBarSize={120}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison per evitare re-render quando i dati non cambiano effettivamente
  if (prevProps.loading !== nextProps.loading) return false;

  // Deep comparison dei valori numerici
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
