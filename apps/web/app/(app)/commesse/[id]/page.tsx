'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapPin, Edit, Trash2, Plus, TrendingUp, TrendingDown, FileText, Users, FolderOpen, Info, Settings, Search, ArrowUpCircle, ArrowDownCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Commessa } from '@/types/commessa';
import type { RiepilogoEconomico, FatturaAttiva, FatturaPassiva } from '@/types/fattura';
import { FatturaAttivaForm } from '@/components/features/commesse/FatturaAttivaForm';
import { CostoForm } from '@/components/features/commesse/CostoForm';
import { DeleteCommessaModal } from '@/components/features/commesse/DeleteCommessaModal';
import { InfoMovimentoModal } from '@/components/features/commesse/InfoMovimentoModal';
import { EditMovimentoModal } from '@/components/features/commesse/EditMovimentoModal';
import { DeleteMovimentoModal } from '@/components/features/commesse/DeleteMovimentoModal';
import { BulkDeleteMovimentiModal } from '@/components/features/commesse/BulkDeleteMovimentiModal';
import { RapportiniSection } from '@/components/features/registro-presenze/RapportiniSection';
import { MovimentiTab } from '@/components/features/commesse/MovimentiTab';
import { getSignedUrl } from '@/lib/utils/storage';

export default function CommessaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.id as string;

  const [loading, setLoading] = useState(true);
  const [commessa, setCommessa] = useState<Commessa | null>(null);
  const [riepilogo, setRiepilogo] = useState<RiepilogoEconomico | null>(null);
  const [fatture, setFatture] = useState<FatturaAttiva[]>([]);
  const [fatturePassive, setFatturePassive] = useState<FatturaPassiva[]>([]);
  // const [scontrini, setScontrini] = useState([])  // Tabella eliminata
  const [showFatturaForm, setShowFatturaForm] = useState(false);
  const [showCostoForm, setShowCostoForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDescrizioneModal, setShowDescrizioneModal] = useState(false);

  // Movimenti states
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'tutti' | 'ricavo' | 'costo'>('tutti');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('tutte');
  const [statoPagamentoFiltro, setStatoPagamentoFiltro] = useState<string>('tutti');
  const [periodoFiltro, setPeriodoFiltro] = useState<string>('tutti');
  const [rangeImportoFiltro, setRangeImportoFiltro] = useState<string>('tutti');
  const [ordinamento, setOrdinamento] = useState<'data_desc' | 'data_asc' | 'importo_desc' | 'importo_asc' | 'cliente_asc' | 'cliente_desc' | 'stato_asc' | 'stato_desc'>('data_desc');
  const [selectedMovimento, setSelectedMovimento] = useState<Movimento | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteMovimentoModal, setShowDeleteMovimentoModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedMovimenti, setSelectedMovimenti] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCommessaData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadCommessaData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      if (!slug) {
        setLoading(false);
        return;
      }

      // Load commessa by slug
      const { data: commessaData, error: commessaError } = await supabase
        .from('commesse')
        .select('*')
        .eq('slug', slug)
        .single();

      if (commessaError) throw commessaError;
      setCommessa(commessaData);

      // Load riepilogo economico
      const { data: riepilogoData } = await supabase
        .from('riepilogo_economico_commessa')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .single();

      setRiepilogo(riepilogoData || {
        commessa_id: commessaData.id,
        ricavi_imponibile: 0,
        ricavi_iva: 0,
        ricavi_totali: 0,
        costi_imponibile: 0,
        costi_iva: 0,
        costi_totali: 0,
        margine_lordo: 0,
        saldo_iva: 0,
        totale_movimenti: 0,
        numero_ricavi: 0,
        numero_costi: 0,
      });

      // Load fatture attive (ricavi)
      const { data: fattureData, error: fattureError } = await supabase
        .from('fatture_attive')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .order('data_fattura', { ascending: false });

      if (fattureError) throw fattureError;
      setFatture(fattureData || []);

      // Load fatture passive (costi - fatture)
      const { data: fatturePassiveData } = await supabase
        .from('fatture_passive')
        .select('*')
        .eq('commessa_id', commessaData.id)
        .order('data_fattura', { ascending: false });

      setFatturePassive(fatturePassiveData || []);

      // Load scontrini (costi - scontrini) - TABELLA ELIMINATA
      // const { data: scontriniData } = await supabase
      //   .from('scontrini')
      //   .select('*')
      //   .eq('commessa_id', commessaData.id)
      //   .order('data_emissione', { ascending: false });
      // setScontrini(scontriniData || []);

    } catch {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowFatturaForm(false);
    setShowCostoForm(false);
    loadCommessaData();
  };

  const handleDeleteCommessa = async () => {
    try {
      const supabase = createClient();

      if (!commessa) return;

      const { error } = await supabase
        .from('commesse')
        .delete()
        .eq('id', commessa.id);

      if (error) throw error;

      toast.success('Commessa eliminata con successo');
      router.push('/commesse');
    } catch {
      toast.error('Errore durante l\'eliminazione della commessa');
    }
  };

  // Helper functions
  const buildAddress = () => {
    if (!commessa) return '';
    const parts = [];
    if (commessa.via) {
      parts.push(commessa.via);
      if (commessa.numero_civico) {
        parts[0] = `${parts[0]} ${commessa.numero_civico}`;
      }
    }
    if (commessa.cap && commessa.citta) {
      parts.push(`${commessa.cap} ${commessa.citta}`);
    } else if (commessa.citta) {
      parts.push(commessa.citta);
    }
    if (commessa.provincia) parts.push(commessa.provincia);
    return parts.join(', ');
  };

  const getStaticMapUrl = () => {
    const address = buildAddress();
    if (!address) return null;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    const center = encodeURIComponent(address);
    const zoom = 15;
    const size = '300x200';
    const scale = 2; // Max allowed by Google Maps API is 2
    const maptype = 'roadmap';
    const markers = `color:red%7C${center}`;

    // Style to hide POI (points of interest) and labels
    const style = 'style=feature:poi|visibility:off&style=feature:transit|visibility:off';

    return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&scale=${scale}&maptype=${maptype}&${style}&markers=${markers}&key=${apiKey}`;
  };

  const openGoogleMapsLocation = () => {
    const address = buildAddress();
    if (!address) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = () => {
    if (!commessa?.data_inizio) return { text: 'Da Iniziare', color: 'bg-yellow-100 text-yellow-700' };

    const today = new Date();
    const startDate = new Date(commessa.data_inizio);
    const endDate = commessa.data_fine_prevista ? new Date(commessa.data_fine_prevista) : null;

    if (today < startDate) return { text: 'Da Iniziare', color: 'bg-yellow-100 text-yellow-700' };
    if (endDate && today > endDate) return { text: 'Completata', color: 'bg-red-100 text-red-700' };
    return { text: 'In Corso', color: 'bg-green-100 text-green-700' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Movimenti logic
  type Movimento = {
    id: string;
    tipo: 'ricavo' | 'costo';
    categoria: 'fattura_attiva' | 'fattura_passiva' | 'scontrino';
    numero?: string;
    cliente_fornitore: string;
    tipologia?: string;
    data_emissione: string;
    data_pagamento?: string;
    importo_imponibile?: number;
    importo_iva?: number;
    aliquota_iva?: number;
    percentuale_iva?: number;
    importo_totale: number;
    stato_pagamento?: string;
    modalita_pagamento?: string;
    allegato_url: string | null;
    created_at?: string;
    updated_at?: string;
  };

  const movimenti: Movimento[] = [
    ...(fatture || []).map((f: FatturaAttiva) => ({
      id: f.id,
      tipo: 'ricavo' as const,
      categoria: 'fattura_attiva' as const,
      numero: f.numero_fattura,
      cliente_fornitore: f.cliente,
      data_emissione: f.data_fattura,
      data_pagamento: f.data_pagamento || undefined,
      importo_imponibile: f.importo_imponibile,
      importo_iva: f.importo_iva,
      aliquota_iva: f.aliquota_iva,
      percentuale_iva: f.aliquota_iva,
      importo_totale: f.importo_totale,
      stato_pagamento: f.stato_pagamento,
      modalita_pagamento: f.modalita_pagamento || undefined,
      allegato_url: f.allegato_url,
      created_at: f.created_at,
      updated_at: f.updated_at,
    })),
    ...(fatturePassive || []).map((f: FatturaPassiva) => ({
      id: f.id,
      tipo: 'costo' as const,
      categoria: 'fattura_passiva' as const,
      numero: f.numero_fattura,
      cliente_fornitore: f.fornitore,
      data_emissione: f.data_fattura,
      data_pagamento: f.data_pagamento || undefined,
      importo_imponibile: f.importo_imponibile,
      importo_iva: f.importo_iva,
      aliquota_iva: f.aliquota_iva,
      percentuale_iva: f.aliquota_iva,
      importo_totale: f.importo_totale,
      stato_pagamento: f.stato_pagamento,
      modalita_pagamento: f.modalita_pagamento || undefined,
      allegato_url: f.allegato_url,
      created_at: f.created_at,
      updated_at: f.updated_at,
    })),
    // Scontrini rimossi (tabella eliminata)
    // ...(scontrini || []).map((s) => ({
    //   id: s.id,
    //   tipo: 'costo' as const,
    //   categoria: 'scontrino' as const,
    //   cliente_fornitore: s.fornitore,
    //   tipologia: s.tipologia,
    //   data_emissione: s.data_emissione,
    //   importo_totale: s.importo_totale,
    //   stato_pagamento: 'Pagato',
    //   allegato_url: s.allegato_url,
    // })),
  ];

  const getDateRange = (periodo: string) => {
    const today = new Date();
    const start = new Date(today);

    switch (periodo) {
      case 'oggi':
        start.setHours(0, 0, 0, 0);
        return { start, end: today };
      case 'settimana':
        start.setDate(today.getDate() - 7);
        return { start, end: today };
      case 'mese':
        start.setMonth(today.getMonth() - 1);
        return { start, end: today };
      case 'trimestre':
        start.setMonth(today.getMonth() - 3);
        return { start, end: today };
      case 'anno':
        start.setFullYear(today.getFullYear() - 1);
        return { start, end: today };
      default:
        return null;
    }
  };

  const movimentiFiltrati = movimenti.filter(movimento => {
    if (tipoFiltro !== 'tutti' && movimento.tipo !== tipoFiltro) return false;
    if (categoriaFiltro !== 'tutte' && movimento.categoria !== categoriaFiltro) return false;
    if (statoPagamentoFiltro !== 'tutti' && movimento.stato_pagamento !== statoPagamentoFiltro) return false;

    if (periodoFiltro !== 'tutti') {
      const dateRange = getDateRange(periodoFiltro);
      if (dateRange) {
        const dataEmissione = new Date(movimento.data_emissione);
        if (dataEmissione < dateRange.start || dataEmissione > dateRange.end) return false;
      }
    }

    if (rangeImportoFiltro !== 'tutti') {
      const importo = movimento.importo_totale;
      switch (rangeImportoFiltro) {
        case '0-1000':
          if (importo < 0 || importo > 1000) return false;
          break;
        case '1000-5000':
          if (importo < 1000 || importo > 5000) return false;
          break;
        case '5000-10000':
          if (importo < 5000 || importo > 10000) return false;
          break;
        case '10000+':
          if (importo < 10000) return false;
          break;
      }
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        movimento.cliente_fornitore.toLowerCase().includes(searchLower) ||
        movimento.tipologia?.toLowerCase().includes(searchLower) ||
        movimento.numero?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  }).sort((a, b) => {
    switch (ordinamento) {
      case 'data_desc':
        return new Date(b.data_emissione).getTime() - new Date(a.data_emissione).getTime();
      case 'data_asc':
        return new Date(a.data_emissione).getTime() - new Date(b.data_emissione).getTime();
      case 'importo_desc':
        return b.importo_totale - a.importo_totale;
      case 'importo_asc':
        return a.importo_totale - b.importo_totale;
      case 'cliente_asc':
        return a.cliente_fornitore.localeCompare(b.cliente_fornitore);
      case 'cliente_desc':
        return b.cliente_fornitore.localeCompare(a.cliente_fornitore);
      case 'stato_asc':
        return (a.stato_pagamento || '').localeCompare(b.stato_pagamento || '');
      case 'stato_desc':
        return (b.stato_pagamento || '').localeCompare(a.stato_pagamento || '');
      default:
        return 0;
    }
  });

  const totalItems = movimentiFiltrati.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const movimentiPaginati = movimentiFiltrati.slice(startIndex, endIndex);

  const handleAllegatoClick = async (path: string | null, e: React.MouseEvent) => {
    e.preventDefault();
    if (!path) return;

    try {
      const signedUrl = await getSignedUrl(path);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast.error('Impossibile aprire l\'allegato');
      }
    } catch {
      toast.error('Errore nell\'apertura dell\'allegato');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!commessa) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Commessa non trovata</p>
        <Button onClick={() => router.push('/commesse')}>Torna alle commesse</Button>
      </div>
    );
  }

  const hasAddress = commessa.via || commessa.citta || commessa.provincia || commessa.cap;
  const mapUrl = hasAddress ? getStaticMapUrl() : null;
  const statusBadge = getStatusBadge();

  // Calcola totali movimenti
  const totalMovimenti = fatture.length + fatturePassive.length; // + scontrini.length (tabella eliminata)

  return (
    <div className="space-y-6">
      {/* Tabs Navigazione */}
      <Tabs defaultValue="panoramica" className="space-y-6">
        <TabsList className="w-full justify-between h-auto bg-transparent border-b border-border rounded-none p-0 gap-0">
          <TabsTrigger
            value="panoramica"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Panoramica</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger
            value="movimenti"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Movimenti</span>
            <span className="sm:hidden">Mov.</span>
            {totalMovimenti > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-xs font-medium">
                {totalMovimenti}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="rapportini"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Rapportini</span>
            <span className="sm:hidden">Rap.</span>
          </TabsTrigger>
          <TabsTrigger
            value="documenti"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Documenti</span>
            <span className="sm:hidden">Doc.</span>
          </TabsTrigger>
          <TabsTrigger
            value="impostazioni"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Impostazioni</span>
            <span className="sm:hidden">Imp.</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Panoramica - TUTTO QUI DENTRO */}
        <TabsContent value="panoramica" className="space-y-6">
          {/* Header Commessa con Mappa */}
          <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
            <div className="flex">
              {/* Mappa a sinistra */}
              {mapUrl ? (
                <div
                  className="relative w-[300px] flex-shrink-0 bg-muted cursor-pointer transition-all group/map"
                  onClick={openGoogleMapsLocation}
                  title="Clicca per aprire la posizione in Google Maps"
                >
                  <img
                    src={mapUrl}
                    alt={`Mappa di ${buildAddress()}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover/map:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover/map:opacity-100 transition-opacity bg-white/90 rounded-lg px-3 py-2 text-xs font-medium text-gray-900">
                      Apri in Maps
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-[300px] flex-shrink-0 bg-muted flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}

              {/* Info a destra */}
              <div className="flex-1 p-6 space-y-4">
                {/* Titolo, Badge e Azioni */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {commessa.codice_commessa && (
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        {commessa.codice_commessa}
                      </div>
                    )}
                    <h1 className="text-2xl font-bold leading-tight">
                      {commessa.nome_commessa}
                    </h1>
                  </div>

                  {/* Status Badge + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.color}`}>
                      {statusBadge.text}
                    </div>

                    <button
                      onClick={() => router.push(`/commesse/${slug}/modifica`)}
                      className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all"
                      title="Modifica commessa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="h-9 w-9 flex items-center justify-center bg-surface border border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all text-red-600"
                      title="Elimina commessa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Indirizzo */}
                {hasAddress && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{buildAddress()}</span>
                  </div>
                )}

                {/* Info griglia */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm pt-3 border-t border-border">
                  <div>
                    <span className="text-muted-foreground">Cliente: </span>
                    <span className="font-medium">{commessa.cliente_commessa}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipologia: </span>
                    <span className="font-medium">{commessa.tipologia_commessa}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo Cliente: </span>
                    <span className="font-medium">{commessa.tipologia_cliente}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Periodo: </span>
                    <span className="font-medium">
                      {formatDate(commessa.data_inizio)} → {formatDate(commessa.data_fine_prevista)}
                    </span>
                  </div>
                  {commessa.importo_commessa && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Importo Contratto: </span>
                      <span className="font-bold text-base">{formatCurrency(commessa.importo_commessa)}</span>
                    </div>
                  )}
                  {commessa.descrizione && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Descrizione: </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDescrizioneModal(true);
                        }}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        Visualizza descrizione completa
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Economico - 4 Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card Ricavi */}
            <div className="rounded-xl border-2 border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-semibold text-base">Ricavi</span>
                </div>
                <button
                  onClick={() => setShowFatturaForm(true)}
                  className="h-8 w-8 flex items-center justify-center bg-green-100 border border-green-300 rounded-lg hover:border-green-400 hover:bg-green-200 transition-all text-green-700"
                  title="Aggiungi ricavo"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Imponibile:</span>
                  <span className="text-sm font-semibold">{formatCurrency(riepilogo?.ricavi_imponibile || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IVA:</span>
                  <span className="text-sm font-semibold">{formatCurrency(riepilogo?.ricavi_iva || 0)}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Totale:</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(riepilogo?.ricavi_totali || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Costi */}
            <div className="rounded-xl border-2 border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-red-100">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="font-semibold text-base">Costi</span>
                </div>
                <button
                  onClick={() => setShowCostoForm(true)}
                  className="h-8 w-8 flex items-center justify-center bg-red-100 border border-red-300 rounded-lg hover:border-red-400 hover:bg-red-200 transition-all text-red-700"
                  title="Aggiungi costo"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Imponibile:</span>
                  <span className="text-sm font-semibold">{formatCurrency(riepilogo?.costi_imponibile || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">IVA:</span>
                  <span className="text-sm font-semibold">{formatCurrency(riepilogo?.costi_iva || 0)}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Totale:</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(riepilogo?.costi_totali || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Margine Lordo */}
            <div className="rounded-xl border-2 border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${(riepilogo?.margine_lordo || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <FileText className={`h-5 w-5 ${(riepilogo?.margine_lordo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <span className="font-semibold text-base">Margine Lordo</span>
              </div>
              <div className="space-y-2">
                <div className={`text-3xl font-bold ${(riepilogo?.margine_lordo || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(riepilogo?.margine_lordo || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Imponibile ricavi - Imponibile costi
                </div>
              </div>
            </div>

            {/* Card Saldo IVA */}
            <div className={`rounded-xl border-2 bg-card p-6 ${(riepilogo?.saldo_iva || 0) > 0 ? 'border-red-300 bg-red-50/30' : 'border-green-300 bg-green-50/30'}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${(riepilogo?.saldo_iva || 0) > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <FileText className={`h-5 w-5 ${(riepilogo?.saldo_iva || 0) > 0 ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <span className="font-semibold text-base">Saldo IVA</span>
              </div>
              <div className="space-y-2">
                <div className={`text-3xl font-bold ${(riepilogo?.saldo_iva || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(riepilogo?.saldo_iva || 0)}
                </div>
                <div className={`text-sm font-medium ${(riepilogo?.saldo_iva || 0) > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {(riepilogo?.saldo_iva || 0) > 0 ? 'IVA a credito' : 'IVA a debito'}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  IVA ricavi - IVA costi
                </div>
              </div>
            </div>
          </div>
        </TabsContent>


        {/* TAB: Movimenti */}
        <TabsContent value="movimenti" className="space-y-4">
          <MovimentiTab
            commessaId={commessa?.id || ''}
            fattureAttive={fatture}
            fatturePassive={fatturePassive}
            onReload={loadCommessaData}
          />
        </TabsContent>

        {/* TAB: Rapportini */}
        <TabsContent value="rapportini" className="space-y-4">
          <RapportiniSection commessaId={commessa?.id} hideMonthSelector={true} />
        </TabsContent>

        {/* TAB: Documenti */}
        <TabsContent value="documenti" className="space-y-4">
          <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Funzionalità documenti in arrivo</p>
          </div>
        </TabsContent>

        {/* TAB: Impostazioni */}
        <TabsContent value="impostazioni" className="space-y-4">
          <div className="rounded-xl border-2 border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-6">Informazioni Aggiuntive</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipologia Cliente</p>
                <p className="font-medium">{commessa.tipologia_cliente}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipologia Commessa</p>
                <p className="font-medium">{commessa.tipologia_commessa}</p>
              </div>
              {commessa.tipologia_cliente === 'Pubblico' && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">CIG</p>
                    <p className="font-medium font-mono">{commessa.cig || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">CUP</p>
                    <p className="font-medium font-mono">{commessa.cup || '—'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showFatturaForm && commessa && (
        <FatturaAttivaForm
          commessaId={commessa.id}
          commessaNome={commessa.nome_commessa}
          clientePrecompilato={commessa.cliente_commessa}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowFatturaForm(false)}
        />
      )}

      {showCostoForm && commessa && (
        <CostoForm
          commessaId={commessa.id}
          commessaNome={commessa.nome_commessa}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowCostoForm(false)}
        />
      )}

      {showDeleteModal && commessa && (
        <DeleteCommessaModal
          commessaNome={commessa.nome_commessa}
          onConfirm={handleDeleteCommessa}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Modal Descrizione */}
      {showDescrizioneModal && commessa?.descrizione && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border-2 border-border max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-semibold">Descrizione Commessa</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {commessa.descrizione}
              </p>
            </div>
            <div className="p-4 border-t border-border flex justify-end">
              <Button
                onClick={() => setShowDescrizioneModal(false)}
                variant="outline"
              >
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Movimenti Modals */}
      {showInfoModal && selectedMovimento && !isTransitioning && (
        <InfoMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedMovimento(null);
          }}
          onEdit={() => {
            setIsTransitioning(true);
            setShowInfoModal(false);
            setTimeout(() => {
              setShowEditModal(true);
              setIsTransitioning(false);
            }, 200);
          }}
          onDelete={() => {
            setIsTransitioning(true);
            setShowInfoModal(false);
            setTimeout(() => {
              setShowDeleteMovimentoModal(true);
              setIsTransitioning(false);
            }, 200);
          }}
        />
      )}

      {showEditModal && selectedMovimento && (
        <EditMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowEditModal(false);
            setSelectedMovimento(null);
          }}
          onSuccess={() => {
            loadCommessaData();
          }}
        />
      )}

      {showDeleteMovimentoModal && selectedMovimento && (
        <DeleteMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowDeleteMovimentoModal(false);
            setSelectedMovimento(null);
          }}
          onSuccess={() => {
            loadCommessaData();
          }}
        />
      )}

      {showBulkDeleteModal && (
        <BulkDeleteMovimentiModal
          movimentiIds={Array.from(selectedMovimenti)}
          movimentiData={movimenti.filter(m => selectedMovimenti.has(m.id)).map(m => ({
            id: m.id,
            categoria: m.categoria,
            numero: m.numero,
            cliente_fornitore: m.cliente_fornitore,
          }))}
          onClose={() => setShowBulkDeleteModal(false)}
          onSuccess={() => {
            setSelectedMovimenti(new Set());
            loadCommessaData();
          }}
        />
      )}
    </div>
  );
}
