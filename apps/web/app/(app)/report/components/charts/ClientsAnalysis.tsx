'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ClientsAnalysisProps {
  data: Array<{
    id: string;
    ragione_sociale: string;
    fatturato: number;
    numeroCommesse: number;
  }>;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#ef4444'];

export function ClientsAnalysis({ data, loading = false }: ClientsAnalysisProps) {
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
            Top Clienti per Fatturato
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Principali clienti ordinati per fatturato
          </p>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Nessun dato disponibile</p>
        </div>
      </div>
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.ragione_sociale}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Fatturato: <span className="font-medium text-blue-600">{formatCurrency(data.fatturato)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            N° Commesse: <span className="font-medium text-gray-900 dark:text-white">{data.numeroCommesse}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Media per commessa: <span className="font-medium text-green-600">
              {formatCurrency(data.fatturato / data.numeroCommesse)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Truncate long names
  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const chartData = data.map(client => ({
    ...client,
    displayName: truncateName(client.ragione_sociale),
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Clienti per Fatturato
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Top 10 clienti ordinati per fatturato
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="displayName"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            className="text-sm"
            tick={{ fill: 'currentColor' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="fatturato" name="Fatturato" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Totale Clienti</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.length}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Fatturato Totale</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatCurrency(data.reduce((sum, c) => sum + c.fatturato, 0))}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Media per Cliente</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(data.reduce((sum, c) => sum + c.fatturato, 0) / data.length)}
          </p>
        </div>
      </div>
    </div>
  );
}
