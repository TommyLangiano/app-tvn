'use client';

import { memo } from 'react';
import { Calendar } from 'lucide-react';

export type PeriodType = 'oggi' | 'ultimi-3-mesi' | 'ultimi-6-mesi' | 'ultimi-9-mesi';

interface PeriodFilterProps {
  selectedPeriod: PeriodType;
  selectedYear?: number;
  onPeriodChange: (period: PeriodType) => void;
  onYearChange: (year: number) => void;
}

const PERIOD_OPTIONS: Array<{ value: PeriodType; label: string }> = [
  { value: 'oggi', label: 'Anno corrente' },
  { value: 'ultimi-3-mesi', label: 'Ultimi 3 mesi' },
  { value: 'ultimi-6-mesi', label: 'Ultimi 6 mesi' },
  { value: 'ultimi-9-mesi', label: 'Ultimi 9 mesi' },
];

// Genera lista anni (ultimi 10 anni + anno corrente)
const generateYears = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i <= 10; i++) {
    years.push(currentYear - i);
  }
  return years;
};

export const PeriodFilter = memo(({
  selectedPeriod,
  selectedYear,
  onPeriodChange,
  onYearChange,
}: PeriodFilterProps) => {
  const years = generateYears();

  return (
    <div className="mb-6">
      {/* Filtro Periodo - centrato con dropdown anno integrato */}
      <div className="flex justify-center">
        <div className="flex flex-wrap gap-2 justify-center items-center">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onPeriodChange(option.value)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  selectedPeriod === option.value
                    ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              {option.label}
            </button>
          ))}

          {/* Dropdown Anno - sempre visibile */}
          <select
            value={selectedYear || new Date().getFullYear()}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all cursor-pointer"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

PeriodFilter.displayName = 'PeriodFilter';
