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
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Dipendente = {
  id: string;
  tenant_id: string;
  user_id?: string;

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

  const [loading, setLoading] = useState(true);
  const [dipendente, setDipendente] = useState<Dipendente | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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
      {/* Tabs Navigazione */}
      <Tabs defaultValue="panoramica" className="space-y-6">
        <TabsList className="w-full justify-between h-auto bg-transparent border-b border-border rounded-none p-0 gap-0">
          <TabsTrigger
            value="panoramica"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">Panoramica</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger
            value="professionale"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Dati Professionali</span>
            <span className="sm:hidden">Prof.</span>
          </TabsTrigger>
          <TabsTrigger
            value="contratto"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Contratto</span>
            <span className="sm:hidden">Contr.</span>
          </TabsTrigger>
          <TabsTrigger
            value="retribuzione"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Retribuzione</span>
            <span className="sm:hidden">Retrib.</span>
          </TabsTrigger>
          <TabsTrigger
            value="documenti"
            className="flex-1 gap-2 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=inactive]:text-muted-foreground rounded-none px-4 py-3 data-[state=active]:bg-transparent bg-transparent hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documenti</span>
            <span className="sm:hidden">Doc.</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: Panoramica */}
        <TabsContent value="panoramica" className="space-y-6">
          {/* Header Card unica con avatar a sinistra */}
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

          {/* Cards Grid - Dati Anagrafici */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dati Generali */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Dati Generali</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Codice Fiscale</p>
                  <p className="font-medium font-mono">{dipendente.codice_fiscale || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data di Nascita</p>
                  <p className="font-medium">{formatDate(dipendente.data_nascita)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Luogo di Nascita</p>
                  <p className="font-medium">{dipendente.luogo_nascita || '—'}</p>
                </div>
              </div>
            </div>

            {/* Contatti */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Mail className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Contatti</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Email Personale</p>
                  <p className="font-medium">{dipendente.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">{dipendente.telefono || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PEC</p>
                  <p className="font-medium">{dipendente.pec || '—'}</p>
                </div>
              </div>
            </div>

            {/* Residenza */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Residenza</h3>
              </div>

              <div>
                <p className="font-medium">{residenzaCompleto || 'Non specificata'}</p>
              </div>
            </div>

            {/* Domicilio */}
            {dipendente.domicilio_diverso && (
              <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Domicilio</h3>
                </div>

                <div>
                  <p className="font-medium">{domicilioCompleto || 'Non specificato'}</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB: Dati Professionali */}
        <TabsContent value="professionale" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Qualifica e Mansione */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Qualifica e Mansione</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Qualifica</p>
                  <p className="font-medium">{dipendente.qualifica || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mansione</p>
                  <p className="font-medium">{dipendente.mansione || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Livello Contrattuale</p>
                  <p className="font-medium">{dipendente.livello || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CCNL</p>
                  <p className="font-medium">{dipendente.ccnl || '—'}</p>
                </div>
              </div>
            </div>

            {/* Badge e Turno */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Badge e Turno</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Numero Badge</p>
                  <p className="font-medium font-mono">{dipendente.badge_numero || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Turno Default</p>
                  <p className="font-medium">{dipendente.turno_default || '—'}</p>
                </div>
              </div>
            </div>

            {/* Patenti e Abilitazioni */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Award className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Patenti e Abilitazioni</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Patenti di Guida</p>
                  {dipendente.patente_guida && dipendente.patente_guida.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dipendente.patente_guida.map((patente, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                          {patente}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nessuna patente registrata</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Patentini e Certificazioni</p>
                  {dipendente.patentini && dipendente.patentini.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dipendente.patentini.map((patentino, index) => (
                        <span key={index} className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                          {patentino}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nessun patentino registrato</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Contratto */}
        <TabsContent value="contratto" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tipo di Contratto */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Contratto</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Tipologia</p>
                  <p className="font-medium">{dipendente.tipo_contratto || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Assunzione</p>
                  <p className="font-medium">{formatDate(dipendente.data_assunzione)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Fine Contratto</p>
                  <p className="font-medium">{formatDate(dipendente.data_fine_contratto)}</p>
                </div>
              </div>
            </div>

            {/* Orario di Lavoro */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Orario di Lavoro</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Ore Settimanali</p>
                  <p className="font-medium">{dipendente.ore_settimanali || 40} ore</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modalità</p>
                  <p className="font-medium">
                    {dipendente.part_time
                      ? `Part Time (${dipendente.percentuale_part_time}%)`
                      : 'Full Time'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Retribuzione */}
        <TabsContent value="retribuzione" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Retribuzione */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Retribuzione</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Retribuzione Lorda Mensile</p>
                  <p className="font-bold text-xl">{formatCurrency(dipendente.retribuzione_lorda_mensile)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Retribuzione Lorda Annua</p>
                  <p className="font-bold text-xl">{formatCurrency(dipendente.retribuzione_lorda_annua)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Superminimo</p>
                  <p className="font-medium">{formatCurrency(dipendente.superminimo)}</p>
                </div>
              </div>
            </div>

            {/* Dati Bancari */}
            <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold">Dati Bancari</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">IBAN</p>
                  <p className="font-medium font-mono text-sm">{dipendente.iban || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Intestatario</p>
                  <p className="font-medium">{dipendente.intestatario_iban || '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Documenti */}
        <TabsContent value="documenti" className="space-y-6">
          <div className="rounded-xl border-2 border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">Note Interne</h3>
            </div>

            <div>
              {dipendente.note_interne ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{dipendente.note_interne}</p>
              ) : (
                <p className="text-muted-foreground">Nessuna nota inserita</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-border bg-card p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Gestione documenti in arrivo</p>
          </div>
        </TabsContent>

      </Tabs>

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
