'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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

export default function MobilePresenzePage() {
  const [loading, setLoading] = useState(true);
  const [rapportini, setRapportini] = useState<Rapportino[]>([]);
  const [filter, setFilter] = useState<'tutti' | 'approvato' | 'da_approvare' | 'rifiutato'>('tutti');

  // Month navigation
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  // Popover state
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Generate years (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i);

  useEffect(() => {
    loadRapportini();
  }, [currentMonth, currentYear]);

  const loadRapportini = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get dipendente
      const { data: dipendente } = await supabase
        .from('dipendenti')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!dipendente) return;

      // Get first and last day of selected month
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);

      // Get rapportini for selected month
      const { data } = await supabase
        .from('rapportini')
        .select(`
          id,
          data_rapportino,
          ore_lavorate,
          note,
          stato,
          commesse!inner (
            nome_commessa,
            cliente_commessa
          )
        `)
        .eq('dipendente_id', dipendente.id)
        .gte('data_rapportino', firstDay.toISOString().split('T')[0])
        .lte('data_rapportino', lastDay.toISOString().split('T')[0])
        .order('data_rapportino', { ascending: false });

      // Map data to correct format (Supabase returns commesse as array, we need object)
      const mappedData: Rapportino[] = (data || []).map((item: any) => ({
        ...item,
        commesse: Array.isArray(item.commesse) ? item.commesse[0] : item.commesse,
      }));

      setRapportini(mappedData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading rapportini:', error);
      setLoading(false);
    }
  };

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

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getMonthName = () => {
    return `${MESI[currentMonth]} ${currentYear}`;
  };

  const applyMonthYearSelection = () => {
    setCurrentMonth(selectedMonth);
    setCurrentYear(selectedYear);
    setShowMonthPicker(false);
  };

  const filteredRapportini = filter === 'tutti'
    ? rapportini
    : rapportini.filter(r => r.stato === filter);

  const stats = {
    totale: rapportini.length,
    approvati: rapportini.filter(r => r.stato === 'approvato').length,
    daApprovare: rapportini.filter(r => r.stato === 'da_approvare').length,
    rifiutati: rapportini.filter(r => r.stato === 'rifiutato').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Registro Presenze</h1>
        <Link href="/mobile/presenze/nuovo">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-10 w-10 p-0">
            <Plus className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center rounded-lg bg-card overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={previousMonth}
          className="h-11 w-11 p-0 rounded-none border-0"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="w-px h-7 bg-border" />

        <Popover open={showMonthPicker} onOpenChange={setShowMonthPicker}>
          <PopoverTrigger asChild>
            <button
              className="h-11 px-6 font-bold text-xl flex-1 hover:text-primary transition-colors"
              onClick={() => {
                setSelectedMonth(currentMonth);
                setSelectedYear(currentYear);
              }}
            >
              {getMonthName()}
            </button>
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

        <div className="w-px h-7 bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          className="h-11 w-11 p-0 rounded-none border-0"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setFilter('tutti')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'tutti'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tutti ({stats.totale})
        </button>
        <button
          onClick={() => setFilter('approvato')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'approvato'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Approvati ({stats.approvati})
        </button>
        <button
          onClick={() => setFilter('da_approvare')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'da_approvare'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Da approvare ({stats.daApprovare})
        </button>
        <button
          onClick={() => setFilter('rifiutato')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'rifiutato'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Rifiutati ({stats.rifiutati})
        </button>
      </div>

      {/* Rapportini List */}
      <div className="space-y-3 pb-4">
        {filteredRapportini.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Nessun rapportino trovato</p>
          </Card>
        ) : (
          filteredRapportini.map((rapportino) => (
            <Card key={rapportino.id} className="p-4 border-2 border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatoIcon(rapportino.stato)}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatDate(rapportino.data_rapportino)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rapportino.commesse?.nome_commessa || 'Commessa non disponibile'}
                    </p>
                  </div>
                </div>
                {getStatoBadge(rapportino.stato)}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-lg font-bold text-gray-900">
                    {rapportino.ore_lavorate}h
                  </span>
                </div>
                {rapportino.note && (
                  <p className="text-xs text-gray-500 max-w-[200px] truncate">
                    {rapportino.note}
                  </p>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
