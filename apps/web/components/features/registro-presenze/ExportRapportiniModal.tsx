'use client';

import { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet, FileText, FileType, List, Grid3x3, Calendar, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ModalWrapper } from '@/components/common/ModalWrapper';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ExportRapportiniModalProps {
  onClose: () => void;
  users: User[];
  currentMonth: number;
  currentYear: number;
  onExport: (format: 'excel' | 'pdf' | 'csv', selectedUserIds: string[], layout: 'list' | 'grid', periodo: { month: number; year: number } | { dataInizio: string; dataFine: string }) => void;
}

type User = {
  id: string;
  email: string;
  role: string;
  user_metadata?: {
    full_name?: string;
  };
};

export function ExportRapportiniModal({ onClose, users, currentMonth, currentYear, onExport }: ExportRapportiniModalProps) {
  const [selectedLayout, setSelectedLayout] = useState<'list' | 'grid'>('grid');
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [tipoPeriodo, setTipoPeriodo] = useState<'mese' | 'range'>('mese');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [dataInizio, setDataInizio] = useState<string>('');
  const [dataFine, setDataFine] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set(users.map(u => u.id)));
  const [searchTerm, setSearchTerm] = useState<string>('');

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)));
    }
  };

  const handleExport = () => {
    if (selectedUsers.size === 0) {
      toast.error('Seleziona almeno un dipendente');
      return;
    }

    if (tipoPeriodo === 'range' && (!dataInizio || !dataFine)) {
      toast.error('Seleziona entrambe le date');
      return;
    }

    const periodo = tipoPeriodo === 'mese'
      ? { month: selectedMonth, year: selectedYear }
      : { dataInizio, dataFine };

    onExport(selectedFormat, Array.from(selectedUsers), selectedLayout, periodo);
    onClose();
  };

  // Quando cambia il layout, resetta il tipo periodo se necessario
  const handleLayoutChange = (newLayout: 'list' | 'grid') => {
    setSelectedLayout(newLayout);
    // Se passo a griglia e ho il range selezionato, torno a mese
    if (newLayout === 'grid' && tipoPeriodo === 'range') {
      setTipoPeriodo('mese');
    }
  };

  // Generate years (current year ± 5 years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const MESI = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  // Filter users based on search term
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user => {
      const fullName = user.user_metadata?.full_name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return fullName.includes(term) || email.includes(term);
    });
  }, [users, searchTerm]);

  return (
    <ModalWrapper onClose={onClose}>
      <div className="bg-background rounded-xl border-2 border-border max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-border">
          <div>
            <h2 className="text-2xl font-bold">Esporta Rapportini</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configura layout, formato e periodo
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Layout */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Layout</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Elenco */}
              <button
                onClick={() => handleLayoutChange('list')}
                className={`p-4 rounded-lg border-2 transition-all bg-card ${
                  selectedLayout === 'list'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <List className={`h-8 w-8 mx-auto mb-2 ${
                  selectedLayout === 'list' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedLayout === 'list' ? 'text-primary' : 'text-foreground'
                }`}>
                  Elenco
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lista tradizionale
                </p>
              </button>

              {/* Griglia */}
              <button
                onClick={() => handleLayoutChange('grid')}
                className={`p-4 rounded-lg border-2 transition-all bg-card ${
                  selectedLayout === 'grid'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Grid3x3 className={`h-8 w-8 mx-auto mb-2 ${
                  selectedLayout === 'grid' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedLayout === 'grid' ? 'text-primary' : 'text-foreground'
                }`}>
                  Griglia
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Timesheet mensile
                </p>
              </button>
            </div>
          </div>

          {/* Formato Export */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Formato</Label>
            <div className="grid grid-cols-3 gap-3">
              {/* Excel */}
              <button
                onClick={() => setSelectedFormat('excel')}
                className={`p-4 rounded-lg border-2 transition-all bg-card ${
                  selectedFormat === 'excel'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <FileSpreadsheet className={`h-8 w-8 mx-auto mb-2 ${
                  selectedFormat === 'excel' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedFormat === 'excel' ? 'text-primary' : 'text-foreground'
                }`}>
                  Excel
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formattato
                </p>
              </button>

              {/* PDF */}
              <button
                onClick={() => setSelectedFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-all bg-card ${
                  selectedFormat === 'pdf'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <FileText className={`h-8 w-8 mx-auto mb-2 ${
                  selectedFormat === 'pdf' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedFormat === 'pdf' ? 'text-primary' : 'text-foreground'
                }`}>
                  PDF
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Stampabile
                </p>
              </button>

              {/* CSV */}
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`p-4 rounded-lg border-2 transition-all bg-card ${
                  selectedFormat === 'csv'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <FileType className={`h-8 w-8 mx-auto mb-2 ${
                  selectedFormat === 'csv' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className={`text-sm font-medium ${
                  selectedFormat === 'csv' ? 'text-primary' : 'text-foreground'
                }`}>
                  CSV
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dati semplici
                </p>
              </button>
            </div>
          </div>

          {/* Periodo */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Periodo</Label>

            {/* Tipo Periodo Buttons */}
            <div className={`grid ${selectedLayout === 'list' ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
              <button
                onClick={() => setTipoPeriodo('mese')}
                className={`p-4 rounded-lg border-2 transition-all bg-card ${
                  tipoPeriodo === 'mese'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className={`text-sm font-medium ${
                  tipoPeriodo === 'mese' ? 'text-primary' : 'text-foreground'
                }`}>
                  Mese Specifico
                </p>
              </button>

              {selectedLayout === 'list' && (
                <button
                  onClick={() => setTipoPeriodo('range')}
                  className={`p-4 rounded-lg border-2 transition-all bg-card ${
                    tipoPeriodo === 'range'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    tipoPeriodo === 'range' ? 'text-primary' : 'text-foreground'
                  }`}>
                    Intervallo Date
                  </p>
                </button>
              )}
            </div>

            {/* Selezione Mese */}
            {tipoPeriodo === 'mese' && (
              <div className="grid grid-cols-3 gap-3">
                {/* Mese - 2 colonne */}
                <div className="col-span-2">
                  <Label className="text-sm mb-2 block">Mese</Label>
                  <Select
                    value={String(selectedMonth)}
                    onValueChange={(value) => setSelectedMonth(Number(value))}
                  >
                    <SelectTrigger className="h-11 border-2 border-border bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESI.map((mese, index) => (
                        <SelectItem key={index} value={String(index)}>
                          {mese}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Anno - 1 colonna */}
                <div>
                  <Label className="text-sm mb-2 block">Anno</Label>
                  <Select
                    value={String(selectedYear)}
                    onValueChange={(value) => setSelectedYear(Number(value))}
                  >
                    <SelectTrigger className="h-11 border-2 border-border bg-card">
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
              </div>
            )}

            {/* Selezione Range (Solo per Elenco) */}
            {tipoPeriodo === 'range' && selectedLayout === 'list' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Data Inizio</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="date"
                      value={dataInizio}
                      onChange={(e) => setDataInizio(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-lg border-2 border-border bg-card"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Data Fine</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input
                      type="date"
                      value={dataFine}
                      onChange={(e) => setDataFine(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 rounded-lg border-2 border-border bg-card"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selezione Dipendenti */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Dipendenti</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {selectedUsers.size === users.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cerca dipendente per nome o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border-2 border-border bg-card focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1 p-3 rounded-lg border-2 border-border bg-card">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Nessun dipendente trovato
                </p>
              ) : (
                filteredUsers.map(user => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/20 cursor-pointer transition-colors group"
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => toggleUser(user.id)}
                        className="h-5 w-5 rounded border-2 border-border cursor-pointer checked:bg-primary checked:border-primary transition-colors"
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium text-sm truncate">
                        {user.user_metadata?.full_name || 'Senza nome'}
                      </span>
                      {user.user_metadata?.full_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-2">
              {selectedUsers.size} di {users.length} dipendenti selezionati
              {searchTerm && filteredUsers.length !== users.length && (
                <span className="ml-1">({filteredUsers.length} visualizzati)</span>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t-2 border-border sticky bottom-0 bg-background">
          <Button variant="outline" onClick={onClose} className="min-w-[100px]">
            Annulla
          </Button>
          <Button onClick={handleExport} className="gap-2 min-w-[120px]">
            <Download className="h-4 w-4" />
            Esporta
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
}
