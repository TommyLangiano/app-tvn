'use client';

import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMobileData } from '@/contexts/MobileDataContext';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Plus,
  Receipt,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Euro,
  ArrowLeft,
  FileText,
  X,
  Calendar,
  Building2,
  Edit2,
  Save
} from 'lucide-react';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

type StatoRichiesta = 'approvato' | 'da_approvare' | 'rifiutato';

interface NotaSpesa {
  id: string;
  data_nota: string;
  importo: number;
  stato: 'approvato' | 'da_approvare' | 'rifiutato';
  descrizione: string | null;
  numero_nota: string;
  created_at?: string;
  categoria?: string;
  commessa_id?: string;
  categorie_note_spesa: {
    nome: string;
    colore: string;
  } | null;
  commesse: {
    nome_commessa: string;
  } | null;
  allegati?: any[];
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
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
  }
};

const getStatoBadge = (stato: string) => {
  const styles = {
    approvato: 'bg-green-100 text-green-700 border-green-200',
    da_approvare: 'bg-amber-100 text-amber-700 border-amber-200',
    rifiutato: 'bg-red-100 text-red-700 border-red-200',
  };

  const labels = {
    approvato: 'Approvata',
    da_approvare: 'Da approvare',
    rifiutato: 'Rifiutata',
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const getStatoColor = (stato: string) => {
  switch (stato) {
    case 'approvato':
      return '#10b981'; // green
    case 'da_approvare':
      return '#f59e0b'; // amber
    case 'rifiutato':
      return '#ef4444'; // red
    default:
      return '#9ca3af'; // gray
  }
};

const NotaSpesaCard = memo(({ notaSpesa, onClick }: { notaSpesa: NotaSpesa; onClick: () => void }) => (
  <div
    className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
  >
    <div className="flex">
      {/* Barra laterale colorata */}
      <div
        className="w-1.5 flex-shrink-0"
        style={{ backgroundColor: getStatoColor(notaSpesa.stato) }}
      />

      {/* Contenuto */}
      <div className="flex-1 p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Nome commessa */}
          <p className="font-bold text-base text-gray-900 mb-1">
            {notaSpesa.commesse?.nome_commessa || 'Commessa'}
          </p>

          {/* Categoria */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {notaSpesa.categorie_note_spesa?.nome || 'Categoria'}
            </p>
            {notaSpesa.categorie_note_spesa && (
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: notaSpesa.categorie_note_spesa.colore }}
              />
            )}
          </div>
        </div>

        {/* Importo */}
        <div className="flex-shrink-0 text-right">
          <span className="text-lg font-bold text-emerald-600">
            {formatCurrency(notaSpesa.importo)}
          </span>
        </div>
      </div>
    </div>
  </div>
));

NotaSpesaCard.displayName = 'NotaSpesaCard';

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
    <div className="flex items-center rounded-xl bg-white overflow-hidden border border-gray-200 shadow-md">
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

const StatoFilterCard = memo(({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`bg-white rounded-xl p-2.5 border-2 shadow-sm transition-all w-full ${
      active
        ? 'border-emerald-500 shadow-md'
        : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <p className={`text-xs font-bold ${active ? 'text-emerald-600' : 'text-gray-700'}`}>
      {label}
    </p>
  </button>
));

StatoFilterCard.displayName = 'StatoFilterCard';

export default function NoteSpesaPage() {
  const { noteSpese: allNoteSpese, refreshData } = useMobileData();

  // Filtri
  const [statoRichiesta, setStatoRichiesta] = useState<StatoRichiesta | null>('approvato');

  // Modal dettaglio
  const [selectedNotaSpesa, setSelectedNotaSpesa] = useState<NotaSpesa | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>({});
  const [categorie, setCategorie] = useState<Array<{ id: string; nome: string; colore: string }>>([]);
  const [commesse, setCommesse] = useState<Array<{ id: string; nome_commessa: string }>>([]);

  useEffect(() => {
    setMounted(true);
    loadCategorie();
    loadCommesse();
  }, []);

  const loadCategorie = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      const { data: categorieData } = await supabase
        .from('categorie_note_spesa')
        .select('id, nome, colore')
        .eq('tenant_id', userTenants.tenant_id)
        .eq('attiva', true)
        .order('ordinamento');

      if (categorieData) {
        setCategorie(categorieData);
      }
    } catch (error) {
      console.error('Error loading categorie:', error);
    }
  };

  const loadCommesse = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      const { data: commesseData } = await supabase
        .from('commesse')
        .select('id, nome_commessa')
        .eq('tenant_id', userTenants.tenant_id)
        .order('nome_commessa');

      if (commesseData) {
        setCommesse(commesseData);
      }
    } catch (error) {
      console.error('Error loading commesse:', error);
    }
  };

  // Navigazione mese
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

  // Filtra note spese per mese corrente
  const noteSpeseMese = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    return allNoteSpese.filter(n => {
      const date = new Date(n.data_nota);
      return date >= firstDay && date <= lastDay;
    });
  }, [allNoteSpese, currentMonth, currentYear]);

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

  // Filtra richieste
  const richiesteFiltered = useMemo(() => {
    let filtered = noteSpeseMese;

    // Filtro per stato
    if (statoRichiesta) {
      filtered = filtered.filter(n => n.stato === statoRichiesta);
    }

    return filtered;
  }, [noteSpeseMese, statoRichiesta]);

  // Contatori per filtri stato
  const statsStato = useMemo(() => ({
    approvate: noteSpeseMese.filter(n => n.stato === 'approvato').length,
    daApprovare: noteSpeseMese.filter(n => n.stato === 'da_approvare').length,
    rifiutate: noteSpeseMese.filter(n => n.stato === 'rifiutato').length,
  }), [noteSpeseMese]);

  // Totale importi mese
  const totaleImportoMese = useMemo(() =>
    richiesteFiltered.reduce((sum, n) => sum + (Number(n.importo) || 0), 0),
    [richiesteFiltered]
  );

  const monthName = useMemo(() => `${MESI[currentMonth]} ${currentYear}`, [currentMonth, currentYear]);

  return (
    <div className="space-y-6">
      {/* Header verde */}
      <div className="bg-emerald-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mobile/richieste" prefetch={true}>
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
              <ArrowLeft className="text-white" style={{ width: '20px', height: '20px' }} strokeWidth={2.5} />
            </button>
          </Link>
          <h1 className="text-xl font-bold flex-1">Note Spesa</h1>
          <Link href="/mobile/richieste/nuova-nota-spesa" prefetch={true}>
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

      {/* Contenuto */}
      <div className="relative z-10" style={{ marginTop: '-40px', paddingLeft: '16px', paddingRight: '16px' }}>

        {/* Navigatore Mese */}
        <div className="mb-4">
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
        </div>

        {/* Card Filtri Stato */}
        <div className="grid grid-cols-3 gap-3">
          <StatoFilterCard
            label="Approvate"
            active={statoRichiesta === 'approvato'}
            onClick={() => setStatoRichiesta(statoRichiesta === 'approvato' ? null : 'approvato')}
          />
          <StatoFilterCard
            label="Da approvare"
            active={statoRichiesta === 'da_approvare'}
            onClick={() => setStatoRichiesta(statoRichiesta === 'da_approvare' ? null : 'da_approvare')}
          />
          <StatoFilterCard
            label="Rifiutate"
            active={statoRichiesta === 'rifiutato'}
            onClick={() => setStatoRichiesta(statoRichiesta === 'rifiutato' ? null : 'rifiutato')}
          />
        </div>
      </div>

      {/* Lista richieste */}
      <div className="px-4 space-y-3 pb-4">
        {richiesteFiltered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-gray-100">
                <Receipt className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna nota spesa
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {statoRichiesta ? 'Non ci sono note spesa con questo stato' : 'Non ci sono note spesa per questo periodo'}
            </p>
            <Link href="/mobile/richieste/nuova" prefetch={true}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Crea nota spesa
              </Button>
            </Link>
          </div>
        ) : (
          richiesteFiltered.map((notaSpesa) => (
            <NotaSpesaCard
              key={notaSpesa.id}
              notaSpesa={notaSpesa}
              onClick={() => {
                setSelectedNotaSpesa(notaSpesa);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {/* Modal Dettaglio Nota Spesa - Popup usando Portal */}
      {mounted && isModalOpen && selectedNotaSpesa && createPortal(
        <>
          <style>{`
            @keyframes modalFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes modalZoomIn {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>

          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                animation: 'modalFadeIn 0.2s ease-out',
              }}
              onClick={() => setIsModalOpen(false)}
            />

            {/* Modal Content */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '450px',
                maxHeight: '85vh',
                backgroundColor: 'white',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                animation: 'modalZoomIn 0.2s ease-out',
              }}
            >
              {/* Header */}
              <div style={{ backgroundColor: '#059669', padding: '20px 24px', color: 'white', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Dettaglio Nota Spesa</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={async () => {
                        if (isEditing) {
                          // Save logic
                          try {
                            const supabase = createClient();

                            // Se la nota era approvata o rifiutata, torna a da_approvare
                            const updateData: any = {
                              importo: editedData.importo,
                              descrizione: editedData.descrizione,
                              data_nota: editedData.data_nota,
                              categoria: editedData.categoria,
                              commessa_id: editedData.commessa_id,
                            };

                            // Se era approvata o rifiutata, reset stato e campi audit
                            if (selectedNotaSpesa.stato === 'approvato' || selectedNotaSpesa.stato === 'rifiutato') {
                              updateData.stato = 'da_approvare';
                              updateData.approvato_da = null;
                              updateData.approvato_il = null;
                              updateData.rifiutato_da = null;
                              updateData.rifiutato_il = null;
                              updateData.motivo_rifiuto = null;
                            }

                            const { data, error } = await supabase
                              .from('note_spesa')
                              .update(updateData)
                              .eq('id', selectedNotaSpesa.id)
                              .select();

                            if (error) {
                              toast.error('Errore durante il salvataggio');
                              console.error('Error saving:', error);
                            } else {
                              if (selectedNotaSpesa.stato === 'approvato' || selectedNotaSpesa.stato === 'rifiutato') {
                                toast.success('Nota spesa modificata, richiede nuova approvazione');
                              } else {
                                toast.success('Nota spesa aggiornata');
                              }
                              await refreshData();
                              setIsModalOpen(false);
                              setIsEditing(false);
                            }
                          } catch (error) {
                            toast.error('Errore durante il salvataggio');
                            console.error('Error saving:', error);
                          }
                        } else {
                          setIsEditing(true);
                          setEditedData({
                            importo: selectedNotaSpesa.importo,
                            descrizione: selectedNotaSpesa.descrizione || '',
                            data_nota: selectedNotaSpesa.data_nota,
                            categoria: selectedNotaSpesa.categoria || '',
                            commessa_id: selectedNotaSpesa.commessa_id || '',
                          });
                        }
                      }}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                    >
                      {isEditing ? <Save style={{ width: '18px', height: '18px' }} /> : <Edit2 style={{ width: '18px', height: '18px' }} />}
                    </button>
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setIsEditing(false);
                      }}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                    >
                      <X style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px', maxHeight: 'calc(85vh - 80px)', overflowY: 'auto' }}>
                {/* Stato */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '10px',
                  backgroundColor: `${getStatoColor(selectedNotaSpesa.stato)}15`,
                  marginBottom: '12px'
                }}>
                  <div style={{
                    padding: '6px',
                    borderRadius: '6px',
                    backgroundColor: getStatoColor(selectedNotaSpesa.stato),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getStatoIcon(selectedNotaSpesa.stato)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Stato</p>
                    <p style={{ fontSize: '15px', fontWeight: 'bold', color: getStatoColor(selectedNotaSpesa.stato), margin: 0 }}>
                      {selectedNotaSpesa.stato === 'approvato' ? 'Approvata' : selectedNotaSpesa.stato === 'da_approvare' ? 'Da Approvare' : 'Rifiutata'}
                    </p>
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Numero Nota</p>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedNotaSpesa.numero_nota}</p>
                  </div>

                  <div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Data</p>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedData.data_nota || ''}
                        onChange={(e) => setEditedData({ ...editedData, data_nota: e.target.value })}
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          width: '100%',
                          backgroundColor: 'white'
                        }}
                      />
                    ) : (
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{formatDate(selectedNotaSpesa.data_nota)}</p>
                    )}
                  </div>
                </div>

                {/* Commessa e Categoria */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Commessa</p>
                    {isEditing ? (
                      <select
                        value={editedData.commessa_id || ''}
                        onChange={(e) => setEditedData({ ...editedData, commessa_id: e.target.value })}
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          width: '100%',
                          backgroundColor: 'white'
                        }}
                      >
                        {commesse.map(comm => (
                          <option key={comm.id} value={comm.id}>{comm.nome_commessa}</option>
                        ))}
                      </select>
                    ) : (
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedNotaSpesa.commesse?.nome_commessa || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Categoria</p>
                    {isEditing ? (
                      <select
                        value={editedData.categoria || ''}
                        onChange={(e) => setEditedData({ ...editedData, categoria: e.target.value })}
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          border: '2px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          width: '100%',
                          backgroundColor: 'white'
                        }}
                      >
                        {categorie.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.nome}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {selectedNotaSpesa.categorie_note_spesa && (
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: selectedNotaSpesa.categorie_note_spesa.colore
                            }}
                          />
                        )}
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedNotaSpesa.categorie_note_spesa?.nome || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Importo */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '11px', color: '#059669', margin: '0 0 4px 0', fontWeight: '600' }}>IMPORTO</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.importo || ''}
                      onChange={(e) => setEditedData({ ...editedData, importo: parseFloat(e.target.value) || 0 })}
                      style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#059669',
                        margin: 0,
                        textAlign: 'center',
                        border: '2px solid #059669',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        width: '100%',
                        backgroundColor: 'white'
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', margin: 0 }}>{formatCurrency(selectedNotaSpesa.importo)}</p>
                  )}
                </div>

                {/* Descrizione */}
                {(selectedNotaSpesa.descrizione || isEditing) && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Descrizione</p>
                    {isEditing ? (
                      <textarea
                        value={editedData.descrizione || ''}
                        onChange={(e) => setEditedData({ ...editedData, descrizione: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: 'white',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#374151',
                          lineHeight: '1.5',
                          minHeight: '80px',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                        placeholder="Aggiungi una descrizione..."
                      />
                    ) : (
                      <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.5' }}>{selectedNotaSpesa.descrizione}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Allegati */}
                {selectedNotaSpesa.allegati && selectedNotaSpesa.allegati.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Allegati ({selectedNotaSpesa.allegati.length})</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedNotaSpesa.allegati.map((allegato: any, index: number) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                          <FileText style={{ width: '18px', height: '18px', color: '#059669', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: '500', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{allegato.nome_file}</p>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>{(allegato.file_size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data creazione */}
                {selectedNotaSpesa.created_at && (
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                    <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                      Creata il {new Date(selectedNotaSpesa.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
