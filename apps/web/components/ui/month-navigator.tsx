'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface MonthNavigatorProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export function MonthNavigator({ currentMonth, currentYear, onMonthChange }: MonthNavigatorProps) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Generate years (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  const previousMonth = () => {
    const newDate = new Date(currentYear, currentMonth - 1, 1);
    onMonthChange(newDate.getMonth(), newDate.getFullYear());
  };

  const nextMonth = () => {
    const newDate = new Date(currentYear, currentMonth + 1, 1);
    onMonthChange(newDate.getMonth(), newDate.getFullYear());
  };

  const applyMonthYearSelection = () => {
    onMonthChange(selectedMonth, selectedYear);
    setShowMonthPicker(false);
  };

  return (
    <div className="flex items-center justify-center pt-1">
      <Button
        variant="ghost"
        size="lg"
        onClick={previousMonth}
        className="h-12 w-12 rounded-full hover:bg-transparent"
      >
        <ChevronLeft className="h-7 w-7 transition-colors hover:text-primary" />
      </Button>

      <Popover open={showMonthPicker} onOpenChange={setShowMonthPicker}>
        <PopoverTrigger asChild>
          <button
            className="px-10 py-2 font-bold text-4xl hover:text-primary transition-colors"
            onClick={() => {
              setSelectedMonth(currentMonth);
              setSelectedYear(currentYear);
            }}
          >
            {MESI[currentMonth]} {currentYear}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-6" align="center">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-base font-medium">Anno</label>
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-full h-11 text-base border-2 border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)} className="text-base">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium">Mese</label>
              <div className="grid grid-cols-3 gap-3">
                {MESI.map((mese, index) => (
                  <Button
                    key={index}
                    variant={selectedMonth === index ? 'default' : 'outline'}
                    size="default"
                    onClick={() => setSelectedMonth(index)}
                    className="text-sm h-10"
                  >
                    {mese.substring(0, 3)}
                  </Button>
                ))}
              </div>
            </div>

            <hr className="border-border" />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowMonthPicker(false)}
              >
                Annulla
              </Button>
              <Button
                size="default"
                onClick={applyMonthYearSelection}
              >
                Applica
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="lg"
        onClick={nextMonth}
        className="h-12 w-12 rounded-full hover:bg-transparent"
      >
        <ChevronRight className="h-7 w-7 transition-colors hover:text-primary" />
      </Button>
    </div>
  );
}
