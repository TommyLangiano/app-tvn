'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MapPin, Edit, Edit2, Trash2, Plus, TrendingUp, TrendingDown, FileText, Users, FolderOpen, Info, Settings, Search, ArrowUpCircle, ArrowDownCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, MoreVertical, Receipt, Loader2, FileStack, BarChart3, LayoutDashboard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsFilter } from '@/components/ui/tabs-filter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CityCombobox } from '@/components/ui/city-combobox';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Commessa } from '@/types/commessa';
import type { RiepilogoEconomico, FatturaAttiva, FatturaPassiva } from '@/types/fattura';
import { FatturaAttivaForm } from '@/components/features/commesse/FatturaAttivaForm';
import { CostoForm } from '@/components/features/commesse/CostoForm';
import { DeleteCommessaModal } from '@/components/features/commesse/DeleteCommessaModal';
import { EditCommessaModal } from '@/components/features/commesse/EditCommessaModal';
import { InfoMovimentoModal } from '@/components/features/commesse/InfoMovimentoModal';
import { EditMovimentoModal } from '@/components/features/commesse/EditMovimentoModal';
import { DeleteMovimentoModal } from '@/components/features/commesse/DeleteMovimentoModal';
import { BulkDeleteMovimentiModal } from '@/components/features/commesse/BulkDeleteMovimentiModal';
import { RapportiniTab } from '@/components/features/commesse/RapportiniTab';
import { MovimentiTab } from '@/components/features/commesse/MovimentiTab';
import { NoteSpeseTab } from '@/components/features/commesse/NoteSpeseTab';
import { CommessaReportTab } from '@/components/features/commesse/CommessaReportTab';
import { getSignedUrl } from '@/lib/utils/storage';
import { formatCurrency } from '@/lib/utils/currency';

export default function CommessaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.id as string;

  type TabValue = 'panoramica' | 'movimenti' | 'note-spesa' | 'rapportini' | 'report' | 'documenti' | 'dettagli' | 'impostazioni';

  const [activeTab, setActiveTab] = useState<TabValue>('panoramica');
  const [loading, setLoading] = useState(true);
  const [commessa, setCommessa] = useState<Commessa | null>(null);
  const [riepilogo, setRiepilogo] = useState<RiepilogoEconomico | null>(null);
  const [fatture, setFatture] = useState<FatturaAttiva[]>([]);
  const [fatturePassive, setFatturePassive] = useState<FatturaPassiva[]>([]);
  const [noteSpese, setNoteSpese] = useState<any[]>([]);
  const [noteSpeseDaApprovare, setNoteSpeseDaApprovare] = useState<any[]>([]);
  const [noteSpeseRifiutate, setNoteSpeseRifiutate] = useState<any[]>([]);
  const [rapportini, setRapportini] = useState<any[]>([]);
  const [rapportiniDaApprovare, setRapportiniDaApprovare] = useState<any[]>([]);
  const [rapportiniRifiutati, setRapportiniRifiutati] = useState<any[]>([]);
  // const [scontrini, setScontrini] = useState([])  // Tabella eliminata
  const [showFatturaForm, setShowFatturaForm] = useState(false);
  const [showCostoForm, setShowCostoForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditCommessaModal] = useState(false);
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
  const [showEditMovimentoModal, setShowEditMovimentoModal] = useState(false);
  const [showDeleteMovimentoModal, setShowDeleteMovimentoModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedMovimenti, setSelectedMovimenti] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Impostazioni tab - Edit inline states
  type SectionKey = 'informazioniGenerali' | 'cliente' | 'luogo' | 'pianificazione' | 'descrizione' | 'team';
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [sectionData, setSectionData] = useState<Record<SectionKey, Record<string, string | number | null>>>({
    informazioniGenerali: {
      codice_commessa: '',
      nome_commessa: '',
      tipologia_commessa: ''
    },
    cliente: {
      tipologia_cliente: '',
      cliente_commessa: '',
      cig: '',
      cup: ''
    },
    luogo: {
      via: '',
      numero_civico: '',
      citta: '',
      provincia: '',
      cap: ''
    },
    pianificazione: {
      data_inizio: '',
      data_fine_prevista: '',
      importo_commessa: '',
      budget_commessa: '',
      costo_materiali: ''
    },
    descrizione: {
      descrizione: ''
    },
    team: {}
  });
  const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});
  const [savingSection, setSavingSection] = useState(false);
  const [clienti, setClienti] = useState<Array<{
    id: string;
    nome: string;
    cognome: string;
    email?: string;
    forma_giuridica?: string;
    ragione_sociale?: string;
  }>>([]);
  const [teamMembers, setTeamMembers] = useState<Array<{
    id: string;
    dipendente_id: string;
    nome: string;
    cognome: string;
    email?: string;
    ruolo?: string;
  }>>([]);
  const [allDipendenti, setAllDipendenti] = useState<Array<{
    id: string;
    nome: string;
    cognome: string;
    email?: string;
    ruolo?: string;
  }>>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<string>>(new Set());
  const [searchTeamQuery, setSearchTeamQuery] = useState('');

  // Impostazioni tab - Approval settings
  const [approvazionePresenze, setApprovazionePresenze] = useState({
    abilitato: false,
    approvatori: [] as string[] // dipendente_id array
  });
  const [approvazioneNoteSpesa, setApprovazioneNoteSpesa] = useState({
    abilitato: false,
    approvatori: [] as string[]
  });
  const [selectedApprovatoriPresenze, setSelectedApprovatoriPresenze] = useState<Set<string>>(new Set());
  const [selectedApprovatoriNoteSpesa, setSelectedApprovatoriNoteSpesa] = useState<Set<string>>(new Set());
  const [searchApprovatoriPresenzeQuery, setSearchApprovatoriPresenzeQuery] = useState('');
  const [searchApprovatoriNoteSpesaQuery, setSearchApprovatoriNoteSpesaQuery] = useState('');
  const [savingPresenze, setSavingPresenze] = useState(false);
  const [savingNoteSpesa, setSavingNoteSpesa] = useState(false);
  const [editingApprovazionePresenze, setEditingApprovazionePresenze] = useState(false);
  const [editingApprovazioneNoteSpesa, setEditingApprovazioneNoteSpesa] = useState(false);

  useEffect(() => {
    loadCommessaData();
    loadClientiForSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Load team data after commessa is loaded
  useEffect(() => {
    if (commessa?.id) {
      loadTeamData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commessa?.id]);

  // Load approval settings after commessa and dipendenti are loaded
  useEffect(() => {
    if (commessa?.id && allDipendenti.length > 0) {
      loadApprovalSettings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commessa?.id, allDipendenti.length]);

  // Update page title in navbar
  useEffect(() => {
    if (commessa) {
      // Store in sessionStorage for navbar to use
      sessionStorage.setItem('current-commessa-name', commessa.nome_commessa || '');
      sessionStorage.setItem('current-commessa-code', commessa.codice_commessa || '');

      // Trigger custom event to notify navbar
      window.dispatchEvent(new CustomEvent('commessa-loaded'));
    }

    return () => {
      // Cleanup on unmount
      sessionStorage.removeItem('current-commessa-name');
      sessionStorage.removeItem('current-commessa-code');
    };
  }, [commessa]);

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
        costi_buste_paga: 0,
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

      // Load note spese
      const [noteSpeseApprovateRes, noteSpeseDaApprovareRes, noteSpeseRifiutateRes] = await Promise.all([
        supabase
          .from('note_spesa')
          .select(`
            *,
            commesse!note_spesa_commessa_id_fkey (
              titolo,
              slug
            ),
            dipendenti!note_spesa_dipendente_id_fkey (
              id,
              nome,
              cognome,
              email
            ),
            categorie_note_spesa!note_spesa_categoria_fkey (
              id,
              nome,
              colore,
              icona
            )
          `)
          .eq('commessa_id', commessaData.id)
          .eq('stato', 'approvato')
          .order('data_nota', { ascending: false }),
        supabase
          .from('note_spesa')
          .select(`
            *,
            commesse!note_spesa_commessa_id_fkey (
              titolo,
              slug
            ),
            dipendenti!note_spesa_dipendente_id_fkey (
              id,
              nome,
              cognome,
              email
            ),
            categorie_note_spesa!note_spesa_categoria_fkey (
              id,
              nome,
              colore,
              icona
            )
          `)
          .eq('commessa_id', commessaData.id)
          .eq('stato', 'da_approvare')
          .order('data_nota', { ascending: false }),
        supabase
          .from('note_spesa')
          .select(`
            *,
            commesse!note_spesa_commessa_id_fkey (
              titolo,
              slug
            ),
            dipendenti!note_spesa_dipendente_id_fkey (
              id,
              nome,
              cognome,
              email
            ),
            categorie_note_spesa!note_spesa_categoria_fkey (
              id,
              nome,
              colore,
              icona
            )
          `)
          .eq('commessa_id', commessaData.id)
          .eq('stato', 'rifiutato')
          .order('data_nota', { ascending: false })
      ]);

      setNoteSpese(noteSpeseApprovateRes.data || []);
      setNoteSpeseDaApprovare(noteSpeseDaApprovareRes.data || []);
      setNoteSpeseRifiutate(noteSpeseRifiutateRes.data || []);

      // Load rapportini (presenze)
      const [rapportiniApprovatiRes, rapportiniDaApprovareRes, rapportiniRifiutatiRes] = await Promise.all([
        supabase
          .from('rapportini')
          .select(`
            *,
            dipendenti!rapportini_dipendente_id_fkey (
              id,
              nome,
              cognome
            ),
            commesse!rapportini_commessa_id_fkey (
              id,
              nome_commessa
            )
          `)
          .eq('commessa_id', commessaData.id)
          .eq('stato', 'approvato')
          .order('data_rapportino', { ascending: false }),
        supabase
          .from('rapportini')
          .select(`
            *,
            dipendenti!rapportini_dipendente_id_fkey (
              id,
              nome,
              cognome
            ),
            commesse!rapportini_commessa_id_fkey (
              id,
              nome_commessa
            )
          `)
          .eq('commessa_id', commessaData.id)
          .eq('stato', 'da_approvare')
          .order('data_rapportino', { ascending: false }),
        supabase
          .from('rapportini')
          .select(`
            *,
            dipendenti!rapportini_dipendente_id_fkey (
              id,
              nome,
              cognome
            ),
            commesse!rapportini_commessa_id_fkey (
              id,
              nome_commessa
            )
          `)
          .eq('commessa_id', commessaData.id)
          .eq('stato', 'rifiutato')
          .order('data_rapportino', { ascending: false })
      ]);

      setRapportini(rapportiniApprovatiRes.data || []);
      setRapportiniDaApprovare(rapportiniDaApprovareRes.data || []);
      setRapportiniRifiutati(rapportiniRifiutatiRes.data || []);

    } catch {
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per ricaricare SOLO le fatture senza resettare la UI
  const refreshFattureData = async () => {
    try {
      if (!commessa?.id) return;

      const supabase = createClient();

      // Ricarica SOLO le fatture e il riepilogo, NON tutta la pagina
      const [fattureAttiveRes, fatturePassiveRes, riepilogoRes] = await Promise.all([
        supabase
          .from('fatture_attive')
          .select('*')
          .eq('commessa_id', commessa.id)
          .order('data_fattura', { ascending: false }),
        supabase
          .from('fatture_passive')
          .select('*')
          .eq('commessa_id', commessa.id)
          .order('data_fattura', { ascending: false }),
        supabase
          .from('riepilogo_economico_commessa')
          .select('*')
          .eq('commessa_id', commessa.id)
          .single()
      ]);

      if (fattureAttiveRes.data) setFatture(fattureAttiveRes.data);
      if (fatturePassiveRes.data) setFatturePassive(fatturePassiveRes.data);
      if (riepilogoRes.data) setRiepilogo(riepilogoRes.data);
    } catch (error) {
      console.error('Error refreshing fatture:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowFatturaForm(false);
    setShowCostoForm(false);
    loadCommessaData();
  };

  // Load clienti for settings tab
  const loadClientiForSettings = async () => {
    try {
      const supabase = createClient();

      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!userTenants || userTenants.length === 0) return;

      const { data, error } = await supabase
        .from('clienti')
        .select('id, nome, cognome, email, forma_giuridica, ragione_sociale')
        .eq('tenant_id', userTenants[0].tenant_id)
        .order('cognome', { ascending: true });

      if (error) throw error;
      setClienti(data || []);
    } catch (error) {
      console.error('Error loading clienti:', error);
    }
  };

  const loadTeamData = async () => {
    try {
      const supabase = createClient();
      if (!commessa?.id) {
        console.log('loadTeamData: commessa.id not available yet');
        return;
      }

      // Get current user's tenant_id from user_tenants table
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('loadTeamData: No authenticated user');
        return;
      }

      const { data: userTenants, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (tenantError) {
        console.error('Error fetching tenant_id:', tenantError);
        throw tenantError;
      }

      if (!userTenants || userTenants.length === 0) {
        console.error('loadTeamData: No tenant found for user');
        return;
      }

      const tenantId = userTenants[0].tenant_id;
      console.log('loadTeamData: Loading for commessa_id:', commessa.id, 'tenant_id:', tenantId);

      // Load team members
      const { data: teamData, error: teamError } = await supabase
        .from('commesse_team')
        .select(`
          id,
          dipendente_id,
          dipendenti (
            id,
            nome,
            cognome,
            email,
            qualifica,
            mansione
          )
        `)
        .eq('commessa_id', commessa.id)
        .eq('tenant_id', tenantId);

      if (teamError) {
        console.error('Error loading team members:', teamError);
        throw teamError;
      }

      const members = (teamData || []).map((t: any) => ({
        id: t.id,
        dipendente_id: t.dipendente_id,
        nome: t.dipendenti?.nome || '',
        cognome: t.dipendenti?.cognome || '',
        email: t.dipendenti?.email || '',
        ruolo: t.dipendenti?.qualifica || t.dipendenti?.mansione || ''
      }));

      console.log('loadTeamData: Loaded team members:', members.length);
      setTeamMembers(members);
      setSelectedTeamMembers(new Set(members.map(m => m.dipendente_id)));

      // Load all dipendenti for selection
      const { data: allDip, error: dipError } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome, email, qualifica, mansione')
        .eq('tenant_id', tenantId)
        .order('cognome', { ascending: true});

      if (dipError) {
        console.error('Error loading dipendenti:', dipError);
        throw dipError;
      }

      // Map qualifica or mansione to ruolo for display (like in nuova commessa page)
      const dipendentiWithRuolo = (allDip || []).map(d => ({
        id: d.id,
        nome: d.nome,
        cognome: d.cognome,
        email: d.email,
        ruolo: d.qualifica || d.mansione || ''
      }));

      console.log('loadTeamData: Loaded all dipendenti:', dipendentiWithRuolo.length);
      setAllDipendenti(dipendentiWithRuolo);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Errore nel caricamento del team');
    }
  };

  // Load approval settings
  const loadApprovalSettings = async () => {
    if (!commessa?.id) return;

    try {
      console.log('loadApprovalSettings: Loading for commessa_id:', commessa.id);
      const supabase = createClient();

      const { data, error } = await supabase
        .from('commesse_impostazioni_approvazione')
        .select('*')
        .eq('commessa_id', commessa.id);

      if (error) {
        console.error('Error loading approval settings:', error);
        throw error;
      }

      // Process loaded data
      const presenzeConfig = data?.find(d => d.tipo_approvazione === 'presenze');
      const noteSpesaConfig = data?.find(d => d.tipo_approvazione === 'note_spesa');

      if (presenzeConfig) {
        const approvatori = presenzeConfig.approvatori || [];
        setApprovazionePresenze({
          abilitato: presenzeConfig.abilitato || false,
          approvatori: approvatori
        });
        setSelectedApprovatoriPresenze(new Set(approvatori));
        // Se abilitato ma nessun approvatore, vai in edit mode
        if (presenzeConfig.abilitato && approvatori.length === 0) {
          setEditingApprovazionePresenze(true);
        }
      } else {
        setApprovazionePresenze({ abilitato: false, approvatori: [] });
        setSelectedApprovatoriPresenze(new Set());
      }

      if (noteSpesaConfig) {
        const approvatori = noteSpesaConfig.approvatori || [];
        setApprovazioneNoteSpesa({
          abilitato: noteSpesaConfig.abilitato || false,
          approvatori: approvatori
        });
        setSelectedApprovatoriNoteSpesa(new Set(approvatori));
        // Se abilitato ma nessun approvatore, vai in edit mode
        if (noteSpesaConfig.abilitato && approvatori.length === 0) {
          setEditingApprovazioneNoteSpesa(true);
        }
      } else {
        setApprovazioneNoteSpesa({ abilitato: false, approvatori: [] });
        setSelectedApprovatoriNoteSpesa(new Set());
      }

      console.log('loadApprovalSettings: Loaded successfully');
    } catch (error) {
      console.error('Error loading approval settings:', error);
      toast.error('Errore nel caricamento delle impostazioni di approvazione');
    }
  };

  // Settings tab handlers
  const initializeSectionData = (section: SectionKey) => {
    if (!commessa) return;

    const newData = { ...sectionData };

    switch (section) {
      case 'informazioniGenerali':
        newData.informazioniGenerali = {
          codice_commessa: commessa.codice_commessa || '',
          nome_commessa: commessa.nome_commessa || '',
          tipologia_commessa: commessa.tipologia_commessa || ''
        };
        break;
      case 'cliente':
        newData.cliente = {
          tipologia_cliente: commessa.tipologia_cliente || '',
          cliente_commessa: commessa.cliente_commessa || '',
          cig: commessa.cig || '',
          cup: commessa.cup || ''
        };
        break;
      case 'luogo':
        newData.luogo = {
          via: commessa.via || '',
          numero_civico: commessa.numero_civico || '',
          citta: commessa.citta || '',
          provincia: commessa.provincia || '',
          cap: commessa.cap || ''
        };
        break;
      case 'pianificazione':
        newData.pianificazione = {
          data_inizio: commessa.data_inizio || '',
          data_fine_prevista: commessa.data_fine_prevista || '',
          importo_commessa: commessa.importo_commessa?.toString() || '',
          budget_commessa: commessa.budget_commessa?.toString() || '',
          costo_materiali: commessa.costo_materiali?.toString() || ''
        };
        break;
      case 'descrizione':
        newData.descrizione = {
          descrizione: commessa.descrizione || ''
        };
        break;
    }

    setSectionData(newData);
  };

  const handleEditSection = (section: SectionKey) => {
    setEditingSection(section);
    initializeSectionData(section);
    setSectionErrors({});
  };

  const handleCancelSection = () => {
    setEditingSection(null);
    setSectionErrors({});
  };

  const updateSectionData = (section: SectionKey, field: string, value: string | number | null) => {
    setSectionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    // Clear error for this field
    if (sectionErrors[field]) {
      setSectionErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateSection = (section: SectionKey): boolean => {
    const errors: Record<string, boolean> = {};
    const data = sectionData[section];

    switch (section) {
      case 'informazioniGenerali':
        if (!data.codice_commessa) errors.codice_commessa = true;
        if (!data.nome_commessa) errors.nome_commessa = true;
        if (!data.tipologia_commessa) errors.tipologia_commessa = true;
        break;
      case 'cliente':
        if (!data.tipologia_cliente) errors.tipologia_cliente = true;
        if (!data.cliente_commessa) errors.cliente_commessa = true;
        if (data.tipologia_cliente === 'Pubblico') {
          if (!data.cig) errors.cig = true;
          if (!data.cup) errors.cup = true;
        }
        break;
      case 'pianificazione':
        if (data.data_inizio && data.data_fine_prevista) {
          const dataInizio = new Date(data.data_inizio as string);
          const dataFine = new Date(data.data_fine_prevista as string);
          if (dataFine < dataInizio) {
            errors.data_fine_prevista = true;
          }
        }
        break;
    }

    setSectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTeam = async () => {
    try {
      const supabase = createClient();
      if (!commessa) return;

      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!userTenants || userTenants.length === 0) return;

      const tenantId = userTenants[0].tenant_id;

      // Calculate which members to add and remove
      const currentMemberIds = new Set(teamMembers.map(m => m.dipendente_id));
      const toAdd = Array.from(selectedTeamMembers).filter(id => !currentMemberIds.has(id));
      const toRemove = Array.from(currentMemberIds).filter(id => !selectedTeamMembers.has(id));

      // Remove members
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('commesse_team')
          .delete()
          .eq('commessa_id', commessa.id)
          .in('dipendente_id', toRemove);

        if (deleteError) throw deleteError;
      }

      // Add new members
      if (toAdd.length > 0) {
        const newMembers = toAdd.map(dipendente_id => ({
          commessa_id: commessa.id,
          dipendente_id,
          tenant_id: tenantId
        }));

        const { error: insertError } = await supabase
          .from('commesse_team')
          .upsert(newMembers, {
            onConflict: 'commessa_id,dipendente_id',
            ignoreDuplicates: true
          });

        if (insertError) throw insertError;
      }

      toast.success('Team aggiornato con successo');
      await loadTeamData();
      setEditingSection(null);
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Errore durante l\'aggiornamento del team');
    }
  };

  const handleSaveSection = async (section: SectionKey) => {
    if (!validateSection(section)) {
      toast.error('Controlla i campi obbligatori');
      return;
    }

    if (!commessa) return;

    setSavingSection(true);

    try {
      const supabase = createClient();
      const data = sectionData[section];

      let updateData: Record<string, unknown> = {};

      switch (section) {
        case 'informazioniGenerali':
          updateData = {
            codice_commessa: data.codice_commessa,
            nome_commessa: data.nome_commessa,
            tipologia_commessa: data.tipologia_commessa,
          };
          // Update slug if nome changed
          if (data.nome_commessa !== commessa.nome_commessa) {
            updateData.slug = generateSlug(data.nome_commessa as string);
          }
          break;
        case 'cliente':
          updateData = {
            tipologia_cliente: data.tipologia_cliente,
            cliente_commessa: data.cliente_commessa,
            cig: data.tipologia_cliente === 'Pubblico' ? data.cig : null,
            cup: data.tipologia_cliente === 'Pubblico' ? data.cup : null,
          };
          break;
        case 'luogo':
          updateData = {
            via: data.via || null,
            numero_civico: data.numero_civico || null,
            citta: data.citta || null,
            provincia: data.provincia || null,
            cap: data.cap || null,
          };
          break;
        case 'pianificazione':
          updateData = {
            data_inizio: data.data_inizio || null,
            data_fine_prevista: data.data_fine_prevista || null,
            importo_commessa: data.importo_commessa ? parseFloat(data.importo_commessa as string) : null,
            budget_commessa: data.budget_commessa ? parseFloat(data.budget_commessa as string) : null,
            costo_materiali: data.costo_materiali ? parseFloat(data.costo_materiali as string) : null,
          };
          break;
        case 'descrizione':
          updateData = {
            descrizione: data.descrizione || null,
          };
          break;
        case 'team':
          // Handle team updates separately
          await handleSaveTeam();
          setSavingSection(false);
          return;
      }

      const { error } = await supabase
        .from('commesse')
        .update(updateData)
        .eq('id', commessa.id);

      if (error) throw error;

      toast.success('Sezione aggiornata con successo');
      await loadCommessaData();
      setEditingSection(null);
      setSectionErrors({});
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error('Errore durante l\'aggiornamento');
    } finally {
      setSavingSection(false);
    }
  };

  const generateSlug = (nome: string): string => {
    return nome
      .toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const formatCurrencyInput = (value: string): string => {
    if (!value) return '';
    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (decimalPart !== undefined) {
      return `${formattedInteger},${decimalPart}`;
    }
    return formattedInteger;
  };

  const handleCurrencyChange = (section: SectionKey, field: string, value: string) => {
    const rawValue = value.replace(/[^\d,]/g, '');
    const commaCount = (rawValue.match(/,/g) || []).length;
    if (commaCount > 1) return;

    const parts = rawValue.split(',');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    if (decimalPart && decimalPart.length > 2) return;

    const numericValue = rawValue.replace(',', '.');
    const num = parseFloat(numericValue);
    if (!isNaN(num) && num > 999999999.99) return;

    const cleanValue = integerPart + (decimalPart !== undefined ? '.' + decimalPart : '');
    updateSectionData(section, field, cleanValue);
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
      <TabsFilter<TabValue>
        tabs={[
          { value: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
          {
            value: 'movimenti',
            label: 'Fatture',
            icon: Receipt
          },
          { value: 'note-spesa', label: 'Note Spesa', icon: FileText },
          { value: 'rapportini', label: 'Registro Presenze', icon: Users },
          { value: 'report', label: 'Report', icon: BarChart3 },
          { value: 'documenti', label: 'Documenti', icon: FolderOpen },
          { value: 'dettagli', label: 'Dettagli', icon: Info },
          { value: 'impostazioni', label: 'Impostazioni', icon: Settings },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* TAB: Panoramica */}
      {activeTab === 'panoramica' && (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Dashboard panoramica in arrivo</p>
        </div>
      )}

      {/* TAB: Movimenti */}
      {activeTab === 'movimenti' && (
        <MovimentiTab
          commessaId={commessa?.id || ''}
          fattureAttive={fatture}
          fatturePassive={fatturePassive}
          riepilogo={riepilogo}
          onReload={refreshFattureData}
        />
      )}

      {/* TAB: Note Spesa */}
      {activeTab === 'note-spesa' && commessa && (
        <NoteSpeseTab
          commessaId={commessa.id}
          commessaNome={commessa.nome_commessa}
          noteSpese={noteSpese}
          noteSpeseDaApprovare={noteSpeseDaApprovare}
          noteSpeseRifiutate={noteSpeseRifiutate}
          onReload={loadCommessaData}
        />
      )}

      {/* TAB: Registro Presenze */}
      {activeTab === 'rapportini' && commessa && (
        <RapportiniTab
          commessaId={commessa.id}
          commessaNome={commessa.nome_commessa}
          rapportini={rapportini}
          rapportiniDaApprovare={rapportiniDaApprovare}
          rapportiniRifiutati={rapportiniRifiutati}
          onReload={loadCommessaData}
        />
      )}

      {/* TAB: Report */}
      {activeTab === 'report' && commessa && (
        <CommessaReportTab
          commessaId={commessa.id}
          commessa={commessa}
          fattureAttive={fatture}
          fatturePassive={fatturePassive}
          noteSpese={noteSpese}
        />
      )}

      {/* TAB: Documenti */}
      {activeTab === 'documenti' && (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Funzionalità documenti in arrivo</p>
        </div>
      )}

      {/* TAB: Dettagli */}
      {activeTab === 'dettagli' && commessa && (
        <div className="space-y-6">
          {/* 1. INFORMAZIONI GENERALI */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Informazioni Generali</h3>
                <p className="text-sm text-muted-foreground">Dati principali della commessa</p>
              </div>
              {editingSection !== 'informazioniGenerali' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSection('informazioniGenerali')}
                  disabled={editingSection !== null}
                  className="border-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSection} disabled={savingSection} className="border-2">
                    Annulla
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleSaveSection('informazioniGenerali')} disabled={savingSection}>
                    {savingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'informazioniGenerali' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Codice Commessa</p>
                  <p className="text-base font-semibold">{commessa.codice_commessa || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Nome Commessa</p>
                  <p className="text-base font-semibold">{commessa.nome_commessa || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tipologia Commessa</p>
                  <p className="text-base font-semibold">{commessa.tipologia_commessa || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'informazioniGenerali' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-codice">Codice Commessa <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-codice"
                    value={sectionData.informazioniGenerali.codice_commessa as string}
                    onChange={(e) => updateSectionData('informazioniGenerali', 'codice_commessa', e.target.value)}
                    className={`h-11 border-2 border-border bg-white ${sectionErrors.codice_commessa ? '!border-red-500' : ''}`}
                  />
                  {sectionErrors.codice_commessa && (
                    <p className="text-sm text-red-500 font-medium">Il codice commessa è obbligatorio</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome Commessa <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-nome"
                    value={sectionData.informazioniGenerali.nome_commessa as string}
                    onChange={(e) => updateSectionData('informazioniGenerali', 'nome_commessa', e.target.value)}
                    className={`h-11 border-2 border-border bg-white ${sectionErrors.nome_commessa ? '!border-red-500' : ''}`}
                  />
                  {sectionErrors.nome_commessa && (
                    <p className="text-sm text-red-500 font-medium">Il nome commessa è obbligatorio</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tipologia">Tipologia Commessa <span className="text-destructive">*</span></Label>
                  <Select
                    value={sectionData.informazioniGenerali.tipologia_commessa as string}
                    onValueChange={(value) => updateSectionData('informazioniGenerali', 'tipologia_commessa', value)}
                  >
                    <SelectTrigger id="edit-tipologia" className={`h-11 border-2 border-border bg-white ${sectionErrors.tipologia_commessa ? '!border-red-500' : ''}`}>
                      <SelectValue placeholder="Seleziona una tipologia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Appalto">Appalto</SelectItem>
                      <SelectItem value="ATI">ATI</SelectItem>
                      <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
                      <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
                    </SelectContent>
                  </Select>
                  {sectionErrors.tipologia_commessa && (
                    <p className="text-sm text-red-500 font-medium">Seleziona una tipologia di commessa</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. CLIENTE */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Cliente</h3>
                <p className="text-sm text-muted-foreground">Informazioni del cliente</p>
              </div>
              {editingSection !== 'cliente' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSection('cliente')}
                  disabled={editingSection !== null}
                  className="border-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSection} disabled={savingSection} className="border-2">
                    Annulla
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleSaveSection('cliente')} disabled={savingSection}>
                    {savingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'cliente' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tipologia Cliente</p>
                  <p className="text-base font-semibold">{commessa.tipologia_cliente || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cliente Commessa</p>
                  <p className="text-base font-semibold">
                    {clienti.find(c => c.id === commessa.cliente_commessa)
                      ? `${clienti.find(c => c.id === commessa.cliente_commessa)?.cognome} ${clienti.find(c => c.id === commessa.cliente_commessa)?.nome}`
                      : commessa.cliente_commessa || '—'}
                  </p>
                </div>
                {commessa.tipologia_cliente === 'Pubblico' && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">CIG</p>
                      <p className="text-base font-semibold">{commessa.cig || '—'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">CUP</p>
                      <p className="text-base font-semibold">{commessa.cup || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'cliente' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-tipologia-cliente">Tipologia Cliente <span className="text-destructive">*</span></Label>
                    <Select
                      value={sectionData.cliente.tipologia_cliente as string}
                      onValueChange={(value) => updateSectionData('cliente', 'tipologia_cliente', value)}
                    >
                      <SelectTrigger id="edit-tipologia-cliente" className={`h-11 border-2 border-border bg-white ${sectionErrors.tipologia_cliente ? '!border-red-500' : ''}`}>
                        <SelectValue placeholder="Seleziona tipologia cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Privato">Privato</SelectItem>
                        <SelectItem value="Pubblico">Pubblico</SelectItem>
                      </SelectContent>
                    </Select>
                    {sectionErrors.tipologia_cliente && (
                      <p className="text-sm text-red-500 font-medium">Seleziona la tipologia di cliente</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cliente-commessa">Cliente Commessa <span className="text-destructive">*</span></Label>
                    <Select
                      value={sectionData.cliente.cliente_commessa as string}
                      onValueChange={(value) => updateSectionData('cliente', 'cliente_commessa', value)}
                    >
                      <SelectTrigger id="edit-cliente-commessa" className={`h-11 border-2 border-border bg-white ${sectionErrors.cliente_commessa ? '!border-red-500' : ''}`}>
                        <SelectValue placeholder="Seleziona un cliente">
                          {sectionData.cliente.cliente_commessa
                            ? (() => {
                                const cliente = clienti.find(c => c.id === sectionData.cliente.cliente_commessa);
                                if (!cliente) return 'Seleziona un cliente';
                                return cliente.forma_giuridica === 'persona_giuridica'
                                  ? cliente.ragione_sociale
                                  : `${cliente.cognome} ${cliente.nome}`;
                              })()
                            : 'Seleziona un cliente'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clienti.length === 0 ? (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            Nessun cliente disponibile
                          </div>
                        ) : (
                          clienti.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.forma_giuridica === 'persona_giuridica'
                                ? cliente.ragione_sociale
                                : `${cliente.cognome} ${cliente.nome}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {sectionErrors.cliente_commessa && (
                      <p className="text-sm text-red-500 font-medium">Seleziona un cliente</p>
                    )}
                  </div>
                </div>

                {sectionData.cliente.tipologia_cliente === 'Pubblico' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="edit-cig">CIG <span className="text-destructive">*</span></Label>
                      <Input
                        id="edit-cig"
                        value={sectionData.cliente.cig as string}
                        onChange={(e) => updateSectionData('cliente', 'cig', e.target.value)}
                        placeholder="Es. 1234567890"
                        className={`h-11 border-2 border-border bg-white ${sectionErrors.cig ? '!border-red-500' : ''}`}
                      />
                      {sectionErrors.cig && (
                        <p className="text-sm text-red-500 font-medium">Il CIG è obbligatorio per clienti pubblici</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-cup">CUP <span className="text-destructive">*</span></Label>
                      <Input
                        id="edit-cup"
                        value={sectionData.cliente.cup as string}
                        onChange={(e) => updateSectionData('cliente', 'cup', e.target.value)}
                        placeholder="Es. A12B34567890123"
                        className={`h-11 border-2 border-border bg-white ${sectionErrors.cup ? '!border-red-500' : ''}`}
                      />
                      {sectionErrors.cup && (
                        <p className="text-sm text-red-500 font-medium">Il CUP è obbligatorio per clienti pubblici</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. LUOGO */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Luogo</h3>
                <p className="text-sm text-muted-foreground">Località della commessa</p>
              </div>
              {editingSection !== 'luogo' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSection('luogo')}
                  disabled={editingSection !== null}
                  className="border-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSection} disabled={savingSection} className="border-2">
                    Annulla
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleSaveSection('luogo')} disabled={savingSection}>
                    {savingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'luogo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Via</p>
                  <p className="text-base font-semibold">{commessa.via || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">N. Civico</p>
                  <p className="text-base font-semibold">{commessa.numero_civico || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Città</p>
                  <p className="text-base font-semibold">{commessa.citta || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Provincia</p>
                  <p className="text-base font-semibold">{commessa.provincia || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">CAP</p>
                  <p className="text-base font-semibold">{commessa.cap || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'luogo' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="edit-via">Via</Label>
                    <Input
                      id="edit-via"
                      value={sectionData.luogo.via as string}
                      onChange={(e) => updateSectionData('luogo', 'via', e.target.value)}
                      placeholder="Es. Via Roma"
                      className="h-11 border-2 border-border bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-numero-civico">N. Civico</Label>
                    <Input
                      id="edit-numero-civico"
                      value={sectionData.luogo.numero_civico as string}
                      onChange={(e) => updateSectionData('luogo', 'numero_civico', e.target.value)}
                      placeholder="Es. 123"
                      className="h-11 border-2 border-border bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-citta">Città</Label>
                    <CityCombobox
                      id="edit-citta"
                      value={sectionData.luogo.citta as string}
                      onSelect={(comune) => {
                        if (comune) {
                          updateSectionData('luogo', 'citta', comune.nome);
                          updateSectionData('luogo', 'provincia', comune.sigla_provincia);
                          updateSectionData('luogo', 'cap', comune.cap);
                        } else {
                          updateSectionData('luogo', 'citta', '');
                          updateSectionData('luogo', 'provincia', '');
                          updateSectionData('luogo', 'cap', '');
                        }
                      }}
                      placeholder="Seleziona città..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-provincia">Provincia</Label>
                    <Input
                      id="edit-provincia"
                      value={sectionData.luogo.provincia as string}
                      readOnly
                      disabled
                      placeholder="Auto"
                      className="h-11 border-2 border-border bg-white uppercase opacity-100 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cap">CAP</Label>
                    <Input
                      id="edit-cap"
                      value={sectionData.luogo.cap as string}
                      readOnly
                      disabled
                      placeholder="Auto"
                      className="h-11 border-2 border-border bg-white opacity-100 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. PIANIFICAZIONE */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Pianificazione</h3>
                <p className="text-sm text-muted-foreground">Date e importi della commessa</p>
              </div>
              {editingSection !== 'pianificazione' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSection('pianificazione')}
                  disabled={editingSection !== null}
                  className="border-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSection} disabled={savingSection} className="border-2">
                    Annulla
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleSaveSection('pianificazione')} disabled={savingSection}>
                    {savingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'pianificazione' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Data Inizio</p>
                  <p className="text-base font-semibold">{formatDate(commessa.data_inizio)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Data Fine Prevista</p>
                  <p className="text-base font-semibold">{formatDate(commessa.data_fine_prevista)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Importo Contratto</p>
                  <p className="text-base font-semibold">{commessa.importo_commessa ? formatCurrency(commessa.importo_commessa) : '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Budget Commessa</p>
                  <p className="text-base font-semibold">{commessa.budget_commessa ? formatCurrency(commessa.budget_commessa) : '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Costo Materiali</p>
                  <p className="text-base font-semibold">{commessa.costo_materiali ? formatCurrency(commessa.costo_materiali) : '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'pianificazione' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-data-inizio">Data Inizio</Label>
                    <Input
                      id="edit-data-inizio"
                      type="date"
                      value={sectionData.pianificazione.data_inizio as string}
                      onChange={(e) => updateSectionData('pianificazione', 'data_inizio', e.target.value)}
                      className="h-11 border-2 border-border bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-data-fine">Data Fine Prevista</Label>
                    <Input
                      id="edit-data-fine"
                      type="date"
                      value={sectionData.pianificazione.data_fine_prevista as string}
                      onChange={(e) => updateSectionData('pianificazione', 'data_fine_prevista', e.target.value)}
                      className={`h-11 border-2 border-border bg-white ${sectionErrors.data_fine_prevista ? '!border-red-500' : ''}`}
                    />
                    {sectionErrors.data_fine_prevista && (
                      <p className="text-sm text-red-500 font-medium">La data fine non può essere precedente alla data inizio</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="edit-importo">Importo Contratto (€)</Label>
                    <Input
                      id="edit-importo"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formatCurrencyInput(sectionData.pianificazione.importo_commessa as string)}
                      onChange={(e) => handleCurrencyChange('pianificazione', 'importo_commessa', e.target.value)}
                      className="h-11 border-2 border-border bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-budget">Budget Commessa (€)</Label>
                    <Input
                      id="edit-budget"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formatCurrencyInput(sectionData.pianificazione.budget_commessa as string)}
                      onChange={(e) => handleCurrencyChange('pianificazione', 'budget_commessa', e.target.value)}
                      className="h-11 border-2 border-border bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-costo-materiali">Costo Materiali (€)</Label>
                    <Input
                      id="edit-costo-materiali"
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formatCurrencyInput(sectionData.pianificazione.costo_materiali as string)}
                      onChange={(e) => handleCurrencyChange('pianificazione', 'costo_materiali', e.target.value)}
                      className="h-11 border-2 border-border bg-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. DESCRIZIONE */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Descrizione</h3>
                <p className="text-sm text-muted-foreground">Note e dettagli aggiuntivi</p>
              </div>
              {editingSection !== 'descrizione' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditSection('descrizione')}
                  disabled={editingSection !== null}
                  className="border-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSection} disabled={savingSection} className="border-2">
                    Annulla
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleSaveSection('descrizione')} disabled={savingSection}>
                    {savingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'descrizione' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Descrizione</p>
                <p className="text-base leading-relaxed whitespace-pre-wrap break-words">{commessa.descrizione || '—'}</p>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'descrizione' && (
              <div className="space-y-2">
                <Label htmlFor="edit-descrizione">Descrizione</Label>
                <Textarea
                  id="edit-descrizione"
                  value={sectionData.descrizione.descrizione as string}
                  onChange={(e) => updateSectionData('descrizione', 'descrizione', e.target.value)}
                  rows={6}
                  placeholder="Inserisci una descrizione dettagliata della commessa..."
                  className="border-2 border-border bg-white resize-none"
                />
              </div>
            )}
          </div>

          {/* 6. TEAM */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Team</h3>
                <p className="text-sm text-muted-foreground">Membri del team assegnati alla commessa</p>
              </div>
              {editingSection !== 'team' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingSection('team');
                    setSelectedTeamMembers(new Set(teamMembers.map(m => m.dipendente_id)));
                  }}
                  disabled={editingSection !== null}
                  className="border-2"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelSection} disabled={savingSection} className="border-2">
                    Annulla
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleSaveSection('team')} disabled={savingSection}>
                    {savingSection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Salva
                  </Button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'team' && (
              <div className="space-y-3">
                {teamMembers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nessun membro nel team</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                          {member.nome.charAt(0)}{member.cognome.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.cognome} {member.nome}</p>
                          <p className="text-sm text-muted-foreground truncate">{member.ruolo || 'Dipendente'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'team' && (
              <div className="space-y-6">
                {/* SEZIONE 1: Team Attuale */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold">Team Attuale</h4>
                    <span className="text-sm text-muted-foreground">
                      {selectedTeamMembers.size} {selectedTeamMembers.size === 1 ? 'membro' : 'membri'}
                    </span>
                  </div>
                  {selectedTeamMembers.size === 0 ? (
                    <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                      Nessun membro nel team
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allDipendenti
                        .filter(d => selectedTeamMembers.has(d.id))
                        .map((dipendente) => (
                          <div
                            key={dipendente.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                              <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newSet = new Set(selectedTeamMembers);
                                newSet.delete(dipendente.id);
                                setSelectedTeamMembers(newSet);
                              }}
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* SEZIONE 2: Aggiungi Membri */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold">Aggiungi Membri</h4>
                    <span className="text-sm text-muted-foreground">
                      {allDipendenti.filter(d => !selectedTeamMembers.has(d.id)).length} disponibili
                    </span>
                  </div>

                  {/* Campo Ricerca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca dipendente per nome, cognome..."
                      value={searchTeamQuery}
                      onChange={(e) => setSearchTeamQuery(e.target.value)}
                      className="h-11 border-2 border-border bg-white pl-9"
                    />
                  </div>

                  {/* Lista Dipendenti Disponibili */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {allDipendenti
                      .filter(d => !selectedTeamMembers.has(d.id))
                      .filter(d => {
                        if (!searchTeamQuery) return true;
                        const query = searchTeamQuery.toLowerCase();
                        return (
                          d.nome.toLowerCase().includes(query) ||
                          d.cognome.toLowerCase().includes(query) ||
                          (d.ruolo && d.ruolo.toLowerCase().includes(query))
                        );
                      })
                      .map((dipendente) => (
                        <div
                          key={dipendente.id}
                          onClick={() => {
                            const newSet = new Set(selectedTeamMembers);
                            newSet.add(dipendente.id);
                            setSelectedTeamMembers(newSet);
                          }}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all"
                        >
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                            {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                            <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                          </div>
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ))}
                  </div>

                  {allDipendenti.filter(d => !selectedTeamMembers.has(d.id)).length === 0 && (
                    <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                      Tutti i dipendenti sono già nel team
                    </p>
                  )}

                  {searchTeamQuery && allDipendenti.filter(d => !selectedTeamMembers.has(d.id)).filter(d => {
                    const query = searchTeamQuery.toLowerCase();
                    return (
                      d.nome.toLowerCase().includes(query) ||
                      d.cognome.toLowerCase().includes(query) ||
                      (d.ruolo && d.ruolo.toLowerCase().includes(query))
                    );
                  }).length === 0 && (
                    <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                      Nessun dipendente trovato per "{searchTeamQuery}"
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 7. GESTIONE AVANZATA */}
          <div className="space-y-6 p-6 rounded-xl bg-card">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-slate-400 pl-4">
              <h3 className="text-lg font-semibold">Gestione Avanzata</h3>
              <p className="text-sm text-muted-foreground">Archiviazione o eliminazione della commessa</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Archivia */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-slate-600" />
                  <h4 className="font-semibold">Archivia</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nascondi la commessa mantenendo tutti i dati. Completamente reversibile.
                </p>
                <Button variant="outline" size="sm" disabled className="w-full">
                  Archivia (Prossimamente)
                </Button>
              </div>

              {/* Elimina */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <h4 className="font-semibold">Elimina Definitivamente</h4>
                  <span className="px-1.5 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded border border-red-200">
                    Irreversibile
                  </span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">Elimina permanentemente:</p>
                  <ul className="text-xs space-y-0.5 ml-3">
                    <li>• Fatture, Rapportini, Documenti</li>
                    <li>• Team e dati economici</li>
                  </ul>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Elimina
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Impostazioni */}
      {activeTab === 'impostazioni' && (
        <div className="space-y-6">
          {/* CARD 1: Approvazione Presenze */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Approvazione Presenze</h3>
                    <Switch
                      checked={approvazionePresenze.abilitato}
                      onCheckedChange={async (checked) => {
                        setApprovazionePresenze({ ...approvazionePresenze, abilitato: checked });
                        if (!checked) {
                          // Disattivazione: salva subito nel DB
                          setSelectedApprovatoriPresenze(new Set());
                          setEditingApprovazionePresenze(false);

                          try {
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('No authenticated user');

                            const { data: userTenants } = await supabase
                              .from('user_tenants')
                              .select('tenant_id')
                              .eq('user_id', user.id)
                              .order('created_at', { ascending: false })
                              .limit(1);

                            if (!userTenants || userTenants.length === 0) {
                              throw new Error('No tenant found for user');
                            }

                            const tenantId = userTenants[0].tenant_id;

                            const { error } = await supabase
                              .from('commesse_impostazioni_approvazione')
                              .upsert({
                                commessa_id: commessa?.id,
                                tenant_id: tenantId,
                                tipo_approvazione: 'presenze',
                                abilitato: false,
                                approvatori: [],
                                created_by: user.id
                              }, {
                                onConflict: 'commessa_id,tipo_approvazione',
                                ignoreDuplicates: false
                              });

                            if (error) throw error;
                            toast.success('Approvazione Presenze disattivata');
                          } catch (error) {
                            console.error('Error saving:', error);
                            toast.error('Errore durante la disattivazione');
                          }
                        } else {
                          // Se abilito per la prima volta, vado in edit mode
                          setEditingApprovazionePresenze(true);
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Richiedi approvazione per i rapportini di questa commessa
                  </p>
                </div>
                <div className="flex gap-2">
                  {approvazionePresenze.abilitato && editingApprovazionePresenze && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Ripristina gli approvatori salvati
                          setSelectedApprovatoriPresenze(new Set(approvazionePresenze.approvatori));
                          setSearchApprovatoriPresenzeQuery('');
                          setEditingApprovazionePresenze(false);
                        }}
                      >
                        Annulla
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          setSavingPresenze(true);
                          try {
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('No authenticated user');

                            const { data: userTenants } = await supabase
                              .from('user_tenants')
                              .select('tenant_id')
                              .eq('user_id', user.id)
                              .order('created_at', { ascending: false })
                              .limit(1);

                            if (!userTenants || userTenants.length === 0) {
                              throw new Error('No tenant found for user');
                            }

                            const tenantId = userTenants[0].tenant_id;

                            const { error } = await supabase
                              .from('commesse_impostazioni_approvazione')
                              .upsert({
                                commessa_id: commessa?.id,
                                tenant_id: tenantId,
                                tipo_approvazione: 'presenze',
                                abilitato: approvazionePresenze.abilitato,
                                approvatori: Array.from(selectedApprovatoriPresenze),
                                created_by: user.id
                              }, {
                                onConflict: 'commessa_id,tipo_approvazione',
                                ignoreDuplicates: false
                              });

                            if (error) throw error;

                            setApprovazionePresenze({
                              abilitato: approvazionePresenze.abilitato,
                              approvatori: Array.from(selectedApprovatoriPresenze)
                            });

                            toast.success('Approvazione Presenze salvata');
                            setEditingApprovazionePresenze(false);
                          } catch (error) {
                            console.error('Error saving:', error);
                            toast.error('Errore durante il salvataggio');
                          } finally {
                            setSavingPresenze(false);
                          }
                        }}
                        disabled={savingPresenze}
                      >
                        {savingPresenze ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvataggio...
                          </>
                        ) : (
                          'Salva'
                        )}
                      </Button>
                    </>
                  )}
                  {approvazionePresenze.abilitato && !editingApprovazionePresenze && selectedApprovatoriPresenze.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingApprovazionePresenze(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content - Approvers */}
            {approvazionePresenze.abilitato && (
              <>
                {/* VIEW MODE: Mostra solo approvatori */}
                {!editingApprovazionePresenze && selectedApprovatoriPresenze.size > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold">
                      Approvatori ({selectedApprovatoriPresenze.size})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allDipendenti
                        .filter(d => selectedApprovatoriPresenze.has(d.id))
                        .map((dipendente) => (
                          <div
                            key={dipendente.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                              <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* EDIT MODE: Mostra tutto */}
                {editingApprovazionePresenze && (
                  <div className="space-y-6">
                    {/* SEZIONE 1: Approvatori Selezionati */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold">Approvatori Selezionati</h4>
                        <span className="text-sm text-muted-foreground">
                          {selectedApprovatoriPresenze.size} {selectedApprovatoriPresenze.size === 1 ? 'approvatore' : 'approvatori'}
                        </span>
                      </div>
                      {selectedApprovatoriPresenze.size === 0 ? (
                        <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                          Nessun approvatore selezionato
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {allDipendenti
                            .filter(d => selectedApprovatoriPresenze.has(d.id))
                            .map((dipendente) => (
                              <div
                                key={dipendente.id}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary"
                              >
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                  {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                                  <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newSet = new Set(selectedApprovatoriPresenze);
                                    newSet.delete(dipendente.id);
                                    setSelectedApprovatoriPresenze(newSet);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* SEZIONE 2: Aggiungi Approvatori */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold">Aggiungi Approvatori</h4>
                        <span className="text-sm text-muted-foreground">
                          {allDipendenti.filter(d => !selectedApprovatoriPresenze.has(d.id)).length} disponibili
                        </span>
                      </div>

                      {/* Campo Ricerca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cerca dipendente per nome, cognome..."
                          value={searchApprovatoriPresenzeQuery}
                          onChange={(e) => setSearchApprovatoriPresenzeQuery(e.target.value)}
                          className="pl-9 bg-white border border-input"
                        />
                      </div>

                      {/* Lista Dipendenti Disponibili */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {allDipendenti
                          .filter(d => !selectedApprovatoriPresenze.has(d.id))
                          .filter(d => {
                            if (!searchApprovatoriPresenzeQuery) return true;
                            const query = searchApprovatoriPresenzeQuery.toLowerCase();
                            return (
                              d.nome.toLowerCase().includes(query) ||
                              d.cognome.toLowerCase().includes(query) ||
                              (d.ruolo && d.ruolo.toLowerCase().includes(query))
                            );
                          })
                          .map((dipendente) => (
                            <div
                              key={dipendente.id}
                              onClick={() => {
                                const newSet = new Set(selectedApprovatoriPresenze);
                                newSet.add(dipendente.id);
                                setSelectedApprovatoriPresenze(newSet);
                              }}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all"
                            >
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                                {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                                <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                              </div>
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ))}
                      </div>

                      {allDipendenti.filter(d => !selectedApprovatoriPresenze.has(d.id)).length === 0 && (
                        <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                          Tutti i dipendenti sono già stati aggiunti
                        </p>
                      )}

                      {searchApprovatoriPresenzeQuery && allDipendenti.filter(d => !selectedApprovatoriPresenze.has(d.id)).filter(d => {
                        const query = searchApprovatoriPresenzeQuery.toLowerCase();
                        return (
                          d.nome.toLowerCase().includes(query) ||
                          d.cognome.toLowerCase().includes(query) ||
                          (d.ruolo && d.ruolo.toLowerCase().includes(query))
                        );
                      }).length === 0 && (
                        <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                          Nessun dipendente trovato per "{searchApprovatoriPresenzeQuery}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* CARD 2: Approvazione Note Spesa */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Approvazione Note Spesa</h3>
                    <Switch
                      checked={approvazioneNoteSpesa.abilitato}
                      onCheckedChange={async (checked) => {
                        setApprovazioneNoteSpesa({ ...approvazioneNoteSpesa, abilitato: checked });
                        if (!checked) {
                          // Disattivazione: salva subito nel DB
                          setSelectedApprovatoriNoteSpesa(new Set());
                          setEditingApprovazioneNoteSpesa(false);

                          try {
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('No authenticated user');

                            const { data: userTenants } = await supabase
                              .from('user_tenants')
                              .select('tenant_id')
                              .eq('user_id', user.id)
                              .order('created_at', { ascending: false })
                              .limit(1);

                            if (!userTenants || userTenants.length === 0) {
                              throw new Error('No tenant found for user');
                            }

                            const tenantId = userTenants[0].tenant_id;

                            const { error } = await supabase
                              .from('commesse_impostazioni_approvazione')
                              .upsert({
                                commessa_id: commessa?.id,
                                tenant_id: tenantId,
                                tipo_approvazione: 'note_spesa',
                                abilitato: false,
                                approvatori: [],
                                created_by: user.id
                              }, {
                                onConflict: 'commessa_id,tipo_approvazione',
                                ignoreDuplicates: false
                              });

                            if (error) throw error;
                            toast.success('Approvazione Note Spesa disattivata');
                          } catch (error) {
                            console.error('Error saving:', error);
                            toast.error('Errore durante la disattivazione');
                          }
                        } else {
                          // Se abilito per la prima volta, vado in edit mode
                          setEditingApprovazioneNoteSpesa(true);
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Richiedi approvazione per le note spesa di questa commessa
                  </p>
                </div>
                <div className="flex gap-2">
                  {approvazioneNoteSpesa.abilitato && editingApprovazioneNoteSpesa && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Ripristina gli approvatori salvati
                          setSelectedApprovatoriNoteSpesa(new Set(approvazioneNoteSpesa.approvatori));
                          setSearchApprovatoriNoteSpesaQuery('');
                          setEditingApprovazioneNoteSpesa(false);
                        }}
                      >
                        Annulla
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          setSavingNoteSpesa(true);
                          try {
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('No authenticated user');

                            const { data: userTenants } = await supabase
                              .from('user_tenants')
                              .select('tenant_id')
                              .eq('user_id', user.id)
                              .order('created_at', { ascending: false })
                              .limit(1);

                            if (!userTenants || userTenants.length === 0) {
                              throw new Error('No tenant found for user');
                            }

                            const tenantId = userTenants[0].tenant_id;

                            const { error } = await supabase
                              .from('commesse_impostazioni_approvazione')
                              .upsert({
                                commessa_id: commessa?.id,
                                tenant_id: tenantId,
                                tipo_approvazione: 'note_spesa',
                                abilitato: approvazioneNoteSpesa.abilitato,
                                approvatori: Array.from(selectedApprovatoriNoteSpesa),
                                created_by: user.id
                              }, {
                                onConflict: 'commessa_id,tipo_approvazione',
                                ignoreDuplicates: false
                              });

                            if (error) throw error;

                            setApprovazioneNoteSpesa({
                              abilitato: approvazioneNoteSpesa.abilitato,
                              approvatori: Array.from(selectedApprovatoriNoteSpesa)
                            });

                            toast.success('Approvazione Note Spesa salvata');
                            setEditingApprovazioneNoteSpesa(false);
                          } catch (error) {
                            console.error('Error saving:', error);
                            toast.error('Errore durante il salvataggio');
                          } finally {
                            setSavingNoteSpesa(false);
                          }
                        }}
                        disabled={savingNoteSpesa}
                      >
                        {savingNoteSpesa ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvataggio...
                          </>
                        ) : (
                          'Salva'
                        )}
                      </Button>
                    </>
                  )}
                  {approvazioneNoteSpesa.abilitato && !editingApprovazioneNoteSpesa && selectedApprovatoriNoteSpesa.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingApprovazioneNoteSpesa(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Content - Approvers */}
            {approvazioneNoteSpesa.abilitato && (
              <>
                {/* VIEW MODE: Mostra solo approvatori */}
                {!editingApprovazioneNoteSpesa && selectedApprovatoriNoteSpesa.size > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-base font-semibold">
                      Approvatori ({selectedApprovatoriNoteSpesa.size})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allDipendenti
                        .filter(d => selectedApprovatoriNoteSpesa.has(d.id))
                        .map((dipendente) => (
                          <div
                            key={dipendente.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary"
                          >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                              {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                              <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* EDIT MODE: Mostra tutto */}
                {editingApprovazioneNoteSpesa && (
                  <div className="space-y-6">
                    {/* SEZIONE 1: Approvatori Selezionati */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold">Approvatori Selezionati</h4>
                        <span className="text-sm text-muted-foreground">
                          {selectedApprovatoriNoteSpesa.size} {selectedApprovatoriNoteSpesa.size === 1 ? 'approvatore' : 'approvatori'}
                        </span>
                      </div>
                      {selectedApprovatoriNoteSpesa.size === 0 ? (
                        <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                          Nessun approvatore selezionato
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {allDipendenti
                            .filter(d => selectedApprovatoriNoteSpesa.has(d.id))
                            .map((dipendente) => (
                              <div
                                key={dipendente.id}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary"
                              >
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                  {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                                  <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newSet = new Set(selectedApprovatoriNoteSpesa);
                                    newSet.delete(dipendente.id);
                                    setSelectedApprovatoriNoteSpesa(newSet);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* SEZIONE 2: Aggiungi Approvatori */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold">Aggiungi Approvatori</h4>
                        <span className="text-sm text-muted-foreground">
                          {allDipendenti.filter(d => !selectedApprovatoriNoteSpesa.has(d.id)).length} disponibili
                        </span>
                      </div>

                      {/* Campo Ricerca */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Cerca dipendente per nome, cognome..."
                          value={searchApprovatoriNoteSpesaQuery}
                          onChange={(e) => setSearchApprovatoriNoteSpesaQuery(e.target.value)}
                          className="pl-9 bg-white border border-input"
                        />
                      </div>

                      {/* Lista Dipendenti Disponibili */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {allDipendenti
                          .filter(d => !selectedApprovatoriNoteSpesa.has(d.id))
                          .filter(d => {
                            if (!searchApprovatoriNoteSpesaQuery) return true;
                            const query = searchApprovatoriNoteSpesaQuery.toLowerCase();
                            return (
                              d.nome.toLowerCase().includes(query) ||
                              d.cognome.toLowerCase().includes(query) ||
                              (d.ruolo && d.ruolo.toLowerCase().includes(query))
                            );
                          })
                          .map((dipendente) => (
                            <div
                              key={dipendente.id}
                              onClick={() => {
                                const newSet = new Set(selectedApprovatoriNoteSpesa);
                                newSet.add(dipendente.id);
                                setSelectedApprovatoriNoteSpesa(newSet);
                              }}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-green-50 hover:border-green-300 cursor-pointer transition-all"
                            >
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                                {dipendente.nome.charAt(0)}{dipendente.cognome.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{dipendente.cognome} {dipendente.nome}</p>
                                <p className="text-sm text-muted-foreground truncate">{dipendente.ruolo || 'Dipendente'}</p>
                              </div>
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ))}
                      </div>

                      {allDipendenti.filter(d => !selectedApprovatoriNoteSpesa.has(d.id)).length === 0 && (
                        <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                          Tutti i dipendenti sono già stati aggiunti
                        </p>
                      )}

                      {searchApprovatoriNoteSpesaQuery && allDipendenti.filter(d => !selectedApprovatoriNoteSpesa.has(d.id)).filter(d => {
                        const query = searchApprovatoriNoteSpesaQuery.toLowerCase();
                        return (
                          d.nome.toLowerCase().includes(query) ||
                          d.cognome.toLowerCase().includes(query) ||
                          (d.ruolo && d.ruolo.toLowerCase().includes(query))
                        );
                      }).length === 0 && (
                        <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                          Nessun dipendente trovato per "{searchApprovatoriNoteSpesaQuery}"
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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

      {showEditModal && commessa && (
        <EditCommessaModal
          commessa={commessa}
          onClose={() => setShowEditCommessaModal(false)}
          onSuccess={loadCommessaData}
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
              setShowEditMovimentoModal(true);
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

      {showEditMovimentoModal && selectedMovimento && (
        <EditMovimentoModal
          movimento={selectedMovimento}
          onClose={() => {
            setShowEditMovimentoModal(false);
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
