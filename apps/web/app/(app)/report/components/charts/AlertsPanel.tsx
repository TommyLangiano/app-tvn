'use client';

import { AlertCircle, AlertTriangle, CheckCircle, Info, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  priority: number;
  suggestedActions?: string[];
  impact?: 'high' | 'medium' | 'low';
}

interface AlertsPanelProps {
  alerts: Alert[];
  loading?: boolean;
}

export function AlertsPanel({ alerts, loading = false }: AlertsPanelProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const getAlertConfig = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          titleColor: 'text-red-900 dark:text-red-300',
          messageColor: 'text-red-700 dark:text-red-400',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-200 dark:border-amber-800',
          iconColor: 'text-amber-600 dark:text-amber-400',
          titleColor: 'text-amber-900 dark:text-amber-300',
          messageColor: 'text-amber-700 dark:text-amber-400',
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-900 dark:text-green-300',
          messageColor: 'text-green-700 dark:text-green-400',
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          titleColor: 'text-blue-900 dark:text-blue-300',
          messageColor: 'text-blue-700 dark:text-blue-400',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Alert e Insights
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Situazioni da monitorare e performance positive
        </p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>Tutto ok! Nessun alert al momento</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const config = getAlertConfig(alert.type);
            const Icon = config.icon;

            return (
              <div
                key={index}
                className={`${config.bgColor} ${config.borderColor} border rounded-lg p-4`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <Icon className={`h-5 w-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-semibold ${config.titleColor}`}>
                        {alert.title}
                      </h4>
                      {alert.impact && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          alert.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          alert.impact === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {alert.impact === 'high' ? 'Alto Impatto' : alert.impact === 'medium' ? 'Medio Impatto' : 'Basso Impatto'}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${config.messageColor} mb-3`}>
                      {alert.message}
                    </p>

                    {/* Suggested Actions */}
                    {alert.suggestedActions && alert.suggestedActions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Azioni Suggerite:
                          </p>
                        </div>
                        <ul className="space-y-1.5">
                          {alert.suggestedActions.map((action, actionIdx) => (
                            <li key={actionIdx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {alerts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {alerts.filter(a => a.type === 'error').length} Critici
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {alerts.filter(a => a.type === 'warning').length} Attenzione
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">
                {alerts.filter(a => a.type === 'success').length} Positivi
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
