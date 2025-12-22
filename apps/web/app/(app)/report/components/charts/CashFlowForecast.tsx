'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

interface CashFlowData {
  period: string;
  name: string;
  value: number;
  type: 'start' | 'income' | 'expense' | 'end';
  cumulative: number;
}

interface CashFlowForecastProps {
  data: {
    saldoIniziale: number;
    entratePrevistoMese1: number;
    uscitePrevistoMese1: number;
    entratePrevistoMese2: number;
    uscitePrevistoMese2: number;
    entratePrevistoMese3: number;
    uscitePrevistoMese3: number;
  };
  loading?: boolean;
}

export function CashFlowForecast({ data, loading = false }: CashFlowForecastProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  // Calculate cumulative cash flow
  const saldoMese1 = data.saldoIniziale + data.entratePrevistoMese1 - data.uscitePrevistoMese1;
  const saldoMese2 = saldoMese1 + data.entratePrevistoMese2 - data.uscitePrevistoMese2;
  const saldoMese3 = saldoMese2 + data.entratePrevistoMese3 - data.uscitePrevistoMese3;

  // Build waterfall data
  const waterfallData: CashFlowData[] = [
    { period: 'Oggi', name: 'Saldo Iniziale', value: data.saldoIniziale, type: 'start', cumulative: data.saldoIniziale },
    { period: '+30gg', name: 'Entrate Previste', value: data.entratePrevistoMese1, type: 'income', cumulative: data.saldoIniziale + data.entratePrevistoMese1 },
    { period: '+30gg', name: 'Uscite Previste', value: -data.uscitePrevistoMese1, type: 'expense', cumulative: saldoMese1 },
    { period: '+60gg', name: 'Entrate Previste', value: data.entratePrevistoMese2, type: 'income', cumulative: saldoMese1 + data.entratePrevistoMese2 },
    { period: '+60gg', name: 'Uscite Previste', value: -data.uscitePrevistoMese2, type: 'expense', cumulative: saldoMese2 },
    { period: '+90gg', name: 'Entrate Previste', value: data.entratePrevistoMese3, type: 'income', cumulative: saldoMese2 + data.entratePrevistoMese3 },
    { period: '+90gg', name: 'Uscite Previste', value: -data.uscitePrevistoMese3, type: 'expense', cumulative: saldoMese3 },
    { period: '+90gg', name: 'Saldo Finale', value: saldoMese3, type: 'end', cumulative: saldoMese3 },
  ];

  const getBarColor = (type: string) => {
    switch (type) {
      case 'start':
      case 'end':
        return '#3b82f6'; // blue
      case 'income':
        return '#10b981'; // green
      case 'expense':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Periodo: <span className="font-medium text-gray-900 dark:text-white">{data.period}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Importo: <span className="font-medium" style={{ color: getBarColor(data.type) }}>
              {formatCurrency(Math.abs(data.value))}
            </span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Saldo: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.cumulative)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Check for cash flow warnings
  const hasWarning = saldoMese1 < 0 || saldoMese2 < 0 || saldoMese3 < 0;
  const criticalPeriod = saldoMese1 < 0 ? '+30gg' : saldoMese2 < 0 ? '+60gg' : saldoMese3 < 0 ? '+90gg' : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Cash Flow Forecast (90 giorni)
          </h3>
          {hasWarning && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">Cash Flow Negativo Previsto</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Proiezione entrate e uscite prossimi 3 mesi
        </p>
      </div>

      {/* Warning Banner */}
      {hasWarning && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>⚠️ Attenzione:</strong> Il saldo diventerà negativo tra {criticalPeriod}.
            Considera di: accelerare incassi, posticipare pagamenti non urgenti, o ottenere finanziamento.
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="period"
            className="text-sm"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-sm"
            tick={{ fill: 'currentColor' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
          <Bar dataKey="cumulative" radius={[4, 4, 0, 0]}>
            {waterfallData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo +30gg</p>
          <div className="flex items-center justify-center gap-2">
            <p className={`text-xl font-bold ${saldoMese1 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldoMese1)}
            </p>
            {saldoMese1 >= data.saldoIniziale ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo +60gg</p>
          <div className="flex items-center justify-center gap-2">
            <p className={`text-xl font-bold ${saldoMese2 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldoMese2)}
            </p>
            {saldoMese2 >= saldoMese1 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Saldo +90gg</p>
          <div className="flex items-center justify-center gap-2">
            <p className={`text-xl font-bold ${saldoMese3 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldoMese3)}
            </p>
            {saldoMese3 >= saldoMese2 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
