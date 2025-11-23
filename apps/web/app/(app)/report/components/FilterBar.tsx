'use client';

import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, subYears } from 'date-fns';
import { it } from 'date-fns/locale';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  dateRange: DateRange;
  clienteId?: string;
  commessaId?: string;
  dipendenteId?: string;
  periodo: string;
}

interface FilterBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  clienti?: Array<{ id: string; ragione_sociale: string }>;
  commesse?: Array<{ id: string; titolo: string }>;
  dipendenti?: Array<{ id: string; nome: string; cognome: string }>;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export function FilterBar({
  filters,
  onFiltersChange,
  clienti = [],
  commesse = [],
  dipendenti = [],
  onExportPDF,
  onExportExcel,
}: FilterBarProps) {
  const handlePeriodoChange = (periodo: string) => {
    let dateRange: DateRange;
    const now = new Date();

    switch (periodo) {
      case 'questo-mese':
        dateRange = {
          from: startOfMonth(now),
          to: endOfMonth(now),
        };
        break;
      case 'mese-scorso':
        const lastMonth = subMonths(now, 1);
        dateRange = {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
        break;
      case 'ultimi-3-mesi':
        dateRange = {
          from: startOfMonth(subMonths(now, 2)),
          to: endOfMonth(now),
        };
        break;
      case 'ultimi-6-mesi':
        dateRange = {
          from: startOfMonth(subMonths(now, 5)),
          to: endOfMonth(now),
        };
        break;
      case 'questo-anno':
        dateRange = {
          from: startOfYear(now),
          to: endOfYear(now),
        };
        break;
      case 'anno-scorso':
        const lastYear = subYears(now, 1);
        dateRange = {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        };
        break;
      case 'ultimi-12-mesi':
        dateRange = {
          from: startOfMonth(subMonths(now, 11)),
          to: endOfMonth(now),
        };
        break;
      default:
        dateRange = filters.dateRange;
    }

    onFiltersChange({
      ...filters,
      periodo,
      dateRange,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Periodo */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="h-4 w-4 inline mr-1" />
            Periodo
          </label>
          <Select value={filters.periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="questo-mese">Questo mese</SelectItem>
              <SelectItem value="mese-scorso">Mese scorso</SelectItem>
              <SelectItem value="ultimi-3-mesi">Ultimi 3 mesi</SelectItem>
              <SelectItem value="ultimi-6-mesi">Ultimi 6 mesi</SelectItem>
              <SelectItem value="ultimi-12-mesi">Ultimi 12 mesi</SelectItem>
              <SelectItem value="questo-anno">Quest'anno</SelectItem>
              <SelectItem value="anno-scorso">Anno scorso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cliente */}
        {clienti.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cliente
            </label>
            <Select
              value={filters.clienteId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  clienteId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutti i clienti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i clienti</SelectItem>
                {clienti.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.ragione_sociale}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Commessa */}
        {commesse.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commessa
            </label>
            <Select
              value={filters.commessaId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  commessaId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutte le commesse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le commesse</SelectItem>
                {commesse.map((commessa) => (
                  <SelectItem key={commessa.id} value={commessa.id}>
                    {commessa.titolo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Dipendente */}
        {dipendenti.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dipendente
            </label>
            <Select
              value={filters.dipendenteId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  dipendenteId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tutti i dipendenti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i dipendenti</SelectItem>
                {dipendenti.map((dipendente) => (
                  <SelectItem key={dipendente.id} value={dipendente.id}>
                    {dipendente.nome} {dipendente.cognome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Export Buttons */}
        <div className="flex gap-2 ml-auto">
          {onExportExcel && (
            <Button variant="outline" size="sm" onClick={onExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          )}
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Display */}
      <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
        Visualizzando dati dal{' '}
        <span className="font-medium text-gray-900 dark:text-white">
          {format(filters.dateRange.from, 'dd MMMM yyyy', { locale: it })}
        </span>{' '}
        al{' '}
        <span className="font-medium text-gray-900 dark:text-white">
          {format(filters.dateRange.to, 'dd MMMM yyyy', { locale: it })}
        </span>
      </div>
    </div>
  );
}
