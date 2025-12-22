'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

interface AgingReportProps {
  data: {
    range_0_30: { importo: number; numeroFatture: number };
    range_31_60: { importo: number; numeroFatture: number };
    range_61_90: { importo: number; numeroFatture: number };
    range_over_90: { importo: number; numeroFatture: number };
    totale: number;
    dso: number; // Days Sales Outstanding
    clientiMorosi: Array<{
      id: string;
      ragione_sociale: string;
      importoScaduto: number;
      giorniRitardo: number;
    }>;
  };
  loading?: boolean;
}

export function AgingReport({ data, loading = false }: AgingReportProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
      </div>
    );
  }

  // Prepare data for charts
  const barData = [
    {
      name: '0-30 giorni',
      importo: data.range_0_30.importo,
      numeroFatture: data.range_0_30.numeroFatture,
      color: '#10b981', // green
    },
    {
      name: '31-60 giorni',
      importo: data.range_31_60.importo,
      numeroFatture: data.range_31_60.numeroFatture,
      color: '#3b82f6', // blue
    },
    {
      name: '61-90 giorni',
      importo: data.range_61_90.importo,
      numeroFatture: data.range_61_90.numeroFatture,
      color: '#f59e0b', // amber
    },
    {
      name: 'Oltre 90 giorni',
      importo: data.range_over_90.importo,
      numeroFatture: data.range_over_90.numeroFatture,
      color: '#ef4444', // red
    },
  ];

  const pieData = barData
    .filter(d => d.importo > 0)
    .map(d => ({
      name: d.name,
      value: d.importo,
      color: d.color,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Importo: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(data.importo)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            N° Fatture: <span className="font-medium text-gray-900 dark:text-white">{data.numeroFatture}</span>
          </p>
          {data.importo > 0 && data.importo !== data.value && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              % del Totale: <span className="font-medium text-gray-900 dark:text-white">
                {((data.value || data.importo) / barData.reduce((sum, d) => sum + d.importo, 0) * 100).toFixed(1)}%
              </span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate percentages
  const totalImporto = barData.reduce((sum, d) => sum + d.importo, 0);
  const criticalAmount = data.range_61_90.importo + data.range_over_90.importo;
  const criticalPercentage = totalImporto > 0 ? (criticalAmount / totalImporto) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Aging Report Crediti
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">DSO</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.dso} giorni</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Totale Crediti</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(data.totale)}</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Suddivisione fatture non pagate per età
        </p>
      </div>

      {/* Critical Warning */}
      {criticalPercentage > 20 && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {formatCurrency(criticalAmount)} in ritardo oltre 60 giorni ({criticalPercentage.toFixed(1)}%)
            </p>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Azione richiesta: contatta clienti morosi e considera solleciti formali
            </p>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                angle={-15}
                textAnchor="end"
                height={80}
              />
              <YAxis
                className="text-sm"
                tick={{ fill: 'currentColor' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="importo" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${((entry.value / totalImporto) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Nessun credito in sospeso</p>
            </div>
          )}
        </div>
      </div>

      {/* Clienti Morosi Table */}
      {data.clientiMorosi && data.clientiMorosi.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Clienti Morosi (Top 5)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">#</th>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">Cliente</th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">Importo Scaduto</th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">Giorni Ritardo</th>
                  <th className="px-4 py-2 text-center text-gray-700 dark:text-gray-300 font-medium">Gravità</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.clientiMorosi.slice(0, 5).map((cliente, idx) => (
                  <tr key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                      {cliente.ragione_sociale}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {formatCurrency(cliente.importoScaduto)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {cliente.giorniRitardo} gg
                    </td>
                    <td className="px-4 py-3 text-center">
                      {cliente.giorniRitardo > 90 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Critico
                        </span>
                      ) : cliente.giorniRitardo > 60 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Alto
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Medio
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        {barData.map((range, idx) => (
          <div key={idx} className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: range.color }}></div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{range.name}</p>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(range.importo)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {range.numeroFatture} fatture
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
