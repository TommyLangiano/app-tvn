'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { useMobileData } from '@/contexts/MobileDataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertCircle, XCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

interface Rapportino {
  id: string;
  data_rapportino: string;
  ore_lavorate: number;
  note: string | null;
  stato: 'approvato' | 'da_approvare' | 'rifiutato';
  commesse: {
    nome_commessa: string;
    cliente_commessa: string;
  } | null;
}

const getStatoIcon = (stato: string) => {
  switch (stato) {
    case 'approvato':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'da_approvare':
      return <AlertCircle className="w-5 h-5 text-amber-600" />;
    case 'rifiutato':
      return <XCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getStatoBadge = (stato: string) => {
  const styles = {
    approvato: 'bg-green-100 text-green-700 border-green-200',
    da_approvare: 'bg-amber-100 text-amber-700 border-amber-200',
    rifiutato: 'bg-red-100 text-red-700 border-red-200',
  };

  const labels = {
    approvato: 'Approvato',
    da_approvare: 'Da approvare',
    rifiutato: 'Rifiutato',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[stato as keyof typeof styles]}`}>
      {labels[stato as keyof typeof labels]}
    </span>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
};

const RapportinoCard = memo(({ rapportino }: { rapportino: Rapportino }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5">
          {getStatoIcon(rapportino.stato)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate">
            {rapportino.commesse?.nome_commessa || 'Commessa non disponibile'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(rapportino.data_rapportino)}
          </p>
          <div className="mt-2">
            {getStatoBadge(rapportino.stato)}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <span className="text-lg font-bold text-emerald-600">
          {rapportino.ore_lavorate}h
        </span>
      </div>
    </div>
  </div>
));

RapportinoCard.displayName = 'RapportinoCard';

const FilterButton = memo(({
  active,
  onClick,
  children,
  color = 'emerald'
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
      active
        ? `bg-${color}-600 text-white shadow-md`
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
));

FilterButton.displayName = 'FilterButton';

const MonthNavigator = memo(({
  currentMonth,
  currentYear,
  onPrevious,
  onNext,
  onMonthYearSelect
}: {
  currentMonth: number;
  currentYear: number;
  onPrevious: () => void;
  onNext: () => void;
  onMonthYearSelect: () => void;
}) => {
  const monthName = useMemo(() => `${MESI[currentMonth]} ${currentYear}`, [currentMonth, currentYear]);

  return (
    <div className="flex items-center rounded-xl bg-gray-50 overflow-hidden border border-gray-200">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        className="h-11 w-11 p-0 rounded-none border-0 hover:bg-gray-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <div className="w-px h-7 bg-gray-200" />

      <button
        className="h-11 px-4 font-bold text-lg flex-1 hover:text-emerald-600 transition-colors"
        onClick={onMonthYearSelect}
      >
        {monthName}
      </button>

      <div className="w-px h-7 bg-gray-200" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        className="h-11 w-11 p-0 rounded-none border-0 hover:bg-gray-100"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
});

MonthNavigator.displayName = 'MonthNavigator';

export default function MobilePresenzePage() {
  const { rapportini: allRapportini } = useMobileData();
  const [filter, setFilter] = useState<'tutti' | 'approvato' | 'da_approvare' | 'rifiutato'>('tutti');

  const now = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const years = useMemo(() =>
    Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i),
    []
  );

  const rapportini = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    return allRapportini.filter(r => {
      const date = new Date(r.data_rapportino);
      return date >= firstDay && date <= lastDay;
    });
  }, [allRapportini, currentMonth, currentYear]);

  const previousMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }, [currentMonth, currentYear]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }, [currentMonth, currentYear]);

  const handleMonthYearSelect = useCallback(() => {
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setShowMonthPicker(true);
  }, [currentMonth, currentYear]);

  const applyMonthYearSelection = useCallback(() => {
    setCurrentMonth(selectedMonth);
    setCurrentYear(selectedYear);
    setShowMonthPicker(false);
  }, [selectedMonth, selectedYear]);

  const filteredRapportini = useMemo(() =>
    filter === 'tutti' ? rapportini : rapportini.filter(r => r.stato === filter),
    [filter, rapportini]
  );

  const stats = useMemo(() => ({
    totale: rapportini.length,
    approvati: rapportini.filter(r => r.stato === 'approvato').length,
    daApprovare: rapportini.filter(r => r.stato === 'da_approvare').length,
    rifiutati: rapportini.filter(r => r.stato === 'rifiutato').length,
  }), [rapportini]);

  const totaleOreMese = useMemo(() =>
    rapportini.reduce((sum, r) => sum + (Number(r.ore_lavorate) || 0), 0),
    [rapportini]
  );

  const monthName = useMemo(() => `${MESI[currentMonth]} ${currentYear}`, [currentMonth, currentYear]);

  return (
    <div className="space-y-6">
      <div className="bg-emerald-600 px-6 py-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Registro Presenze</h1>
          <Link href="/mobile/presenze/nuovo" prefetch={true}>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Plus className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            </button>
          </Link>
        </div>
      </div>

      <div className="relative z-10" style={{ marginTop: '-40px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100 space-y-4">
          <MonthNavigator
            currentMonth={currentMonth}
            currentYear={currentYear}
            onPrevious={previousMonth}
            onNext={nextMonth}
            onMonthYearSelect={handleMonthYearSelect}
          />

          <Popover open={showMonthPicker} onOpenChange={setShowMonthPicker}>
            <PopoverTrigger asChild>
              <div style={{ display: 'none' }} />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="center">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Anno</label>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(value) => setSelectedYear(Number(value))}
                  >
                    <SelectTrigger className="w-full border-2 border-border bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Mese</label>
                  <div className="grid grid-cols-3 gap-2">
                    {MESI.map((mese, index) => (
                      <Button
                        key={index}
                        variant={selectedMonth === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedMonth(index)}
                        className="text-xs"
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
                    size="sm"
                    onClick={() => setShowMonthPicker(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    size="sm"
                    onClick={applyMonthYearSelection}
                  >
                    Applica
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="grid grid-cols-2 gap-2">
            <FilterButton
              active={filter === 'tutti'}
              onClick={() => setFilter('tutti')}
            >
              Tutti ({stats.totale})
            </FilterButton>
            <FilterButton
              active={filter === 'approvato'}
              onClick={() => setFilter('approvato')}
              color="green"
            >
              Approvati ({stats.approvati})
            </FilterButton>
            <FilterButton
              active={filter === 'da_approvare'}
              onClick={() => setFilter('da_approvare')}
              color="amber"
            >
              Da approvare ({stats.daApprovare})
            </FilterButton>
            <FilterButton
              active={filter === 'rifiutato'}
              onClick={() => setFilter('rifiutato')}
              color="red"
            >
              Rifiutati ({stats.rifiutati})
            </FilterButton>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-32">
        {filteredRapportini.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">Nessun rapportino trovato</p>
          </div>
        ) : (
          filteredRapportini.map((rapportino) => (
            <RapportinoCard key={rapportino.id} rapportino={rapportino} />
          ))
        )}
      </div>

      {rapportini.length > 0 && (
        <div className="fixed left-4 right-4 z-10" style={{
          bottom: 'calc(90px + env(safe-area-inset-bottom))'
        }}>
          <div className="bg-emerald-600 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" />
                <span className="font-semibold text-white">Totale ore {monthName}</span>
              </div>
              <span className="text-2xl font-bold text-white">
                {totaleOreMese}h
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
