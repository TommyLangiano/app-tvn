'use client';

import { Card } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ResourceUtilizationProps {
  data: Array<{
    dipendenteId: string;
    nome: string;
    cognome: string;
    oreLavorate: number;
    oreDisponibili: number;
    percentualeUtilizzo: number;
    numeroCommesse: number;
  }>;
  loading?: boolean;
}

export function ResourceUtilization({ data, loading }: ResourceUtilizationProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Utilizzo Risorse
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
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Utilizzo Risorse
          </h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          Nessun dato disponibile
        </div>
      </Card>
    );
  }

  // Ordina per percentuale di utilizzo
  const sortedData = [...data].sort((a, b) => b.percentualeUtilizzo - a.percentualeUtilizzo);

  // Calcola statistiche
  const avgUtilization = data.reduce((sum, d) => sum + d.percentualeUtilizzo, 0) / data.length;
  const overutilized = data.filter(d => d.percentualeUtilizzo > 100).length;
  const underutilized = data.filter(d => d.percentualeUtilizzo < 70).length;
  const optimal = data.filter(d => d.percentualeUtilizzo >= 70 && d.percentualeUtilizzo <= 100).length;

  const getBarColor = (percentage: number) => {
    if (percentage > 100) return '#ef4444'; // red - sovraccarico
    if (percentage >= 85) return '#f59e0b'; // orange - quasi pieno
    if (percentage >= 70) return '#10b981'; // green - ottimale
    return '#3b82f6'; // blue - sottoutilizzato
  };

  const chartData = sortedData.map(d => ({
    name: `${d.nome} ${d.cognome.charAt(0)}.`,
    utilizzo: Number(d.percentualeUtilizzo.toFixed(1)),
    ore: d.oreLavorate,
    disponibili: d.oreDisponibili,
    commesse: d.numeroCommesse,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Utilizzo: <span className="font-medium text-gray-900 dark:text-white">{data.utilizzo}%</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Ore lavorate: <span className="font-medium text-gray-900 dark:text-white">{data.ore}h</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Ore disponibili: <span className="font-medium text-gray-900 dark:text-white">{data.disponibili}h</span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Commesse: <span className="font-medium text-gray-900 dark:text-white">{data.commesse}</span>
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
          <Users className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Utilizzo Risorse
          </h3>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Media: <span className="font-medium text-gray-900 dark:text-white">{avgUtilization.toFixed(1)}%</span>
        </div>
      </div>

      {/* Warning banner for overutilized resources */}
      {overutilized > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">
              {overutilized} {overutilized === 1 ? 'risorsa sovraccarica' : 'risorse sovraccariche'} (oltre 100% utilizzo)
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            type="number"
            domain={[0, Math.max(120, ...chartData.map(d => d.utilizzo))]}
            className="text-xs"
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs"
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            formatter={(value) => {
              if (value === 'utilizzo') return 'Utilizzo %';
              return value;
            }}
          />
          <Bar dataKey="utilizzo" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.utilizzo)} />
            ))}
          </Bar>
          {/* Reference line at 100% */}
          <Bar dataKey={() => 100} fill="transparent" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Sovraccarico (&gt;100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-gray-600 dark:text-gray-400">Quasi pieno (85-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-gray-600 dark:text-gray-400">Ottimale (70-85%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Sottoutilizzato (&lt;70%)</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{optimal}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Utilizzo Ottimale</div>
        </div>
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{overutilized}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Sovraccarichi</div>
        </div>
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{underutilized}</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Sottoutilizzati</div>
        </div>
      </div>
    </Card>
  );
}
