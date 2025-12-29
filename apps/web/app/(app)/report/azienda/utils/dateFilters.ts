import { startOfDay, endOfDay, subMonths, startOfYear, endOfYear } from 'date-fns';
import type { PeriodType } from '../components/PeriodFilter';

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Calcola il range di date basato sul tipo di periodo selezionato
 */
export function getDateRangeFromPeriod(period: PeriodType, selectedYear?: number): DateRange {
  const now = new Date();

  switch (period) {
    case 'oggi':
      // Anno corrente: dal 1 gennaio fino al 31 dicembre dell'anno corrente
      return {
        from: startOfYear(now),
        to: endOfYear(now),
      };

    case 'ultimi-3-mesi':
      return {
        from: startOfDay(subMonths(now, 3)),
        to: endOfDay(now),
      };

    case 'ultimi-6-mesi':
      return {
        from: startOfDay(subMonths(now, 6)),
        to: endOfDay(now),
      };

    case 'ultimi-9-mesi':
      return {
        from: startOfDay(subMonths(now, 9)),
        to: endOfDay(now),
      };

    default:
      // Default: anno corrente
      return {
        from: startOfYear(now),
        to: endOfYear(now),
      };
  }
}

/**
 * Formatta un range di date per la visualizzazione
 */
export function formatDateRange(range: DateRange): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  const fromStr = range.from.toLocaleDateString('it-IT', formatOptions);
  const toStr = range.to.toLocaleDateString('it-IT', formatOptions);

  return `${fromStr} - ${toStr}`;
}
