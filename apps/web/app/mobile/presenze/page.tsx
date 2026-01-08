'use client';

import { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMobileData } from '@/contexts/MobileDataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, AlertCircle, XCircle, Plus, ChevronLeft, ChevronRight, X, Calendar, Building2, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
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
  tempo_pausa?: number;
  orario_inizio?: string;
  orario_fine?: string;
  note: string | null;
  stato: 'approvato' | 'da_approvare' | 'rifiutato';
  created_at?: string;
  approvato_da?: string;
  approvato_il?: string;
  rifiutato_da?: string;
  rifiutato_il?: string;
  motivo_rifiuto?: string;
  modificato_da?: string;
  modificato_il?: string;
  commessa_id?: string;
  commesse: {
    id?: string;
    nome_commessa: string;
    cliente_commessa: string;
    codice_commessa?: string;
  } | null;
}

type Commessa = {
  id: string;
  nome_commessa: string;
  codice_commessa?: string;
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
};

const RapportinoCard = memo(({ rapportino, onClick }: { rapportino: Rapportino; onClick: () => void }) => (
  <div
    className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
  >
    <div className="flex">
      {/* Barra laterale colorata */}
      <div
        className="w-1.5 flex-shrink-0"
        style={{ backgroundColor: getStatoColor(rapportino.stato) }}
      />

      {/* Contenuto */}
      <div className="flex-1 p-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Nome commessa */}
          <p className="font-bold text-base text-gray-900 mb-1">
            {rapportino.commesse?.nome_commessa || 'Commessa non disponibile'}
          </p>

          {/* Data */}
          <p className="text-xs text-gray-500">
            {formatDate(rapportino.data_rapportino)}
          </p>
        </div>

        {/* Ore lavorate */}
        <div className="flex-shrink-0 text-right">
          <span className="text-lg font-bold text-emerald-600">
            {rapportino.ore_lavorate}h
          </span>
        </div>
      </div>
    </div>
  </div>
));

RapportinoCard.displayName = 'RapportinoCard';

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

type StatoRichiesta = 'approvato' | 'da_approvare' | 'rifiutato';

export default function MobilePresenzePage() {
  const { rapportini: allRapportini } = useMobileData();
  const [statoRichiesta, setStatoRichiesta] = useState<StatoRichiesta | null>('approvato');

  // Modal dettaglio
  const [selectedRapportino, setSelectedRapportino] = useState<Rapportino | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<Rapportino>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Modalità calcolo e commesse
  const [modalitaCalcolo, setModalitaCalcolo] = useState<'ore_totali' | 'orari'>('ore_totali');
  const [commesseDisponibili, setCommesseDisponibili] = useState<Commessa[]>([]);
  const [customPausa, setCustomPausa] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carica modalità calcolo e commesse quando entra in edit mode
  useEffect(() => {
    if (isEditing) {
      loadEditData();
    }
  }, [isEditing]);

  const loadEditData = useCallback(async () => {
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

      // Carica modalità calcolo
      const { data: tenant } = await supabase
        .from('tenants')
        .select('modalita_calcolo_rapportini')
        .eq('id', userTenants.tenant_id)
        .single();

      if (tenant) {
        setModalitaCalcolo(tenant.modalita_calcolo_rapportini || 'ore_totali');
      }

      // Carica commesse del dipendente
      const { data: dipendenteData } = await supabase
        .from('dipendenti')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (dipendenteData) {
        const { data: teamData } = await supabase
          .from('commesse_team')
          .select(`
            commessa_id,
            commesse!commesse_team_commessa_id_fkey (
              id,
              nome_commessa,
              codice_commessa
            )
          `)
          .eq('tenant_id', userTenants.tenant_id)
          .eq('dipendente_id', dipendenteData.id);

        if (teamData) {
          const commesseList = teamData
            .filter((ct: any) => ct.commesse)
            .map((ct: any) => ({
              id: ct.commesse.id,
              nome_commessa: ct.commesse.nome_commessa,
              codice_commessa: ct.commesse.codice_commessa,
            }));
          setCommesseDisponibili(commesseList);
        }
      }
    } catch (error) {
      console.error('Error loading edit data:', error);
    }
  }, []);

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

  const filteredRapportini = useMemo(() => {
    let filtered = rapportini;

    // Filtro per stato
    if (statoRichiesta) {
      filtered = filtered.filter(r => r.stato === statoRichiesta);
    }

    return filtered;
  }, [rapportini, statoRichiesta]);

  const statsStato = useMemo(() => ({
    approvati: rapportini.filter(r => r.stato === 'approvato').length,
    daApprovare: rapportini.filter(r => r.stato === 'da_approvare').length,
    rifiutati: rapportini.filter(r => r.stato === 'rifiutato').length,
  }), [rapportini]);

  const totaleOreMese = useMemo(() =>
    rapportini.reduce((sum, r) => sum + (Number(r.ore_lavorate) || 0), 0),
    [rapportini]
  );

  const monthName = useMemo(() => `${MESI[currentMonth]} ${currentYear}`, [currentMonth, currentYear]);

  // Calcolo ore effettive in edit mode
  const calculateEffectiveHours = useMemo(() => {
    if (!isEditing) return '0.00';

    let oreNum = 0;

    if (modalitaCalcolo === 'ore_totali') {
      oreNum = parseFloat(String(editedData.ore_lavorate)) || 0;
    } else {
      if (editedData.orario_inizio && editedData.orario_fine) {
        const [inizioH, inizioM] = editedData.orario_inizio.split(':').map(Number);
        const [fineH, fineM] = editedData.orario_fine.split(':').map(Number);

        if (!isNaN(inizioH) && !isNaN(inizioM) && !isNaN(fineH) && !isNaN(fineM)) {
          const inizioMinutes = inizioH * 60 + inizioM;
          let fineMinutes = fineH * 60 + fineM;

          if (fineMinutes < inizioMinutes) {
            fineMinutes += 24 * 60;
          }

          const minutiLavorati = fineMinutes - inizioMinutes;
          oreNum = minutiLavorati / 60;
        }
      }
    }

    let pausaMinutes = 0;
    const tempoPausa = String(editedData.tempo_pausa || '60');
    if (tempoPausa === 'custom') {
      pausaMinutes = parseInt(customPausa) || 0;
    } else {
      pausaMinutes = parseInt(tempoPausa) || 0;
    }

    const effectiveHours = oreNum - (pausaMinutes / 60);
    return effectiveHours > 0 ? effectiveHours.toFixed(2) : '0.00';
  }, [isEditing, modalitaCalcolo, editedData.ore_lavorate, editedData.orario_inizio, editedData.orario_fine, editedData.tempo_pausa, customPausa]);

  // Gestione modifica presenza
  const handleSaveEdit = useCallback(async () => {
    if (!selectedRapportino) return;

    // Validazioni
    if (!editedData.commessa_id) {
      toast.error('Seleziona una commessa');
      return;
    }

    if (!editedData.data_rapportino) {
      toast.error('Inserisci la data');
      return;
    }

    let oreNum = 0;

    if (modalitaCalcolo === 'ore_totali') {
      if (!editedData.ore_lavorate) {
        toast.error('Inserisci le ore lavorate');
        return;
      }
      oreNum = parseFloat(String(editedData.ore_lavorate));
      if (isNaN(oreNum) || oreNum <= 0 || oreNum > 24) {
        toast.error('Le ore lavorate devono essere tra 0 e 24');
        return;
      }
    } else {
      if (!editedData.orario_inizio || !editedData.orario_fine) {
        toast.error('Inserisci orario di inizio e fine');
        return;
      }

      const [inizioH, inizioM] = editedData.orario_inizio.split(':').map(Number);
      const [fineH, fineM] = editedData.orario_fine.split(':').map(Number);

      const inizioMinutes = inizioH * 60 + inizioM;
      let fineMinutes = fineH * 60 + fineM;

      if (fineMinutes < inizioMinutes) {
        fineMinutes += 24 * 60;
      }

      const minutiLavorati = fineMinutes - inizioMinutes;
      oreNum = minutiLavorati / 60;

      if (oreNum <= 0 || oreNum > 24) {
        toast.error('Orari non validi');
        return;
      }
    }

    try {
      setIsSaving(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Utente non autenticato');
        return;
      }

      let tempoPausaMinutes = 60;
      const tempoPausa = String(editedData.tempo_pausa || '60');
      if (tempoPausa === 'custom') {
        tempoPausaMinutes = parseInt(customPausa) || 0;
      } else {
        tempoPausaMinutes = parseInt(tempoPausa) || 60;
      }

      const oreLavorateEffettive = oreNum - (tempoPausaMinutes / 60);

      if (oreLavorateEffettive <= 0) {
        toast.error('Le ore lavorate (dopo la pausa) devono essere maggiori di 0');
        return;
      }

      const updateData: any = {
        commessa_id: editedData.commessa_id,
        data_rapportino: editedData.data_rapportino,
        ore_lavorate: oreLavorateEffettive,
        tempo_pausa: tempoPausaMinutes,
        note: editedData.note || null,
        modificato_da: user.id,
        modificato_il: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (modalitaCalcolo === 'orari') {
        updateData.orario_inizio = editedData.orario_inizio;
        updateData.orario_fine = editedData.orario_fine;
      }

      const { error } = await supabase
        .from('rapportini')
        .update(updateData)
        .eq('id', selectedRapportino.id);

      if (error) throw error;

      toast.success('Presenza aggiornata');
      setIsEditing(false);
      setIsModalOpen(false);
      window.location.reload(); // Ricarica i dati
    } catch (error: any) {
      console.error('Error updating rapportino:', error);
      toast.error('Errore nell\'aggiornamento');
    } finally {
      setIsSaving(false);
    }
  }, [selectedRapportino, editedData, modalitaCalcolo, customPausa]);

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
            label="Approvati"
            active={statoRichiesta === 'approvato'}
            onClick={() => setStatoRichiesta(statoRichiesta === 'approvato' ? null : 'approvato')}
          />
          <StatoFilterCard
            label="Da approvare"
            active={statoRichiesta === 'da_approvare'}
            onClick={() => setStatoRichiesta(statoRichiesta === 'da_approvare' ? null : 'da_approvare')}
          />
          <StatoFilterCard
            label="Rifiutati"
            active={statoRichiesta === 'rifiutato'}
            onClick={() => setStatoRichiesta(statoRichiesta === 'rifiutato' ? null : 'rifiutato')}
          />
        </div>
      </div>

      {/* Lista richieste */}
      <div className="px-4 space-y-3 pb-4">
        {filteredRapportini.length === 0 ? (
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-gray-100">
                <Clock className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessuna presenza
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {statoRichiesta ? 'Non ci sono presenze con questo stato' : 'Non ci sono presenze per questo periodo'}
            </p>
            <Link href="/mobile/presenze/nuovo" prefetch={true}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Crea presenza
              </Button>
            </Link>
          </div>
        ) : (
          filteredRapportini.map((rapportino) => (
            <RapportinoCard
              key={rapportino.id}
              rapportino={rapportino}
              onClick={() => {
                setSelectedRapportino(rapportino);
                setEditedData({
                  ...rapportino,
                  commessa_id: rapportino.commesse?.id || rapportino.commessa_id,
                  tempo_pausa: String(rapportino.tempo_pausa || 60),
                });
                setCustomPausa('');
                setIsEditing(false);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>


      {/* Modal Dettaglio Presenza - Popup usando Portal */}
      {mounted && isModalOpen && selectedRapportino && createPortal(
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
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{isEditing ? 'Modifica Presenza' : 'Dettaglio Presenza'}</h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Pulsante Modifica - solo se stato è "da_approvare" */}
                    {selectedRapportino.stato === 'da_approvare' && !isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
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
                        <Pencil style={{ width: '18px', height: '18px' }} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (isEditing) {
                          setIsEditing(false);
                          setEditedData(selectedRapportino);
                        } else {
                          setIsModalOpen(false);
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
                      <X style={{ width: '20px', height: '20px' }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px', maxHeight: 'calc(85vh - 80px)', overflowY: 'auto' }}>
                {isEditing ? (
                  /* MODALITÀ EDIT - Form professionale */
                  <div className="space-y-5">
                    {/* Commessa */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-900">
                        Commessa <span className="text-red-600">*</span>
                      </Label>
                      <Select
                        value={editedData.commessa_id || ''}
                        onValueChange={(value) => setEditedData({ ...editedData, commessa_id: value })}
                      >
                        <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl bg-white">
                          <SelectValue placeholder="Seleziona commessa..." />
                        </SelectTrigger>
                        <SelectContent>
                          {commesseDisponibili.length === 0 ? (
                            <div className="px-2 py-6 text-center text-sm text-gray-500">
                              Caricamento...
                            </div>
                          ) : (
                            commesseDisponibili.map((commessa) => (
                              <SelectItem key={commessa.id} value={commessa.id}>
                                {commessa.codice_commessa ? `${commessa.codice_commessa} - ` : ''}
                                {commessa.nome_commessa}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Data */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-900">
                        Data <span className="text-red-600">*</span>
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                        <Input
                          type="date"
                          value={editedData.data_rapportino || ''}
                          onChange={(e) => setEditedData({ ...editedData, data_rapportino: e.target.value })}
                          className="h-12 border-2 border-gray-200 rounded-xl bg-white pl-10"
                        />
                      </div>
                    </div>

                    {/* Ore Lavorate o Orari */}
                    {modalitaCalcolo === 'ore_totali' ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-900">
                          Ore Lavorate <span className="text-red-600">*</span>
                        </Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            placeholder="8"
                            value={editedData.ore_lavorate || ''}
                            onChange={(e) => setEditedData({ ...editedData, ore_lavorate: parseFloat(e.target.value) })}
                            className="h-12 border-2 border-gray-200 rounded-xl bg-white pl-10 text-base"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-900">
                            Inizio <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            type="time"
                            value={editedData.orario_inizio || ''}
                            onChange={(e) => setEditedData({ ...editedData, orario_inizio: e.target.value })}
                            className="h-12 border-2 border-gray-200 rounded-xl bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-900">
                            Fine <span className="text-red-600">*</span>
                          </Label>
                          <Input
                            type="time"
                            value={editedData.orario_fine || ''}
                            onChange={(e) => setEditedData({ ...editedData, orario_fine: e.target.value })}
                            className="h-12 border-2 border-gray-200 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Pausa */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-900">Pausa</Label>
                      <Select
                        value={String(editedData.tempo_pausa || '60')}
                        onValueChange={(value) => setEditedData({ ...editedData, tempo_pausa: value as any })}
                      >
                        <SelectTrigger className="h-12 border-2 border-gray-200 rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">1 ora</SelectItem>
                          <SelectItem value="90">1 ora e 30</SelectItem>
                          <SelectItem value="0">Nessuna pausa</SelectItem>
                          <SelectItem value="custom">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                      {String(editedData.tempo_pausa) === 'custom' && (
                        <Input
                          type="number"
                          placeholder="Minuti"
                          value={customPausa}
                          onChange={(e) => setCustomPausa(e.target.value)}
                          className="h-12 border-2 border-gray-200 rounded-xl bg-white mt-2"
                        />
                      )}
                    </div>

                    {/* Ore Effettive */}
                    <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">Ore Effettive</span>
                        <span className="text-2xl font-bold text-emerald-600">{calculateEffectiveHours}h</span>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-900">
                        Note <span className="text-gray-400 font-normal">(opzionale)</span>
                      </Label>
                      <Textarea
                        placeholder="Eventuali note sul rapportino..."
                        value={editedData.note || ''}
                        onChange={(e) => setEditedData({ ...editedData, note: e.target.value })}
                        className="border-2 border-gray-200 rounded-xl bg-white resize-none min-h-[100px]"
                      />
                    </div>

                    {/* Pulsante Salva */}
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base rounded-xl shadow-lg shadow-emerald-600/20"
                    >
                      {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                    </Button>
                  </div>
                ) : (
                  /* MODALITÀ VISUALIZZAZIONE */
                  <>
                    {/* Stato */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      borderRadius: '10px',
                      backgroundColor: `${getStatoColor(selectedRapportino.stato)}15`,
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        padding: '6px',
                        borderRadius: '6px',
                        backgroundColor: getStatoColor(selectedRapportino.stato),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {getStatoIcon(selectedRapportino.stato)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Stato</p>
                        <p style={{ fontSize: '15px', fontWeight: 'bold', color: getStatoColor(selectedRapportino.stato), margin: 0 }}>
                          {selectedRapportino.stato === 'approvato' ? 'Approvata' : selectedRapportino.stato === 'da_approvare' ? 'Da Approvare' : 'Rifiutata'}
                        </p>
                      </div>
                    </div>

                    {/* Riga 1: Data e Commessa */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Data</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{formatDate(selectedRapportino.data_rapportino)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 2px 0' }}>Commessa</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedRapportino.commesse?.nome_commessa || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Riga 2: Orario Inizio, Orario Fine, Pausa */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Inizio</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedRapportino.orario_inizio || '-'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Fine</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{selectedRapportino.orario_fine || '-'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Pausa</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                          {selectedRapportino.tempo_pausa === 0 ? 'Nessuna' : `${selectedRapportino.tempo_pausa} min`}
                        </p>
                      </div>
                    </div>

                    {/* Ore Effettive */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: '#ecfdf5',
                      borderRadius: '10px',
                      marginBottom: '12px',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontSize: '11px', color: '#059669', margin: '0 0 4px 0', fontWeight: '600' }}>ORE EFFETTIVE</p>
                      <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', margin: 0 }}>{selectedRapportino.ore_lavorate}h</p>
                    </div>

                    {/* Note */}
                    {selectedRapportino.note && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Note</p>
                        <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                          <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: '1.5' }}>{selectedRapportino.note}</p>
                        </div>
                      </div>
                    )}

                    {/* Info Approvazione/Rifiuto */}
                    {selectedRapportino.approvato_il && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Approvata il</p>
                        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                          <p style={{ fontSize: '13px', color: '#059669', margin: 0, fontWeight: '600' }}>
                            {new Date(selectedRapportino.approvato_il).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedRapportino.rifiutato_il && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Rifiutata il</p>
                          <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, fontWeight: '600' }}>
                              {new Date(selectedRapportino.rifiutato_il).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {selectedRapportino.motivo_rifiuto && (
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 6px 0' }}>Motivo Rifiuto</p>
                            <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0, lineHeight: '1.5' }}>{selectedRapportino.motivo_rifiuto}</p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Data creazione */}
                    {selectedRapportino.created_at && (
                      <div style={{ paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                          Creata il {new Date(selectedRapportino.created_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* Data ultima modifica */}
                    {selectedRapportino.modificato_il && (
                      <div style={{ paddingTop: '8px', marginTop: '8px', borderTop: '1px solid #f3f4f6' }}>
                        <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
                          Ultima modifica il {new Date(selectedRapportino.modificato_il).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </>
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
