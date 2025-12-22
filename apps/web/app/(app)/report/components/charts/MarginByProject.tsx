'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';

interface MarginByProjectProps {
  data: Array<{
    id: string;
    titolo: string;
    fatturato: number;
    costi: number;
    margine: number;
    marginPercentage: number;
  }>;
  loading?: boolean;
}

export function MarginByProject({ data, loading = false }: MarginByProjectProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Margine per Commessa
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Performance delle commesse ordinate per margine
          </p>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  // Take top 10 projects
  const topProjects = data.slice(0, 10);

  const getBarColor = (marginPercentage: number) => {
    if (marginPercentage < 0) return '#ef4444'; // red
    if (marginPercentage < 10) return '#f59e0b'; // amber
    if (marginPercentage < 20) return '#3b82f6'; // blue
    return '#10b981'; // green
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.titolo}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Fatturato: <span className="font-medium text-blue-600">{formatCurrency(data.fatturato)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Costi: <span className="font-medium text-red-600">{formatCurrency(data.costi)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Margine: <span className="font-medium text-green-600">{formatCurrency(data.margine)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Margine %: <span className="font-medium text-gray-900 dark:text-white">{data.marginPercentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Truncate long titles
  const truncateTitle = (title: string, maxLength: number = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const chartData = topProjects.map(p => ({
    ...p,
    displayTitolo: truncateTitle(p.titolo),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Margine per Commessa
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Top 10 commesse ordinate per margine
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            type="number"
            className="text-sm"
            tick={{ fill: 'currentColor' }}
            tickFormatter={formatCurrency}
          />
          <YAxis
            type="category"
            dataKey="displayTitolo"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="margine" name="Margine" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.marginPercentage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }}></div>
          <span className="text-gray-600 dark:text-gray-400">&gt;20% Margine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
          <span className="text-gray-600 dark:text-gray-400">10-20% Margine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;10% Margine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }}></div>
          <span className="text-gray-600 dark:text-gray-400">In Perdita</span>
        </div>
      </div>
    </div>
  );
}
