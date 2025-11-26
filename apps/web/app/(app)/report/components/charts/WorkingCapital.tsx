'use client';

import { Card } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

interface WorkingCapitalProps {
  data: {
    creditiCommerciali: number;
    debitiCommerciali: number;
    liquiditaDisponibile: number;
    capitaleCircolanteNetto: number;
    rapportoLiquidita: number; // Current Ratio
    giornoIncassoMedi: number; // DSO
    giornoPagamentoMedi: number; // DPO
    cicloCassa: number; // Cash Conversion Cycle
  };
  loading?: boolean;
}

export function WorkingCapital({ data, loading }: WorkingCapitalProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Analisi Capitale Circolante
          </h3>
        </div>
        <div className="h-[400px] animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = [
    {
      name: 'Crediti\nCommerciali',
      value: data.creditiCommerciali,
      type: 'asset',
    },
    {
      name: 'Debiti\nCommerciali',
      value: -data.debitiCommerciali,
      type: 'liability',
    },
    {
      name: 'Liquidità\nDisponibile',
      value: data.liquiditaDisponibile,
      type: 'asset',
    },
    {
      name: 'Capitale\nCircolante Netto',
      value: data.capitaleCircolanteNetto,
      type: data.capitaleCircolanteNetto >= 0 ? 'positive' : 'negative',
    },
  ];

  const getBarColor = (type: string) => {
    switch (type) {
      case 'asset':
        return '#10b981'; // green
      case 'liability':
        return '#ef4444'; // red
      case 'positive':
        return '#3b82f6'; // blue
      case 'negative':
        return '#f59e0b'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  const isHealthy = data.capitaleCircolanteNetto > 0 && data.rapportoLiquidita >= 1.5;
  const isWarning = data.capitaleCircolanteNetto > 0 && data.rapportoLiquidita < 1.5;
  const isCritical = data.capitaleCircolanteNetto <= 0;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-1">
            {item.name.replace('\n', ' ')}
          </p>
          <p className={`text-lg font-bold ${item.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(item.value))}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Analisi Capitale Circolante
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isHealthy && <TrendingUp className="w-5 h-5 text-green-600" />}
          {isWarning && <AlertCircle className="w-5 h-5 text-yellow-600" />}
          {isCritical && <TrendingDown className="w-5 h-5 text-red-600" />}
          <span className={`text-sm font-medium ${
            isHealthy ? 'text-green-600' :
            isWarning ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {isHealthy ? 'Sano' : isWarning ? 'Attenzione' : 'Critico'}
          </span>
        </div>
      </div>

      {/* Alert banner */}
      {isCritical && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">
              Capitale circolante netto negativo - L'azienda potrebbe avere problemi di liquidità
            </p>
          </div>
        </div>
      )}

      {isWarning && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
            <Info className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">
              Rapporto di liquidità sotto 1.5 - Considerare di aumentare le riserve di cassa
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            className="text-xs"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            interval={0}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: '#6b7280' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#000" strokeWidth={2} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Key Metrics */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Ratio</div>
            <div className={`text-2xl font-bold ${
              data.rapportoLiquidita >= 2 ? 'text-green-600' :
              data.rapportoLiquidita >= 1.5 ? 'text-blue-600' :
              data.rapportoLiquidita >= 1 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {data.rapportoLiquidita.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {data.rapportoLiquidita >= 1.5 ? 'Buono' : data.rapportoLiquidita >= 1 ? 'Sufficiente' : 'Basso'}
            </div>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">DSO (Giorni Incasso)</div>
            <div className={`text-2xl font-bold ${
              data.giornoIncassoMedi <= 30 ? 'text-green-600' :
              data.giornoIncassoMedi <= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {Math.round(data.giornoIncassoMedi)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">giorni</div>
          </div>

          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">DPO (Giorni Pagamento)</div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(data.giornoPagamentoMedi)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">giorni</div>
          </div>

          <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ciclo di Cassa</div>
            <div className={`text-2xl font-bold ${
              data.cicloCassa <= 30 ? 'text-green-600' :
              data.cicloCassa <= 60 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {Math.round(data.cicloCassa)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">giorni</div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">Current Ratio</p>
            <p>Rapporto tra attività correnti e passività correnti. Ideale &gt; 1.5</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">DSO (Days Sales Outstanding)</p>
            <p>Tempo medio per incassare dai clienti. Minore è meglio.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">DPO (Days Payable Outstanding)</p>
            <p>Tempo medio per pagare i fornitori. Maggiore è meglio per il cash flow.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white mb-1">Ciclo di Cassa</p>
            <p>DSO - DPO. Tempo tra pagamento fornitori e incasso clienti. Minore è meglio.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
