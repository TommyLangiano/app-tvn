'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  User,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Settings,
  Info,
  UserCheck,
  Building2,
  Clock,
  Wallet,
  Shield,
  Award,
  LayoutDashboard,
  Loader2,
  Check,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TabsFilter } from '@/components/ui/tabs-filter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';
import { GestioneDocumentiSection } from '@/components/features/dipendenti/GestioneDocumentiSection';

type Dipendente = {
  id: string;
  tenant_id: string;
  user_id?: string;
  slug?: string;

  // Dati anagrafici
  nome: string;
  cognome: string;
  codice_fiscale?: string;
  data_nascita?: string;
  luogo_nascita?: string;

  // Contatti
  telefono?: string;
  email?: string;
  pec?: string;

  // Residenza
  residenza_via?: string;
  residenza_civico?: string;
  residenza_cap?: string;
  residenza_citta?: string;
  residenza_provincia?: string;
  residenza_nazione?: string;

  // Domicilio
  domicilio_diverso: boolean;
  domicilio_via?: string;
  domicilio_civico?: string;
  domicilio_cap?: string;
  domicilio_citta?: string;
  domicilio_provincia?: string;
  domicilio_nazione?: string;

  // Dati professionali
  matricola?: string;
  qualifica?: string;
  mansione?: string;
  livello?: string;
  ccnl?: string;

  // Badge e turno
  badge_numero?: string;
  turno_default?: string;

  // Patenti e abilitazioni
  patente_guida?: string[];
  patentini?: string[];

  // Dati contrattuali
  data_assunzione?: string;
  data_fine_contratto?: string;
  tipo_contratto?: string;

  // Orario
  ore_settimanali?: number;
  part_time: boolean;
  percentuale_part_time?: number;

  // Dati retributivi
  retribuzione_lorda_mensile?: number;
  retribuzione_lorda_annua?: number;
  superminimo?: number;

  // Dati bancari
  iban?: string;
  intestatario_iban?: string;

  // Note
  note_interne?: string;

  // Stato
  stato: string;

  // Avatar
  avatar_url?: string;

  created_at?: string;
  updated_at?: string;
};

export default function DipendenteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slugOrId = params.id as string;

  type TabValue = 'panoramica' | 'professionale' | 'contratto' | 'retribuzione' | 'documenti' | 'dettagli' | 'impostazioni';

  const [activeTab, setActiveTab] = useState<TabValue>('panoramica');
  const [loading, setLoading] = useState(true);
  const [dipendente, setDipendente] = useState<Dipendente | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Dettagli tab - Edit inline states
  type SectionKey = 'datiGenerali' | 'contatti' | 'residenza' | 'domicilio' | 'professionali' | 'badge' | 'patenti' | 'contratto' | 'orario' | 'retribuzione' | 'bancari' | 'note';
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [sectionData, setSectionData] = useState<Record<SectionKey, Record<string, string | number | boolean | string[] | null>>>({
    datiGenerali: {
      nome: '',
      cognome: '',
      codice_fiscale: '',
      data_nascita: '',
      luogo_nascita: ''
    },
    contatti: {
      email: '',
      telefono: '',
      pec: ''
    },
    residenza: {
      residenza_via: '',
      residenza_civico: '',
      residenza_cap: '',
      residenza_citta: '',
      residenza_provincia: '',
      residenza_nazione: ''
    },
    domicilio: {
      domicilio_diverso: false,
      domicilio_via: '',
      domicilio_civico: '',
      domicilio_cap: '',
      domicilio_citta: '',
      domicilio_provincia: '',
      domicilio_nazione: ''
    },
    professionali: {
      matricola: '',
      qualifica: '',
      mansione: '',
      livello: '',
      ccnl: ''
    },
    badge: {
      badge_numero: '',
      turno_default: ''
    },
    patenti: {
      patente_guida: [],
      patentini: []
    },
    contratto: {
      tipo_contratto: '',
      data_assunzione: '',
      data_fine_contratto: '',
      stato: ''
    },
    orario: {
      ore_settimanali: 40,
      part_time: false,
      percentuale_part_time: null
    },
    retribuzione: {
      retribuzione_lorda_mensile: null,
      retribuzione_lorda_annua: null,
      superminimo: null
    },
    bancari: {
      iban: '',
      intestatario_iban: ''
    },
    note: {
      note_interne: ''
    }
  });
  const [sectionErrors, setSectionErrors] = useState<Record<string, boolean>>({});
  const [savingSection, setSavingSection] = useState(false);

  useEffect(() => {
    loadDipendente();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOrId]);

  const loadDipendente = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      if (!slugOrId) {
        setLoading(false);
        return;
      }

      // Try to load by slug first, then by id
      let query = supabase
        .from('dipendenti')
        .select('*');

      // Check if it's a UUID (id) or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

      if (isUUID) {
        query = query.eq('id', slugOrId);
      } else {
        query = query.eq('slug', slugOrId);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setDipendente(data);
    } catch {
      toast.error('Errore nel caricamento del dipendente');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const supabase = createClient();

      if (!dipendente) return;

      // Se il dipendente ha un account utente collegato, eliminalo prima
      if (dipendente.user_id) {
        // Chiama API per eliminare l'utente auth
        const deleteUserResponse = await fetch(`/api/users/${dipendente.user_id}`, {
          method: 'DELETE',
        });

        if (!deleteUserResponse.ok) {
          const error = await deleteUserResponse.json();
          console.error('Errore eliminazione account utente:', error);
          toast.error('Errore durante l\'eliminazione dell\'account utente');
          return;
        }
      }

      // Elimina il dipendente
      const { error } = await supabase
        .from('dipendenti')
        .delete()
        .eq('id', dipendente.id);

      if (error) throw error;

      toast.success('Dipendente eliminato con successo');
      router.push('/dipendenti');
    } catch {
      toast.error('Errore durante l\'eliminazione del dipendente');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const buildResidenza = () => {
    if (!dipendente) return '';
    const parts = [];
    if (dipendente.residenza_via) {
      let via = dipendente.residenza_via;
      if (dipendente.residenza_civico) {
        via += ` ${dipendente.residenza_civico}`;
      }
      parts.push(via);
    }
    if (dipendente.residenza_cap && dipendente.residenza_citta) {
      parts.push(`${dipendente.residenza_cap} ${dipendente.residenza_citta}`);
    } else if (dipendente.residenza_citta) {
      parts.push(dipendente.residenza_citta);
    }
    if (dipendente.residenza_provincia) parts.push(dipendente.residenza_provincia);
    if (dipendente.residenza_nazione && dipendente.residenza_nazione !== 'Italia') {
      parts.push(dipendente.residenza_nazione);
    }
    return parts.join(', ');
  };

  const buildDomicilio = () => {
    if (!dipendente || !dipendente.domicilio_diverso) return '';
    const parts = [];
    if (dipendente.domicilio_via) {
      let via = dipendente.domicilio_via;
      if (dipendente.domicilio_civico) {
        via += ` ${dipendente.domicilio_civico}`;
      }
      parts.push(via);
    }
    if (dipendente.domicilio_cap && dipendente.domicilio_citta) {
      parts.push(`${dipendente.domicilio_cap} ${dipendente.domicilio_citta}`);
    } else if (dipendente.domicilio_citta) {
      parts.push(dipendente.domicilio_citta);
    }
    if (dipendente.domicilio_provincia) parts.push(dipendente.domicilio_provincia);
    if (dipendente.domicilio_nazione && dipendente.domicilio_nazione !== 'Italia') {
      parts.push(dipendente.domicilio_nazione);
    }
    return parts.join(', ');
  };

  const getStatoBadgeColor = (stato: string) => {
    switch (stato) {
      case 'attivo': return 'bg-green-100 text-green-700 border-green-200';
      case 'sospeso': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'licenziato': return 'bg-red-100 text-red-700 border-red-200';
      case 'pensionato': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getInitials = () => {
    if (!dipendente) return '';
    const nome = dipendente.nome?.charAt(0).toUpperCase() || '';
    const cognome = dipendente.cognome?.charAt(0).toUpperCase() || '';
    return `${nome}${cognome}`;
  };

  const getAvatarUrl = () => {
    if (!dipendente?.avatar_url) return null;
    const supabase = createClient();
    const { data } = supabase.storage.from('app-storage').getPublicUrl(dipendente.avatar_url);
    return data.publicUrl;
  };

  // Section editing handlers
  const handleEditSection = (section: SectionKey) => {
    if (!dipendente) return;
    setEditingSection(section);
    setSectionErrors({});

    // Populate section data based on current dipendente
    switch (section) {
      case 'datiGenerali':
        setSectionData(prev => ({
          ...prev,
          datiGenerali: {
            nome: dipendente.nome || '',
            cognome: dipendente.cognome || '',
            codice_fiscale: dipendente.codice_fiscale || '',
            data_nascita: dipendente.data_nascita || '',
            luogo_nascita: dipendente.luogo_nascita || ''
          }
        }));
        break;
      case 'contatti':
        setSectionData(prev => ({
          ...prev,
          contatti: {
            email: dipendente.email || '',
            telefono: dipendente.telefono || '',
            pec: dipendente.pec || ''
          }
        }));
        break;
      case 'residenza':
        setSectionData(prev => ({
          ...prev,
          residenza: {
            residenza_via: dipendente.residenza_via || '',
            residenza_civico: dipendente.residenza_civico || '',
            residenza_cap: dipendente.residenza_cap || '',
            residenza_citta: dipendente.residenza_citta || '',
            residenza_provincia: dipendente.residenza_provincia || '',
            residenza_nazione: dipendente.residenza_nazione || 'Italia'
          }
        }));
        break;
      case 'domicilio':
        setSectionData(prev => ({
          ...prev,
          domicilio: {
            domicilio_diverso: dipendente.domicilio_diverso || false,
            domicilio_via: dipendente.domicilio_via || '',
            domicilio_civico: dipendente.domicilio_civico || '',
            domicilio_cap: dipendente.domicilio_cap || '',
            domicilio_citta: dipendente.domicilio_citta || '',
            domicilio_provincia: dipendente.domicilio_provincia || '',
            domicilio_nazione: dipendente.domicilio_nazione || 'Italia'
          }
        }));
        break;
      case 'professionali':
        setSectionData(prev => ({
          ...prev,
          professionali: {
            matricola: dipendente.matricola || '',
            qualifica: dipendente.qualifica || '',
            mansione: dipendente.mansione || '',
            livello: dipendente.livello || '',
            ccnl: dipendente.ccnl || ''
          }
        }));
        break;
      case 'badge':
        setSectionData(prev => ({
          ...prev,
          badge: {
            badge_numero: dipendente.badge_numero || '',
            turno_default: dipendente.turno_default || ''
          }
        }));
        break;
      case 'patenti':
        setSectionData(prev => ({
          ...prev,
          patenti: {
            patente_guida: dipendente.patente_guida && dipendente.patente_guida.length > 0
              ? dipendente.patente_guida
              : [''],
            patentini: dipendente.patentini && dipendente.patentini.length > 0
              ? dipendente.patentini
              : ['']
          }
        }));
        break;
      case 'contratto':
        setSectionData(prev => ({
          ...prev,
          contratto: {
            tipo_contratto: dipendente.tipo_contratto || '',
            data_assunzione: dipendente.data_assunzione || '',
            data_fine_contratto: dipendente.data_fine_contratto || '',
            stato: dipendente.stato || ''
          }
        }));
        break;
      case 'orario':
        setSectionData(prev => ({
          ...prev,
          orario: {
            ore_settimanali: dipendente.ore_settimanali || 40,
            part_time: dipendente.part_time || false,
            percentuale_part_time: dipendente.percentuale_part_time || null
          }
        }));
        break;
      case 'retribuzione':
        setSectionData(prev => ({
          ...prev,
          retribuzione: {
            retribuzione_lorda_mensile: dipendente.retribuzione_lorda_mensile || null,
            retribuzione_lorda_annua: dipendente.retribuzione_lorda_annua || null,
            superminimo: dipendente.superminimo || null
          }
        }));
        break;
      case 'bancari':
        setSectionData(prev => ({
          ...prev,
          bancari: {
            iban: dipendente.iban || '',
            intestatario_iban: dipendente.intestatario_iban || ''
          }
        }));
        break;
      case 'note':
        setSectionData(prev => ({
          ...prev,
          note: {
            note_interne: dipendente.note_interne || ''
          }
        }));
        break;
    }
  };

  const handleCancelSection = () => {
    setEditingSection(null);
    setSectionErrors({});
  };

  const updateSectionData = (section: SectionKey, field: string, value: string | number | boolean | string[] | null) => {
    setSectionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveSection = async (section: SectionKey) => {
    if (!dipendente) return;

    // Validate required fields
    const errors: Record<string, boolean> = {};

    if (section === 'datiGenerali') {
      if (!sectionData.datiGenerali.nome) errors.nome = true;
      if (!sectionData.datiGenerali.cognome) errors.cognome = true;
    }

    if (Object.keys(errors).length > 0) {
      setSectionErrors(errors);
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    try {
      setSavingSection(true);
      const supabase = createClient();

      // Build update object based on section
      let updateData: Partial<Dipendente> = {};

      switch (section) {
        case 'datiGenerali':
          updateData = {
            nome: sectionData.datiGenerali.nome as string,
            cognome: sectionData.datiGenerali.cognome as string,
            codice_fiscale: (sectionData.datiGenerali.codice_fiscale as string) || undefined,
            data_nascita: (sectionData.datiGenerali.data_nascita as string) || undefined,
            luogo_nascita: (sectionData.datiGenerali.luogo_nascita as string) || undefined
          };
          break;
        case 'contatti':
          updateData = {
            email: (sectionData.contatti.email as string) || undefined,
            telefono: (sectionData.contatti.telefono as string) || undefined,
            pec: (sectionData.contatti.pec as string) || undefined
          };
          break;
        case 'residenza':
          updateData = {
            residenza_via: (sectionData.residenza.residenza_via as string) || undefined,
            residenza_civico: (sectionData.residenza.residenza_civico as string) || undefined,
            residenza_cap: (sectionData.residenza.residenza_cap as string) || undefined,
            residenza_citta: (sectionData.residenza.residenza_citta as string) || undefined,
            residenza_provincia: (sectionData.residenza.residenza_provincia as string) || undefined,
            residenza_nazione: (sectionData.residenza.residenza_nazione as string) || undefined
          };
          break;
        case 'domicilio':
          updateData = {
            domicilio_diverso: sectionData.domicilio.domicilio_diverso as boolean,
            domicilio_via: (sectionData.domicilio.domicilio_via as string) || undefined,
            domicilio_civico: (sectionData.domicilio.domicilio_civico as string) || undefined,
            domicilio_cap: (sectionData.domicilio.domicilio_cap as string) || undefined,
            domicilio_citta: (sectionData.domicilio.domicilio_citta as string) || undefined,
            domicilio_provincia: (sectionData.domicilio.domicilio_provincia as string) || undefined,
            domicilio_nazione: (sectionData.domicilio.domicilio_nazione as string) || undefined
          };
          break;
        case 'professionali':
          updateData = {
            matricola: (sectionData.professionali.matricola as string) || undefined,
            qualifica: (sectionData.professionali.qualifica as string) || undefined,
            mansione: (sectionData.professionali.mansione as string) || undefined,
            livello: (sectionData.professionali.livello as string) || undefined,
            ccnl: (sectionData.professionali.ccnl as string) || undefined
          };
          break;
        case 'badge':
          updateData = {
            badge_numero: (sectionData.badge.badge_numero as string) || undefined,
            turno_default: (sectionData.badge.turno_default as string) || undefined
          };
          break;
        case 'patenti':
          const patentiFiltered = (sectionData.patenti.patente_guida as string[]).filter(p => p.trim() !== '');
          const patentiniFiltered = (sectionData.patenti.patentini as string[]).filter(p => p.trim() !== '');
          updateData = {
            patente_guida: patentiFiltered.length > 0 ? patentiFiltered : null,
            patentini: patentiniFiltered.length > 0 ? patentiniFiltered : null
          };
          break;
        case 'contratto':
          updateData = {
            tipo_contratto: (sectionData.contratto.tipo_contratto as string) || undefined,
            data_assunzione: (sectionData.contratto.data_assunzione as string) || undefined,
            data_fine_contratto: (sectionData.contratto.data_fine_contratto as string) || undefined,
            stato: (sectionData.contratto.stato as string) || 'attivo'
          };
          break;
        case 'orario':
          updateData = {
            ore_settimanali: sectionData.orario.ore_settimanali as number,
            part_time: sectionData.orario.part_time as boolean,
            percentuale_part_time: (sectionData.orario.percentuale_part_time as number) || undefined
          };
          break;
        case 'retribuzione':
          updateData = {
            retribuzione_lorda_mensile: (sectionData.retribuzione.retribuzione_lorda_mensile as number) || undefined,
            retribuzione_lorda_annua: (sectionData.retribuzione.retribuzione_lorda_annua as number) || undefined,
            superminimo: (sectionData.retribuzione.superminimo as number) || undefined
          };
          break;
        case 'bancari':
          updateData = {
            iban: (sectionData.bancari.iban as string) || undefined,
            intestatario_iban: (sectionData.bancari.intestatario_iban as string) || undefined
          };
          break;
        case 'note':
          updateData = {
            note_interne: (sectionData.note.note_interne as string) || undefined
          };
          break;
      }

      const { data, error } = await supabase
        .from('dipendenti')
        .update(updateData)
        .eq('id', dipendente.id)
        .select()
        .single();

      if (error) throw error;

      setDipendente(data);
      setEditingSection(null);
      toast.success('Modifiche salvate con successo');
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error('Errore durante il salvataggio');
    } finally {
      setSavingSection(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!dipendente) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Dipendente non trovato</p>
        <Button onClick={() => router.push('/dipendenti')}>Torna ai dipendenti</Button>
      </div>
    );
  }

  const residenzaCompleto = buildResidenza();
  const domicilioCompleto = buildDomicilio();

  return (
    <div className="space-y-6">
      {/* Header Card con Avatar e Info */}
      <div className="rounded-xl border-2 border-border bg-card p-6">
        <div className="flex gap-6">
          {/* Avatar - left side inside card */}
          <div className="w-32 flex-shrink-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center">
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()!}
                  alt={`${dipendente.nome} ${dipendente.cognome}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-emerald-700 font-bold text-4xl">
                  {getInitials()}
                </span>
              )}
            </div>
          </div>

          {/* Info - right side */}
          <div className="flex-1 space-y-4">
            {/* Nome, Badge e Azioni */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Matricola: {dipendente.matricola || '—'}
                </div>
                <h1 className="text-2xl font-bold leading-tight">
                  {dipendente.cognome} {dipendente.nome}
                </h1>
                <p className="text-base text-muted-foreground mt-1">
                  {dipendente.qualifica || '—'}
                </p>
              </div>

              {/* Status Badge + Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border ${getStatoBadgeColor(dipendente.stato)}`}>
                  {dipendente.stato.charAt(0).toUpperCase() + dipendente.stato.slice(1)}
                </div>

                {dipendente.user_id && (
                  <div className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700 border border-blue-200">
                    Account Attivo
                  </div>
                )}

                <button
                  onClick={() => router.push(`/dipendenti/${slugOrId}/modifica`)}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                  title="Modifica dipendente"
                >
                  <Edit className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-red-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-all text-red-600"
                  title="Elimina dipendente"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Contatti veloci */}
            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {dipendente.email ? (
                  <a
                    href={`mailto:${dipendente.email}`}
                    className="hover:text-emerald-600 transition-colors"
                  >
                    {dipendente.email}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {dipendente.telefono ? (
                  <a
                    href={`tel:${dipendente.telefono}`}
                    className="hover:text-emerald-600 transition-colors"
                  >
                    {dipendente.telefono}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigazione */}
      <TabsFilter<TabValue>
        tabs={[
          { value: 'panoramica', label: 'Panoramica', icon: LayoutDashboard },
          { value: 'professionale', label: 'Dati Professionali', icon: Briefcase },
          { value: 'contratto', label: 'Contratto', icon: FileText },
          { value: 'retribuzione', label: 'Retribuzione', icon: Wallet },
          { value: 'documenti', label: 'Documenti', icon: FileText },
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

      {/* TAB: Dati Professionali */}
      {activeTab === 'professionale' && (
        <div className="space-y-6">
          {/* Qualifica e Mansione */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Qualifica e Mansione</h3>
                <p className="text-sm text-muted-foreground">Ruolo e inquadramento contrattuale</p>
              </div>
              {editingSection !== 'professionali' ? (
                <button
                  onClick={() => handleEditSection('professionali')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('professionali')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'professionali' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Matricola</p>
                  <p className="text-base font-semibold">{dipendente.matricola || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Qualifica</p>
                  <p className="text-base font-semibold">{dipendente.qualifica || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Mansione</p>
                  <p className="text-base font-semibold">{dipendente.mansione || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Livello Contrattuale</p>
                  <p className="text-base font-semibold">{dipendente.livello || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">CCNL</p>
                  <p className="text-base font-semibold">{dipendente.ccnl || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'professionali' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-matricola">Matricola</Label>
                  <Input
                    id="edit-matricola"
                    value={sectionData.professionali.matricola as string}
                    onChange={(e) => updateSectionData('professionali', 'matricola', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-qualifica">Qualifica</Label>
                  <Input
                    id="edit-qualifica"
                    value={sectionData.professionali.qualifica as string}
                    onChange={(e) => updateSectionData('professionali', 'qualifica', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mansione">Mansione</Label>
                  <Input
                    id="edit-mansione"
                    value={sectionData.professionali.mansione as string}
                    onChange={(e) => updateSectionData('professionali', 'mansione', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-livello">Livello Contrattuale</Label>
                  <Input
                    id="edit-livello"
                    value={sectionData.professionali.livello as string}
                    onChange={(e) => updateSectionData('professionali', 'livello', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ccnl">CCNL</Label>
                  <Input
                    id="edit-ccnl"
                    value={sectionData.professionali.ccnl as string}
                    onChange={(e) => updateSectionData('professionali', 'ccnl', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Badge e Turno */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Badge e Turno</h3>
                <p className="text-sm text-muted-foreground">Badge identificativo e turno di lavoro</p>
              </div>
              {editingSection !== 'badge' ? (
                <button
                  onClick={() => handleEditSection('badge')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('badge')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'badge' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Numero Badge</p>
                  <p className="text-base font-semibold font-mono">{dipendente.badge_numero || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Turno Default</p>
                  <p className="text-base font-semibold">{dipendente.turno_default || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'badge' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-badge-numero">Numero Badge</Label>
                  <Input
                    id="edit-badge-numero"
                    value={sectionData.badge.badge_numero as string}
                    onChange={(e) => updateSectionData('badge', 'badge_numero', e.target.value)}
                    className="bg-white border border-input font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-turno">Turno Default</Label>
                  <Input
                    id="edit-turno"
                    value={sectionData.badge.turno_default as string}
                    onChange={(e) => updateSectionData('badge', 'turno_default', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Patenti e Abilitazioni */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Patenti e Abilitazioni</h3>
                <p className="text-sm text-muted-foreground">Patenti di guida e certificazioni professionali</p>
              </div>
              {editingSection !== 'patenti' ? (
                <button
                  onClick={() => handleEditSection('patenti')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('patenti')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'patenti' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Patenti di Guida</p>
                  {dipendente.patente_guida && dipendente.patente_guida.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dipendente.patente_guida.map((patente, idx) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                          {patente}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base font-semibold">—</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Patentini e Certificazioni</p>
                  {dipendente.patentini && dipendente.patentini.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dipendente.patentini.map((patentino, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {patentino}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-base font-semibold">—</p>
                  )}
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'patenti' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patenti di Guida */}
                <div className="space-y-2">
                  <Label>Patenti di Guida</Label>
                  <div className="space-y-2">
                    {(sectionData.patenti.patente_guida as string[]).map((patente, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={patente}
                          onChange={(e) => {
                            const newPatenti = [...(sectionData.patenti.patente_guida as string[])];
                            newPatenti[index] = e.target.value;
                            updateSectionData('patenti', 'patente_guida', newPatenti);
                          }}
                          className="bg-white border border-input"
                          placeholder="es. B, C, CE"
                        />
                        {(sectionData.patenti.patente_guida as string[]).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPatenti = (sectionData.patenti.patente_guida as string[]).filter((_, i) => i !== index);
                              updateSectionData('patenti', 'patente_guida', newPatenti);
                            }}
                            className="flex-shrink-0 h-9 w-9 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newPatenti = [...(sectionData.patenti.patente_guida as string[]), ''];
                        updateSectionData('patenti', 'patente_guida', newPatenti);
                      }}
                      className="w-full h-9 px-4 text-sm font-medium border-2 border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Aggiungi Patente
                    </button>
                  </div>
                </div>

                {/* Patentini e Certificazioni */}
                <div className="space-y-2">
                  <Label>Patentini e Certificazioni</Label>
                  <div className="space-y-2">
                    {(sectionData.patenti.patentini as string[]).map((patentino, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={patentino}
                          onChange={(e) => {
                            const newPatentini = [...(sectionData.patenti.patentini as string[])];
                            newPatentini[index] = e.target.value;
                            updateSectionData('patenti', 'patentini', newPatentini);
                          }}
                          className="bg-white border border-input"
                          placeholder="es. Muletto, Gru, Piattaforma"
                        />
                        {(sectionData.patenti.patentini as string[]).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPatentini = (sectionData.patenti.patentini as string[]).filter((_, i) => i !== index);
                              updateSectionData('patenti', 'patentini', newPatentini);
                            }}
                            className="flex-shrink-0 h-9 w-9 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const newPatentini = [...(sectionData.patenti.patentini as string[]), ''];
                        updateSectionData('patenti', 'patentini', newPatentini);
                      }}
                      className="w-full h-9 px-4 text-sm font-medium border-2 border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Aggiungi Patentino
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Contratto */}
      {activeTab === 'contratto' && (
        <div className="space-y-6">
          {/* Tipo di Contratto */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Dati Contrattuali</h3>
                <p className="text-sm text-muted-foreground">Tipologia contratto e date</p>
              </div>
              {editingSection !== 'contratto' ? (
                <button
                  onClick={() => handleEditSection('contratto')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('contratto')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'contratto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tipologia Contratto</p>
                  <p className="text-base font-semibold">{dipendente.tipo_contratto || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Stato</p>
                  <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium border ${getStatoBadgeColor(dipendente.stato)}`}>
                    {dipendente.stato.charAt(0).toUpperCase() + dipendente.stato.slice(1)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Data Assunzione</p>
                  <p className="text-base font-semibold">{formatDate(dipendente.data_assunzione)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Data Fine Contratto</p>
                  <p className="text-base font-semibold">{formatDate(dipendente.data_fine_contratto)}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'contratto' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-tipo-contratto">Tipologia Contratto</Label>
                  <Select
                    value={sectionData.contratto.tipo_contratto as string}
                    onValueChange={(value) => updateSectionData('contratto', 'tipo_contratto', value)}
                  >
                    <SelectTrigger id="edit-tipo-contratto" className="bg-white border border-input h-11">
                      <SelectValue placeholder="Seleziona tipo contratto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indeterminato">Indeterminato</SelectItem>
                      <SelectItem value="Determinato">Determinato</SelectItem>
                      <SelectItem value="Apprendistato">Apprendistato</SelectItem>
                      <SelectItem value="Collaborazione">Collaborazione</SelectItem>
                      <SelectItem value="Somministrazione">Somministrazione</SelectItem>
                      <SelectItem value="Tirocinio">Tirocinio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stato">Stato</Label>
                  <Select
                    value={sectionData.contratto.stato as string}
                    onValueChange={(value) => updateSectionData('contratto', 'stato', value)}
                  >
                    <SelectTrigger id="edit-stato" className="bg-white border border-input h-11">
                      <SelectValue placeholder="Seleziona stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attivo">Attivo</SelectItem>
                      <SelectItem value="sospeso">Sospeso</SelectItem>
                      <SelectItem value="licenziato">Licenziato</SelectItem>
                      <SelectItem value="pensionato">Pensionato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-data-assunzione">Data Assunzione</Label>
                  <Input
                    id="edit-data-assunzione"
                    type="date"
                    value={sectionData.contratto.data_assunzione as string}
                    onChange={(e) => updateSectionData('contratto', 'data_assunzione', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-data-fine-contratto">Data Fine Contratto</Label>
                  <Input
                    id="edit-data-fine-contratto"
                    type="date"
                    value={sectionData.contratto.data_fine_contratto as string}
                    onChange={(e) => updateSectionData('contratto', 'data_fine_contratto', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Orario di Lavoro */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Orario di Lavoro</h3>
                <p className="text-sm text-muted-foreground">Ore settimanali e modalità</p>
              </div>
              {editingSection !== 'orario' ? (
                <button
                  onClick={() => handleEditSection('orario')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('orario')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'orario' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Ore Settimanali</p>
                  <p className="text-base font-semibold">{dipendente.ore_settimanali || 40} ore</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Modalità</p>
                  <p className="text-base font-semibold">
                    {dipendente.part_time
                      ? `Part Time (${dipendente.percentuale_part_time}%)`
                      : 'Full Time'}
                  </p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'orario' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-ore-settimanali">Ore Settimanali</Label>
                  <Input
                    id="edit-ore-settimanali"
                    type="number"
                    min="1"
                    max="48"
                    value={sectionData.orario.ore_settimanali as number}
                    onChange={(e) => updateSectionData('orario', 'ore_settimanali', parseInt(e.target.value) || 40)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-part-time" className="flex items-center gap-2">
                    Part Time
                  </Label>
                  <Select
                    value={sectionData.orario.part_time ? 'true' : 'false'}
                    onValueChange={(value) => updateSectionData('orario', 'part_time', value === 'true')}
                  >
                    <SelectTrigger id="edit-part-time" className="bg-white border border-input h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Full Time</SelectItem>
                      <SelectItem value="true">Part Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sectionData.orario.part_time && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-percentuale-pt">Percentuale Part Time (%)</Label>
                    <Input
                      id="edit-percentuale-pt"
                      type="number"
                      min="1"
                      max="99"
                      value={sectionData.orario.percentuale_part_time as number || ''}
                      onChange={(e) => updateSectionData('orario', 'percentuale_part_time', parseInt(e.target.value) || null)}
                      className="bg-white border border-input"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Retribuzione */}
      {activeTab === 'retribuzione' && (
        <div className="space-y-6">
          {/* Retribuzione */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Dati Retributivi</h3>
                <p className="text-sm text-muted-foreground">Retribuzione lorda e superminimo</p>
              </div>
              {editingSection !== 'retribuzione' ? (
                <button
                  onClick={() => handleEditSection('retribuzione')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('retribuzione')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'retribuzione' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Retribuzione Lorda Mensile</p>
                  <p className="text-xl font-bold">{formatCurrency(dipendente.retribuzione_lorda_mensile)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Retribuzione Lorda Annua</p>
                  <p className="text-xl font-bold">{formatCurrency(dipendente.retribuzione_lorda_annua)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Superminimo</p>
                  <p className="text-base font-semibold">{formatCurrency(dipendente.superminimo)}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'retribuzione' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-ral-mensile">Retribuzione Lorda Mensile (€)</Label>
                  <Input
                    id="edit-ral-mensile"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sectionData.retribuzione.retribuzione_lorda_mensile as number || ''}
                    onChange={(e) => updateSectionData('retribuzione', 'retribuzione_lorda_mensile', parseFloat(e.target.value) || null)}
                    className="bg-white border border-input"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-ral-annua">Retribuzione Lorda Annua (€)</Label>
                  <Input
                    id="edit-ral-annua"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sectionData.retribuzione.retribuzione_lorda_annua as number || ''}
                    onChange={(e) => updateSectionData('retribuzione', 'retribuzione_lorda_annua', parseFloat(e.target.value) || null)}
                    className="bg-white border border-input"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-superminimo">Superminimo (€)</Label>
                  <Input
                    id="edit-superminimo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sectionData.retribuzione.superminimo as number || ''}
                    onChange={(e) => updateSectionData('retribuzione', 'superminimo', parseFloat(e.target.value) || null)}
                    className="bg-white border border-input"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Dati Bancari */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Dati Bancari</h3>
                <p className="text-sm text-muted-foreground">IBAN e intestatario</p>
              </div>
              {editingSection !== 'bancari' ? (
                <button
                  onClick={() => handleEditSection('bancari')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('bancari')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'bancari' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">IBAN</p>
                  <p className="text-base font-semibold font-mono break-all">{dipendente.iban || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Intestatario</p>
                  <p className="text-base font-semibold">{dipendente.intestatario_iban || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'bancari' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-iban">IBAN</Label>
                  <Input
                    id="edit-iban"
                    value={sectionData.bancari.iban as string}
                    onChange={(e) => updateSectionData('bancari', 'iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                    className="bg-white border border-input font-mono"
                    placeholder="IT00A0000000000000000000000"
                    maxLength={27}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-intestatario">Intestatario IBAN</Label>
                  <Input
                    id="edit-intestatario"
                    value={sectionData.bancari.intestatario_iban as string}
                    onChange={(e) => updateSectionData('bancari', 'intestatario_iban', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Documenti */}
      {activeTab === 'documenti' && (
        <div className="space-y-6">
          {/* Note Interne */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Note Interne</h3>
                <p className="text-sm text-muted-foreground">Annotazioni e informazioni aggiuntive</p>
              </div>
              {editingSection !== 'note' ? (
                <button
                  onClick={() => handleEditSection('note')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('note')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'note' && (
              <div>
                {dipendente.note_interne ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{dipendente.note_interne}</p>
                ) : (
                  <p className="text-muted-foreground">Nessuna nota inserita</p>
                )}
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'note' && (
              <div className="space-y-2">
                <Label htmlFor="edit-note">Note Interne</Label>
                <Textarea
                  id="edit-note"
                  value={sectionData.note.note_interne as string}
                  onChange={(e) => updateSectionData('note', 'note_interne', e.target.value)}
                  className="bg-white border border-input min-h-[200px]"
                  placeholder="Inserisci annotazioni o informazioni aggiuntive..."
                />
              </div>
            )}
          </div>

          {/* Gestione Documenti */}
          <div className="p-6 rounded-xl bg-card shadow-sm">
            <GestioneDocumentiSection dipendenteId={dipendente.id} />
          </div>
        </div>
      )}

      {/* TAB: Dettagli */}
      {activeTab === 'dettagli' && dipendente && (
        <div className="space-y-6">
          {/* 1. DATI GENERALI */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Dati Generali</h3>
                <p className="text-sm text-muted-foreground">Informazioni anagrafiche principali</p>
              </div>
              {editingSection !== 'datiGenerali' ? (
                <button
                  onClick={() => handleEditSection('datiGenerali')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('datiGenerali')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'datiGenerali' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="text-base font-semibold">{dipendente.nome || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cognome</p>
                  <p className="text-base font-semibold">{dipendente.cognome || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Codice Fiscale</p>
                  <p className="text-base font-semibold font-mono">{dipendente.codice_fiscale || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Data di Nascita</p>
                  <p className="text-base font-semibold">{formatDate(dipendente.data_nascita)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Luogo di Nascita</p>
                  <p className="text-base font-semibold">{dipendente.luogo_nascita || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'datiGenerali' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-nome"
                    value={sectionData.datiGenerali.nome as string}
                    onChange={(e) => updateSectionData('datiGenerali', 'nome', e.target.value)}
                    className={`bg-white border border-input ${sectionErrors.nome ? '!border-red-500' : ''}`}
                  />
                  {sectionErrors.nome && (
                    <p className="text-sm text-red-500 font-medium">Il nome è obbligatorio</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cognome">Cognome <span className="text-destructive">*</span></Label>
                  <Input
                    id="edit-cognome"
                    value={sectionData.datiGenerali.cognome as string}
                    onChange={(e) => updateSectionData('datiGenerali', 'cognome', e.target.value)}
                    className={`bg-white border border-input ${sectionErrors.cognome ? '!border-red-500' : ''}`}
                  />
                  {sectionErrors.cognome && (
                    <p className="text-sm text-red-500 font-medium">Il cognome è obbligatorio</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cf">Codice Fiscale</Label>
                  <Input
                    id="edit-cf"
                    value={sectionData.datiGenerali.codice_fiscale as string}
                    onChange={(e) => updateSectionData('datiGenerali', 'codice_fiscale', e.target.value.toUpperCase())}
                    className="bg-white border border-input font-mono"
                    maxLength={16}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-data-nascita">Data di Nascita</Label>
                  <Input
                    id="edit-data-nascita"
                    type="date"
                    value={sectionData.datiGenerali.data_nascita as string}
                    onChange={(e) => updateSectionData('datiGenerali', 'data_nascita', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-luogo-nascita">Luogo di Nascita</Label>
                  <Input
                    id="edit-luogo-nascita"
                    value={sectionData.datiGenerali.luogo_nascita as string}
                    onChange={(e) => updateSectionData('datiGenerali', 'luogo_nascita', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. CONTATTI */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Contatti</h3>
                <p className="text-sm text-muted-foreground">Email, telefono e PEC</p>
              </div>
              {editingSection !== 'contatti' ? (
                <button
                  onClick={() => handleEditSection('contatti')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('contatti')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'contatti' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-base font-semibold">{dipendente.email || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="text-base font-semibold">{dipendente.telefono || '—'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">PEC</p>
                  <p className="text-base font-semibold">{dipendente.pec || '—'}</p>
                </div>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'contatti' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={sectionData.contatti.email as string}
                    onChange={(e) => updateSectionData('contatti', 'email', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-telefono">Telefono</Label>
                  <Input
                    id="edit-telefono"
                    type="tel"
                    value={sectionData.contatti.telefono as string}
                    onChange={(e) => updateSectionData('contatti', 'telefono', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-pec">PEC</Label>
                  <Input
                    id="edit-pec"
                    type="email"
                    value={sectionData.contatti.pec as string}
                    onChange={(e) => updateSectionData('contatti', 'pec', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. RESIDENZA */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            {/* Header */}
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Residenza</h3>
                <p className="text-sm text-muted-foreground">Indirizzo di residenza</p>
              </div>
              {editingSection !== 'residenza' ? (
                <button
                  onClick={() => handleEditSection('residenza')}
                  disabled={editingSection !== null}
                  className="h-9 w-9 flex items-center justify-center bg-surface border border-border rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelSection}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium border-2 border-border rounded-lg hover:bg-accent transition-all disabled:opacity-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => handleSaveSection('residenza')}
                    disabled={savingSection}
                    className="h-9 px-4 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Salva
                  </button>
                </div>
              )}
            </div>

            {/* Content - VIEW MODE */}
            {editingSection !== 'residenza' && (
              <div>
                <p className="text-base font-semibold">{residenzaCompleto || 'Non specificata'}</p>
              </div>
            )}

            {/* Content - EDIT MODE */}
            {editingSection === 'residenza' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-res-via">Via</Label>
                  <Input
                    id="edit-res-via"
                    value={sectionData.residenza.residenza_via as string}
                    onChange={(e) => updateSectionData('residenza', 'residenza_via', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-res-civico">Numero Civico</Label>
                  <Input
                    id="edit-res-civico"
                    value={sectionData.residenza.residenza_civico as string}
                    onChange={(e) => updateSectionData('residenza', 'residenza_civico', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-res-cap">CAP</Label>
                  <Input
                    id="edit-res-cap"
                    value={sectionData.residenza.residenza_cap as string}
                    onChange={(e) => updateSectionData('residenza', 'residenza_cap', e.target.value)}
                    className="bg-white border border-input"
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-res-citta">Città</Label>
                  <Input
                    id="edit-res-citta"
                    value={sectionData.residenza.residenza_citta as string}
                    onChange={(e) => updateSectionData('residenza', 'residenza_citta', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-res-provincia">Provincia</Label>
                  <Input
                    id="edit-res-provincia"
                    value={sectionData.residenza.residenza_provincia as string}
                    onChange={(e) => updateSectionData('residenza', 'residenza_provincia', e.target.value.toUpperCase())}
                    className="bg-white border border-input"
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-res-nazione">Nazione</Label>
                  <Input
                    id="edit-res-nazione"
                    value={sectionData.residenza.residenza_nazione as string}
                    onChange={(e) => updateSectionData('residenza', 'residenza_nazione', e.target.value)}
                    className="bg-white border border-input"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Impostazioni */}
      {activeTab === 'impostazioni' && (
        <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
          <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Impostazioni dipendente in arrivo</p>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border-2 border-border max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-semibold">Conferma Eliminazione</h3>
            <p className="text-sm text-muted-foreground">
              Sei sicuro di voler eliminare il dipendente <strong>{dipendente.cognome} {dipendente.nome}</strong>?
              Questa azione non può essere annullata.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Annulla
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Elimina
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
