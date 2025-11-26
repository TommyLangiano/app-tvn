'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface BudgetVsActualProps {
  data: Array<{
    id: string;
    titolo: string;
    budgetPreventivo: number;
    costiEffettivi: number;
    fatturatoEffettivo: number;
    percentualeCompletamento: number;
    varianceBudget: number;
    variancePercentage: number;
  }>;
  loading?: boolean;
}

export function BudgetVsActual({ data, loading = false }: BudgetVsActualProps) {
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
            Budget vs Actual per Commessa
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Confronto preventivo vs consuntivo
          </p>
        </div>
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Nessun dato disponibile</p>
        </div>
      </div>
    );
  }

  // Take top 10 projects by budget
  const topProjects = data.slice(0, 10);

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
          <p className="font-semibold text-gray-900 dark:text-white mb-2">{data.titolo}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Budget: <span className="font-medium text-blue-600">{formatCurrency(data.budgetPreventivo)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Costi Effettivi: <span className="font-medium text-orange-600">{formatCurrency(data.costiEffettivi)}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Variance: <span className={`font-medium ${data.varianceBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.varianceBudget)} ({data.variancePercentage >= 0 ? '+' : ''}{data.variancePercentage.toFixed(1)}%)
            </span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Completamento: <span className="font-medium text-gray-900 dark:text-white">{data.percentualeCompletamento}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Truncate long titles
  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const chartData = topProjects.map(p => ({
    ...p,
    displayTitolo: truncateTitle(p.titolo),
  }));

  // Count projects over/under budget
  const projectsOverBudget = data.filter(p => p.variancePercentage < -5).length;
  const projectsUnderBudget = data.filter(p => p.variancePercentage > 5).length;
  const projectsOnBudget = data.filter(p => Math.abs(p.variancePercentage) <= 5).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Budget vs Actual per Commessa
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Confronto preventivo vs consuntivo (Top 10)
        </p>
      </div>

      {/* Warning for projects over budget */}
      {projectsOverBudget > 0 && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {projectsOverBudget} commessa/e oltre budget (&gt;5%)
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Verifica costi imprevisti e aggiorna preventivi clienti
            </p>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="displayTitolo"
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
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
          />
          <Bar dataKey="budgetPreventivo" name="Budget Preventivo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="costiEffettivi" name="Costi Effettivi" fill="#f97316" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sotto Budget</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{projectsUnderBudget}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Risparmiando &gt;5%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Budget</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{projectsOnBudget}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Varianza ±5%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Oltre Budget</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{projectsOverBudget}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Superamento &gt;5%</p>
        </div>
      </div>

      {/* Worst performers */}
      {projectsOverBudget > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            🔴 Commesse più fuori budget:
          </h4>
          <div className="space-y-2">
            {data
              .filter(p => p.variancePercentage < -5)
              .sort((a, b) => a.variancePercentage - b.variancePercentage)
              .slice(0, 3)
              .map((project, idx) => (
                <div key={project.id} className="flex items-center justify-between text-sm bg-red-50 dark:bg-red-900/10 rounded p-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    {idx + 1}. {project.titolo.length > 30 ? project.titolo.substring(0, 30) + '...' : project.titolo}
                  </span>
                  <span className="font-medium text-red-600">
                    {project.variancePercentage.toFixed(1)}% oltre
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
