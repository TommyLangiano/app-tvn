'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';

interface ProfitabilityTrendsProps {
  data: Array<{
    mese: string;
    fatturato: number;
    costi: number;
    margine: number;
    marginePercentuale: number;
  }>;
  loading?: boolean;
}

export function ProfitabilityTrends({ data, loading }: ProfitabilityTrendsProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trend Redditività
          </h3>
        </div>
        <div className="h-[400px] animate-pulse bg-gray-200 dark:bg-gray-700 rounded" />
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trend Redditività
          </h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          Nessun dato disponibile
        </div>
      </Card>
    );
  }

  // Calcola trend
  const firstMonth = data[0];
  const lastMonth = data[data.length - 1];
  const margineTrend = lastMonth.margine - firstMonth.margine;
  const marginePercentualeTrend = lastMonth.marginePercentuale - firstMonth.marginePercentuale;

  // Calcola media margine %
  const avgMarginePercentuale = data.reduce((sum, d) => sum + d.marginePercentuale, 0) / data.length;

  // Best and worst months
  const bestMonth = [...data].sort((a, b) => b.margine - a.margine)[0];
  const worstMonth = [...data].sort((a, b) => a.margine - b.margine)[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{data.mese}</p>
          <div className="space-y-1 text-sm">
            <p className="text-green-600">
              Fatturato: <span className="font-medium">{formatCurrency(data.fatturato)}</span>
            </p>
            <p className="text-red-600">
              Costi: <span className="font-medium">{formatCurrency(data.costi)}</span>
            </p>
            <p className="text-blue-600">
              Margine: <span className="font-medium">{formatCurrency(data.margine)}</span>
            </p>
            <p className="text-purple-600">
              Margine %: <span className="font-medium">{data.marginePercentuale.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Trend Redditività
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {margineTrend >= 0 ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
          <span className={`text-sm font-medium ${margineTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {margineTrend >= 0 ? '+' : ''}{formatCurrency(margineTrend)}
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="mese"
            className="text-xs"
            tick={{ fill: '#6b7280' }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs"
            tick={{ fill: '#6b7280' }}
            tickFormatter={formatCurrency}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs"
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => {
              const labels: Record<string, string> = {
                fatturato: 'Fatturato',
                costi: 'Costi',
                margine: 'Margine',
                marginePercentuale: 'Margine %',
              };
              return labels[value] || value;
            }}
          />

          {/* Area for margin */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="margine"
            fill="url(#marginGradient)"
            stroke="none"
          />

          {/* Lines */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="fatturato"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="costi"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="margine"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 5 }}
            activeDot={{ r: 7 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="marginePercentuale"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Media Margine %</div>
            <div className="text-xl font-bold text-purple-600">
              {avgMarginePercentuale.toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mese Migliore</div>
            <div className="text-sm font-bold text-green-600">{bestMonth.mese}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {formatCurrency(bestMonth.margine)}
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mese Peggiore</div>
            <div className="text-sm font-bold text-red-600">{worstMonth.mese}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {formatCurrency(worstMonth.margine)}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Trend Margine %</div>
            <div className={`text-xl font-bold ${marginePercentualeTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {marginePercentualeTrend >= 0 ? '+' : ''}{marginePercentualeTrend.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
