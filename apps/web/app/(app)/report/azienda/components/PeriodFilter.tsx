'use client';

import { memo, useState, useEffect } from 'react';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export type PeriodType = 'oggi' | 'ultimi-3-mesi' | 'ultimi-6-mesi' | 'ultimi-9-mesi' | 'custom';

interface PeriodFilterProps {
  selectedPeriod: PeriodType;
  selectedYear?: number;
  customDateFrom?: string;
  customDateTo?: string;
  onPeriodChange: (period: PeriodType) => void;
  onYearChange: (year: number) => void;
  onCustomDateChange?: (from: string, to: string) => void;
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
  customDateFrom,
  customDateTo,
  onPeriodChange,
  onYearChange,
  onCustomDateChange,
}: PeriodFilterProps) => {
  const years = generateYears();
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: customDateFrom ? new Date(customDateFrom) : undefined,
    to: customDateTo ? new Date(customDateTo) : undefined,
  });

  const currentYear = new Date().getFullYear();
  const isCurrentYear = selectedYear === currentYear;
  const isYearFilterActive = !isCurrentYear;
  const isCustomActive = selectedPeriod === 'custom';

  // Sincronizza lo state locale con le props quando cambiano
  useEffect(() => {
    setDateRange({
      from: customDateFrom ? new Date(customDateFrom) : undefined,
      to: customDateTo ? new Date(customDateTo) : undefined,
    });
  }, [customDateFrom, customDateTo]);

  const handleDateSelect = (range: any) => {
    if (!range) return;

    // Se from e to sono uguali, significa che è stato cliccato un solo giorno
    // In questo caso, imposta solo from e lascia to undefined
    if (range.from && range.to && range.from.getTime() === range.to.getTime()) {
      setDateRange({ from: range.from, to: undefined });
      return; // Non chiudere e non aggiornare ancora
    }

    setDateRange(range);

    // Aggiorna SEMPRE quando entrambe le date sono presenti (anche se sono uguali alle precedenti)
    if (range.from && range.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      const toStr = format(range.to, 'yyyy-MM-dd');

      // Forza l'aggiornamento anche se le date sembrano uguali
      onPeriodChange('custom');
      onCustomDateChange?.(fromStr, toStr);

      setShowCalendar(false); // Chiudi quando il range è completo
    }
  };

  const handleStartDateChange = (dateStr: string) => {
    if (!dateStr) return;
    const newFrom = new Date(dateStr);
    const newRange = { ...dateRange, from: newFrom };

    // Validazione: se c'è una data di fine, controlla che l'inizio non sia dopo
    if (newRange.to && newFrom > newRange.to) {
      alert('La data di inizio non può essere successiva alla data di fine');
      return;
    }

    setDateRange(newRange);

    // Aggiorna sempre
    const toStr = newRange.to ? format(newRange.to, 'yyyy-MM-dd') : '';
    onCustomDateChange?.(dateStr, toStr);
    onPeriodChange('custom');

    // Chiudi solo se entrambe le date sono presenti
    if (newRange.to) {
      setShowCalendar(false);
    }
  };

  const handleEndDateChange = (dateStr: string) => {
    if (!dateStr) return;
    const newTo = new Date(dateStr);
    const newRange = { ...dateRange, to: newTo };

    // Validazione: se c'è una data di inizio, controlla che la fine non sia prima
    if (newRange.from && newTo < newRange.from) {
      alert('La data di fine non può essere precedente alla data di inizio');
      return;
    }

    setDateRange(newRange);

    // Aggiorna sempre
    const fromStr = newRange.from ? format(newRange.from, 'yyyy-MM-dd') : '';
    onCustomDateChange?.(fromStr, dateStr);
    onPeriodChange('custom');

    // Chiudi solo se entrambe le date sono presenti
    if (newRange.from) {
      setShowCalendar(false);
    }
  };

  const handleReset = () => {
    setDateRange({ from: undefined, to: undefined });
    onCustomDateChange?.('', '');
    onPeriodChange('oggi'); // Torna ad "Anno corrente"
    setShowCalendar(false);
  };

  return (
    <>
      <style jsx global>{`
        .calendar-green .rdp-nav button,
        .calendar-green .rdp-button_previous,
        .calendar-green .rdp-button_next,
        .calendar-green button[name="previous-month"],
        .calendar-green button[name="next-month"] {
          color: rgb(5, 150, 105) !important;
        }
        .calendar-green .rdp-nav button:hover,
        .calendar-green .rdp-button_previous:hover,
        .calendar-green .rdp-button_next:hover,
        .calendar-green button[name="previous-month"]:hover,
        .calendar-green button[name="next-month"]:hover {
          background-color: rgba(5, 150, 105, 0.1) !important;
        }
        .calendar-green .rdp-nav button svg,
        .calendar-green .rdp-button_previous svg,
        .calendar-green .rdp-button_next svg,
        .calendar-green button[name="previous-month"] svg,
        .calendar-green button[name="next-month"] svg {
          color: rgb(5, 150, 105) !important;
          fill: rgb(5, 150, 105) !important;
          stroke: rgb(5, 150, 105) !important;
        }
      `}</style>
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

      {/* Intervallo Date Personalizzato */}
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-11 gap-2 border-2 rounded-sm ${isCustomActive ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}
          >
            <CalendarIcon className="h-4 w-4" />
            {dateRange.from && dateRange.to ? (
              <span>
                {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
              </span>
            ) : (
              <span>Seleziona Intervallo</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-4 space-y-4">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              defaultMonth={dateRange?.from}
              className="calendar-green !border-0"
              locale={it}
            />
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Inizio</Label>
                <Input
                  type="text"
                  value={dateRange.from ? format(dateRange.from, 'dd/MM/yyyy') : ''}
                  onChange={(e) => {
                    const parts = e.target.value.split('/');
                    if (parts.length === 3) {
                      const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                      handleStartDateChange(dateStr);
                    }
                  }}
                  placeholder="gg/mm/aaaa"
                  className="h-9 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fine</Label>
                <Input
                  type="text"
                  value={dateRange.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}
                  onChange={(e) => {
                    const parts = e.target.value.split('/');
                    if (parts.length === 3) {
                      const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                      handleEndDateChange(dateStr);
                    }
                  }}
                  placeholder="gg/mm/aaaa"
                  className="h-9 border-border"
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
              >
                Reset Intervallo
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

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
    </>
  );
});

PeriodFilter.displayName = 'PeriodFilter';
