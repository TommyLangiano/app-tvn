'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EmployeeHoursProps {
  data: Array<{
    id: string;
    nome: string;
    cognome: string;
    ore_lavorate: number;
    ore_produttive: number;
    ore_pausa: number;
  }>;
  loading?: boolean;
}

export function EmployeeHours({ data, loading = false }: EmployeeHoursProps) {
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
            Ore Lavorate per Dipendente
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Analisi delle ore lavorate e pause
          </p>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  // Take top 15 employees by hours
  const topEmployees = data.slice(0, 15);

  const formatHours = (value: number) => {
    return `${value.toFixed(1)}h`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              <span className="font-medium">{entry.name}:</span> {formatHours(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartData = topEmployees.map(emp => ({
    nome: `${emp.nome} ${emp.cognome}`,
    'Ore Produttive': emp.ore_produttive,
    'Ore Pausa': emp.ore_pausa,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Ore Lavorate per Dipendente
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Top 15 dipendenti per ore lavorate
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="nome"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            className="text-sm"
            tick={{ fill: 'currentColor' }}
            tickFormatter={formatHours}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
          />
          <Bar dataKey="Ore Produttive" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Ore Pausa" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Totale Ore</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatHours(data.reduce((sum, emp) => sum + emp.ore_lavorate, 0))}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Ore Produttive</p>
          <p className="text-lg font-semibold text-blue-600">
            {formatHours(data.reduce((sum, emp) => sum + emp.ore_produttive, 0))}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Ore Pausa</p>
          <p className="text-lg font-semibold text-amber-600">
            {formatHours(data.reduce((sum, emp) => sum + emp.ore_pausa, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
