'use client';

import { memo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const isYearFilterActive = !isCurrentYear;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {/* Filtri periodo - solo per anno corrente */}
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onPeriodChange(option.value)}
          className={`
            px-4 py-3 border-b-2 transition-colors font-medium
            ${
              isCurrentYear && selectedPeriod === option.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {option.label}
        </button>
      ))}

      {/* Dropdown Anno */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className={`text-sm font-medium ${isYearFilterActive ? 'text-primary' : 'text-muted-foreground'}`}>
          Anno:
        </span>
        <select
          value={selectedYear || currentYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className={`font-medium transition-colors cursor-pointer bg-transparent focus:outline-none border-b-2 ${
            isYearFilterActive
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Separatore */}
      <div className="h-8 w-px bg-border mx-2"></div>

      {/* Pulsante Esporta */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-11 gap-2 border-2 border-border rounded-sm bg-white">
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline">Esporta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => console.log('Esporta CSV')}>Esporta CSV</DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log('Esporta Excel')}>Esporta Excel</DropdownMenuItem>
          <DropdownMenuItem onClick={() => console.log('Esporta PDF')}>Esporta PDF</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

PeriodFilter.displayName = 'PeriodFilter';
