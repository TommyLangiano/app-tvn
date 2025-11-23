'use client';

import { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number; // percentuale es: 12.5 per +12.5%
    label: string; // es: "vs mese scorso"
  };
  format?: 'currency' | 'number' | 'percentage' | 'hours';
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  format = 'number',
  loading = false
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'hours':
        return `${val.toFixed(0)}h`;
      default:
        return new Intl.NumberFormat('it-IT').format(val);
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600';
    if (trend.value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return ArrowUp;
    if (trend.value < 0) return ArrowDown;
    return Minus;
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {formatValue(value)}
            </p>
          )}
          {trend && !loading && (
            <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
              {TrendIcon && <TrendIcon className="h-4 w-4" />}
              <span className="font-medium">
                {Math.abs(trend.value).toFixed(1)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
