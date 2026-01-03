'use client';

import { memo, useState, useEffect } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface DateRangePickerProps {
  from?: string; // formato yyyy-MM-dd
  to?: string; // formato yyyy-MM-dd
  onRangeChange?: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
}

export const DateRangePicker = memo(({
  from,
  to,
  onRangeChange,
  placeholder = 'Seleziona Intervallo',
  className = '',
}: DateRangePickerProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  const isActive = Boolean(from && to);

  // Sincronizza lo state locale con le props quando cambiano
  useEffect(() => {
    setDateRange({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }, [from, to]);

  const handleDateSelect = (range: any) => {
    if (!range) return;

    // Se from e to sono uguali, significa che è stato cliccato un solo giorno
    // In questo caso, imposta solo from e lascia to undefined
    if (range.from && range.to && range.from.getTime() === range.to.getTime()) {
      setDateRange({ from: range.from, to: undefined });
      return; // Non chiudere e non aggiornare ancora
    }

    setDateRange(range);

    // Aggiorna SEMPRE quando entrambe le date sono presenti
    if (range.from && range.to) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      const toStr = format(range.to, 'yyyy-MM-dd');

      onRangeChange?.(fromStr, toStr);
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
    onRangeChange?.(dateStr, toStr);

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
    onRangeChange?.(fromStr, dateStr);

    // Chiudi solo se entrambe le date sono presenti
    if (newRange.from) {
      setShowCalendar(false);
    }
  };

  const handleReset = () => {
    setDateRange({ from: undefined, to: undefined });
    onRangeChange?.('', '');
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

      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`h-11 gap-2 border-2 rounded-sm ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-white'} ${className}`}
          >
            <CalendarIcon className="h-4 w-4" />
            {dateRange.from && dateRange.to ? (
              <span>
                {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
              </span>
            ) : (
              <span>{placeholder}</span>
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
    </>
  );
});

DateRangePicker.displayName = 'DateRangePicker';
