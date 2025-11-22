'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, Plus, X, Crown, Shield, Eye, User, Briefcase, Wrench, HardHat, Truck, Settings, FileText, Users } from 'lucide-react';
import { AvatarInput } from '@/components/features/dipendenti/AvatarInput';

// Helper function to get role icon
const getRoleIcon = (systemRoleKey: string | null, iconName?: string | null) => {
  // If role has a custom icon, use it
  if (iconName) {
    switch (iconName) {
      case 'Crown':
        return Crown;
      case 'Shield':
        return Shield;
      case 'Eye':
        return Eye;
      case 'User':
        return User;
      case 'Users':
        return Users;
      case 'Briefcase':
        return Briefcase;
      case 'Wrench':
        return Wrench;
      case 'HardHat':
        return HardHat;
      case 'Truck':
        return Truck;
      case 'Settings':
        return Settings;
      case 'FileText':
        return FileText;
      default:
        return User;
    }
  }

  // Otherwise use system role icon
  switch (systemRoleKey) {
    case 'owner':
      return Crown;
    case 'admin':
      return Shield;
    case 'admin_readonly':
      return Eye;
    case 'dipendente':
      return User;
    default:
      return User; // Custom roles get User icon
  }
};

export default function NuovoDipendentePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);

  // Checkbox per creare account
  const [creaAccount, setCreaAccount] = useState(false);

  // ============================================================================
  // DATI ANAGRAFICI
  // ============================================================================
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [luogoNascita, setLuogoNascita] = useState('');

  // Contatti
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [pec, setPec] = useState('');

  // Residenza
  const [residenzaVia, setResidenzaVia] = useState('');
  const [residenzaCivico, setResidenzaCivico] = useState('');
  const [residenzaCap, setResidenzaCap] = useState('');
  const [residenzaCitta, setResidenzaCitta] = useState('');
  const [residenzaProvincia, setResidenzaProvincia] = useState('');
  const [residenzaNazione, setResidenzaNazione] = useState('Italia');

  // Domicilio
  const [domicilioDiverso, setDomicilioDiverso] = useState(false);
  const [domicilioVia, setDomicilioVia] = useState('');
  const [domicilioCivico, setDomicilioCivico] = useState('');
  const [domicilioCap, setDomicilioCap] = useState('');
  const [domicilioCitta, setDomicilioCitta] = useState('');
  const [domicilioProvincia, setDomicilioProvincia] = useState('');
  const [domicilioNazione, setDomicilioNazione] = useState('Italia');

  // ============================================================================
  // DATI PROFESSIONALI
  // ============================================================================
  const [matricola, setMatricola] = useState('');
  const [qualifica, setQualifica] = useState('');
  const [mansione, setMansione] = useState('');
  const [livello, setLivello] = useState('');
  const [ccnl, setCcnl] = useState('');

  // Badge e turno
  const [badgeNumero, setBadgeNumero] = useState('');
  const [turnoDefault, setTurnoDefault] = useState('');

  // Patenti e abilitazioni - ARRAYS
  const [patentiGuida, setPatentiGuida] = useState<string[]>(['']);
  const [patentiniCert, setPatentiniCert] = useState<string[]>(['']);

  // ============================================================================
  // DATI CONTRATTUALI
  // ============================================================================
  const [dataAssunzione, setDataAssunzione] = useState('');
  const [dataFineContratto, setDataFineContratto] = useState('');
  const [tipoContratto, setTipoContratto] = useState('');

  // Orario
  const [oreSettimanali, setOreSettimanali] = useState('40');
  const [partTime, setPartTime] = useState(false);
  const [percentualePartTime, setPercentualePartTime] = useState('');

  // ============================================================================
  // DATI RETRIBUTIVI
  // ============================================================================
  const [retribuzioneLordaMensile, setRetribuzioneLordaMensile] = useState('');
  const [retribuzioneLordaAnnua, setRetribuzioneLordaAnnua] = useState('');
  const [superminimo, setSuperminimo] = useState('');

  // Dati bancari
  const [iban, setIban] = useState('');
  const [intestatarioIban, setIntestatarioIban] = useState('');

  // ============================================================================
  // DOCUMENTI E NOTE
  // ============================================================================
  const [noteInterne, setNoteInterne] = useState('');

  // ============================================================================
  // DATI ACCOUNT (se creaAccount = true)
  // ============================================================================
  const [accountRole, setAccountRole] = useState('');
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);

  // Stato
  const [stato, setStato] = useState('attivo');

  // Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    loadTenantId();
    loadRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTenantId = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenants) {
        setTenantId(userTenants.tenant_id);
      }
    } catch {
      // Error handled
    }
  };

  const loadRoles = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const currentUserTenant = tenants && tenants.length > 0 ? tenants[0] : null;
      if (!currentUserTenant) return;

      // Carica tutti i ruoli del tenant (escluso owner)
      const { data: allRolesData, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('tenant_id', currentUserTenant.tenant_id)
        .order('is_system_role', { ascending: false })
        .order('name');

      if (error) return;

      // Filtra manualmente per escludere owner (neq non funziona con NULL)
      const roles = allRolesData?.filter(r => r.system_role_key !== 'owner') || [];

      if (roles && roles.length > 0) {
        setAvailableRoles(roles);
      }
    } catch {
      // Error handled silently
    }
  };

  // Total steps: sempre 6 (step 5 = Documenti & Note, step 6 = Account opzionale)
  const totalSteps = 6;

  // Validate current step
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      // Step 1: nome, cognome ed email obbligatori
      if (!nome || !cognome) {
        toast.error('Nome e Cognome sono obbligatori');
        return false;
      }
      if (!email) {
        toast.error('Email è obbligatoria');
        return false;
      }
    }
    // Steps 2-5: no required fields
    // Step 6 (account): validate if creaAccount is true
    if (step === 6 && creaAccount) {
      if (!email) {
        toast.error('Email è obbligatoria per creare l\'account. Inseriscila nei Dati Anagrafici.');
        return false;
      }
      if (!accountRole) {
        toast.error('Seleziona un ruolo per l\'account');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Impedisci submit se non siamo all'ultimo step
    if (currentStep < totalSteps) {
      return;
    }

    // Final validation
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (!tenantId) {
        toast.error('Errore: Tenant ID non trovato');
        return;
      }

      let userId = null;

      // Step 1: Se checkbox attivo, crea prima l'utente tramite invito email
      if (creaAccount) {
        // Call the API to create user with invite
        const createUserResponse = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email,
            first_name: nome,
            last_name: cognome,
            custom_role_id: accountRole, // Pass the role ID
            send_invite: true,
          }),
        });

        if (!createUserResponse.ok) {
          const error = await createUserResponse.json();
          toast.error(`Errore creazione account: ${error.error || 'Errore sconosciuto'}`);
          return;
        }

        const createUserResult = await createUserResponse.json();
        userId = createUserResult.user?.id || null;

        if (!userId) {
          toast.error('Errore: ID utente non ricevuto');
          return;
        }
      }

      // Step 2: Crea il dipendente
      // Filter empty strings from patenti arrays
      const patentiGuidaFiltered = patentiGuida.filter(p => p.trim() !== '');
      const patentiniCertFiltered = patentiniCert.filter(p => p.trim() !== '');

      const dipendenteData = {
        tenant_id: tenantId,
        user_id: userId,

        // Dati anagrafici
        nome,
        cognome,
        codice_fiscale: codiceFiscale || null,
        data_nascita: dataNascita || null,
        luogo_nascita: luogoNascita || null,

        // Contatti
        telefono: telefono || null,
        email: email || null,
        pec: pec || null,

        // Residenza
        residenza_via: residenzaVia || null,
        residenza_civico: residenzaCivico || null,
        residenza_cap: residenzaCap || null,
        residenza_citta: residenzaCitta || null,
        residenza_provincia: residenzaProvincia || null,
        residenza_nazione: residenzaNazione || null,

        // Domicilio
        domicilio_diverso: domicilioDiverso,
        domicilio_via: domicilioDiverso ? (domicilioVia || null) : null,
        domicilio_civico: domicilioDiverso ? (domicilioCivico || null) : null,
        domicilio_cap: domicilioDiverso ? (domicilioCap || null) : null,
        domicilio_citta: domicilioDiverso ? (domicilioCitta || null) : null,
        domicilio_provincia: domicilioDiverso ? (domicilioProvincia || null) : null,
        domicilio_nazione: domicilioDiverso ? (domicilioNazione || null) : null,

        // Dati professionali
        matricola: matricola || null,
        qualifica: qualifica || null,
        mansione: mansione || null,
        livello: livello || null,
        ccnl: ccnl || null,

        // Badge e turno
        badge_numero: badgeNumero || null,
        turno_default: turnoDefault || null,

        // Patenti
        patente_guida: patentiGuidaFiltered.length > 0 ? patentiGuidaFiltered : null,
        patentini: patentiniCertFiltered.length > 0 ? patentiniCertFiltered : null,

        // Dati contrattuali
        data_assunzione: dataAssunzione || null,
        data_fine_contratto: dataFineContratto || null,
        tipo_contratto: tipoContratto || null,

        // Orario
        ore_settimanali: oreSettimanali ? parseFloat(oreSettimanali) : 40,
        part_time: partTime,
        percentuale_part_time: partTime && percentualePartTime ? parseInt(percentualePartTime) : null,

        // Dati retributivi
        retribuzione_lorda_mensile: retribuzioneLordaMensile ? parseFloat(retribuzioneLordaMensile) : null,
        retribuzione_lorda_annua: retribuzioneLordaAnnua ? parseFloat(retribuzioneLordaAnnua) : null,
        superminimo: superminimo ? parseFloat(superminimo) : null,

        // Dati bancari
        iban: iban || null,
        intestatario_iban: intestatarioIban || null,

        // Note
        note_interne: noteInterne || null,

        // Stato
        stato,
      };

      // Insert dipendente and get the created record
      const { data: createdDipendente, error } = await supabase
        .from('dipendenti')
        .insert([dipendenteData])
        .select()
        .single();

      if (error) throw error;

      // Upload avatar if present
      if (avatarFile && createdDipendente) {
        try {
          const { uploadDipendenteAvatar } = await import('@/lib/utils/image-upload');
          const avatarPath = await uploadDipendenteAvatar(avatarFile, tenantId, createdDipendente.id);

          // Update dipendente with avatar_url
          await supabase
            .from('dipendenti')
            .update({ avatar_url: avatarPath })
            .eq('id', createdDipendente.id);
        } catch (avatarError) {
          console.error('Error uploading avatar:', avatarError);
          // Don't fail the entire operation if avatar upload fails
          toast.warning('Dipendente creato ma errore nel caricamento dell\'avatar');
        }
      }

      toast.success('Dipendente creato con successo');
      router.push('/dipendenti');
    } catch (error: unknown) {
      console.error(error);
      toast.error('Errore durante la creazione del dipendente');
    } finally {
      setLoading(false);
    }
  };

  // Patenti handlers
  const addPatenteGuida = () => {
    setPatentiGuida([...patentiGuida, '']);
  };

  const removePatenteGuida = (index: number) => {
    if (patentiGuida.length > 1) {
      setPatentiGuida(patentiGuida.filter((_, i) => i !== index));
    }
  };

  const updatePatenteGuida = (index: number, value: string) => {
    const newPatenti = [...patentiGuida];
    newPatenti[index] = value;
    setPatentiGuida(newPatenti);
  };

  const addPatentino = () => {
    setPatentiniCert([...patentiniCert, '']);
  };

  const removePatentino = (index: number) => {
    if (patentiniCert.length > 1) {
      setPatentiniCert(patentiniCert.filter((_, i) => i !== index));
    }
  };

  const updatePatentino = (index: number, value: string) => {
    const newPatentini = [...patentiniCert];
    newPatentini[index] = value;
    setPatentiniCert(newPatentini);
  };

  // Step names - sempre tutti e 6 gli step
  const stepNames = [
    'Dati Anagrafici',
    'Dati Professionali',
    'Dati Contrattuali',
    'Dati Retributivi',
    'Documenti & Note',
    'Account'
  ];

  // Steps visibili nella progress bar (solo se Account è attivo)
  const visibleSteps = creaAccount ? stepNames : stepNames.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Checkbox Crea Account */}
      <div className="rounded-lg border-2 border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <Checkbox
            id="creaAccount"
            checked={creaAccount}
            onCheckedChange={(checked) => {
              setCreaAccount(checked as boolean);
              // If unchecking and on step 6, go back to step 5
              if (!checked && currentStep === 6) {
                setCurrentStep(5);
              }
            }}
            className="mt-1 h-6 w-6 cursor-pointer data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
          />
          <div className="flex-1 space-y-1">
            <Label
              htmlFor="creaAccount"
              className="text-base font-semibold leading-tight cursor-pointer block"
            >
              Crea anche account per accedere alla piattaforma
            </Label>
            <p className="text-sm text-muted-foreground">
              Verrà creato un utente che potrà accedere con email e password. I dipendenti accederanno tramite app mobile, gli altri ruoli tramite web.
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="relative mb-4">
          <div className="flex items-center">
            {visibleSteps.map((name, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;

              return (
                <div key={stepNumber} className="flex flex-col items-center flex-1 z-10 bg-card">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-600 border-2 border-emerald-600'
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                    }`}
                  >
                    {stepNumber}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center px-1 ${
                      isActive ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Linea di sfondo */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 mx-12" style={{ zIndex: 0 }}>
            {/* Linea di progresso */}
            <div
              className="h-full bg-emerald-600 transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (visibleSteps.length - 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Previeni submit con Enter se non siamo all'ultimo step
          if (e.key === 'Enter' && currentStep < totalSteps) {
            e.preventDefault();
          }
        }}
        className="space-y-6"
      >
        {/* STEP 1: ANAGRAFICA */}
        {currentStep === 1 && (
          <div className="space-y-8">
            {/* Dati Generali + Avatar side by side */}
            <div className="flex gap-4">
              {/* Avatar - left card */}
              <div className="w-56 rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                  <h3 className="text-lg font-bold">Avatar</h3>
                </div>
                <div className="flex items-center justify-center">
                  <AvatarInput
                    nome={nome}
                    cognome={cognome}
                    onFileChange={(file) => setAvatarFile(file)}
                  />
                </div>
              </div>

              {/* Dati Generali - right card */}
              <div className="flex-1 rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                  <h3 className="text-lg font-bold">Dati Generali</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome <span className="text-red-500">*</span></Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Mario"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome <span className="text-red-500">*</span></Label>
                  <Input
                    id="cognome"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Rossi"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
                  <Input
                    id="codice_fiscale"
                    value={codiceFiscale}
                    onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase())}
                    className="border-2 border-border bg-card"
                    placeholder="RSSMRA80A01H501U"
                    maxLength={16}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_nascita">Data di Nascita</Label>
                  <Input
                    id="data_nascita"
                    type="date"
                    value={dataNascita}
                    onChange={(e) => setDataNascita(e.target.value)}
                    className="border-2 border-border bg-card"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="luogo_nascita">Luogo di Nascita</Label>
                  <Input
                    id="luogo_nascita"
                    value={luogoNascita}
                    onChange={(e) => setLuogoNascita(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Napoli"
                  />
                </div>
                </div>
              </div>
            </div>

            {/* Contatti */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Contatti</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="+39 081 1234567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Personale <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="mario.rossi@email.it"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="pec">PEC</Label>
                  <Input
                    id="pec"
                    type="email"
                    value={pec}
                    onChange={(e) => setPec(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="mario.rossi@pec.it"
                  />
                </div>
              </div>
            </div>

            {/* Residenza */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Indirizzo di Residenza</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="residenza_via">Via</Label>
                  <Input
                    id="residenza_via"
                    value={residenzaVia}
                    onChange={(e) => setResidenzaVia(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Via Roma"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residenza_civico">Civico</Label>
                  <Input
                    id="residenza_civico"
                    value={residenzaCivico}
                    onChange={(e) => setResidenzaCivico(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="123"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residenza_cap">CAP</Label>
                  <Input
                    id="residenza_cap"
                    value={residenzaCap}
                    onChange={(e) => setResidenzaCap(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="80100"
                    maxLength={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residenza_citta">Città</Label>
                  <Input
                    id="residenza_citta"
                    value={residenzaCitta}
                    onChange={(e) => setResidenzaCitta(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Napoli"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residenza_provincia">Provincia</Label>
                  <Input
                    id="residenza_provincia"
                    value={residenzaProvincia}
                    onChange={(e) => setResidenzaProvincia(e.target.value.toUpperCase())}
                    className="border-2 border-border bg-card"
                    placeholder="NA"
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residenza_nazione">Nazione</Label>
                  <Input
                    id="residenza_nazione"
                    value={residenzaNazione}
                    onChange={(e) => setResidenzaNazione(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Italia"
                  />
                </div>
              </div>
            </div>

            {/* Domicilio */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                  <h3 className="text-lg font-bold">Indirizzo di Domicilio</h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={domicilioDiverso}
                    onCheckedChange={(checked) => setDomicilioDiverso(checked as boolean)}
                  />
                  <span className="text-sm font-medium">Il domicilio è diverso</span>
                </label>
              </div>
              <div className="h-px bg-border" />

              {domicilioDiverso && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="domicilio_via">Via</Label>
                    <Input
                      id="domicilio_via"
                      value={domicilioVia}
                      onChange={(e) => setDomicilioVia(e.target.value)}
                      className="border-2 border-border bg-card"
                      placeholder="Via Roma"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilio_civico">Civico</Label>
                    <Input
                      id="domicilio_civico"
                      value={domicilioCivico}
                      onChange={(e) => setDomicilioCivico(e.target.value)}
                      className="border-2 border-border bg-card"
                      placeholder="123"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilio_cap">CAP</Label>
                    <Input
                      id="domicilio_cap"
                      value={domicilioCap}
                      onChange={(e) => setDomicilioCap(e.target.value)}
                      className="border-2 border-border bg-card"
                      placeholder="80100"
                      maxLength={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilio_citta">Città</Label>
                    <Input
                      id="domicilio_citta"
                      value={domicilioCitta}
                      onChange={(e) => setDomicilioCitta(e.target.value)}
                      className="border-2 border-border bg-card"
                      placeholder="Napoli"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilio_provincia">Provincia</Label>
                    <Input
                      id="domicilio_provincia"
                      value={domicilioProvincia}
                      onChange={(e) => setDomicilioProvincia(e.target.value.toUpperCase())}
                      className="border-2 border-border bg-card"
                      placeholder="NA"
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domicilio_nazione">Nazione</Label>
                    <Input
                      id="domicilio_nazione"
                      value={domicilioNazione}
                      onChange={(e) => setDomicilioNazione(e.target.value)}
                      className="border-2 border-border bg-card"
                      placeholder="Italia"
                    />
                  </div>
                </div>
              )}

              {!domicilioDiverso && (
                <p className="text-sm text-muted-foreground">
                  Il domicilio corrisponde alla residenza
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: DATI PROFESSIONALI */}
        {currentStep === 2 && (
          <div className="space-y-8">
            {/* Qualifica e Mansione */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Qualifica e Mansione</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="matricola">Matricola Aziendale</Label>
                  <Input
                    id="matricola"
                    value={matricola}
                    onChange={(e) => setMatricola(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="MAT-2025-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualifica">Qualifica</Label>
                  <Select value={qualifica} onValueChange={setQualifica}>
                    <SelectTrigger className="border-2 border-border bg-card">
                      <SelectValue placeholder="Seleziona qualifica" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operaio">Operaio</SelectItem>
                      <SelectItem value="Impiegato">Impiegato</SelectItem>
                      <SelectItem value="Quadro">Quadro</SelectItem>
                      <SelectItem value="Dirigente">Dirigente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mansione">Mansione</Label>
                  <Input
                    id="mansione"
                    value={mansione}
                    onChange={(e) => setMansione(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="es. Muratore, Elettricista, Idraulico"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="livello">Livello Contrattuale</Label>
                  <Input
                    id="livello"
                    value={livello}
                    onChange={(e) => setLivello(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="es. 3°, 4°, 5°"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ccnl">CCNL Applicato</Label>
                  <Input
                    id="ccnl"
                    value={ccnl}
                    onChange={(e) => setCcnl(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="es. Edilizia, Metalmeccanico"
                  />
                </div>
              </div>
            </div>

            {/* Badge e Turno */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Badge e Turno</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="badge_numero">Numero Badge</Label>
                  <Input
                    id="badge_numero"
                    value={badgeNumero}
                    onChange={(e) => setBadgeNumero(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="BADGE-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turno_default">Turno Default</Label>
                  <Select value={turnoDefault} onValueChange={setTurnoDefault}>
                    <SelectTrigger className="border-2 border-border bg-card">
                      <SelectValue placeholder="Seleziona turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mattina">Mattina</SelectItem>
                      <SelectItem value="Pomeriggio">Pomeriggio</SelectItem>
                      <SelectItem value="Notte">Notte</SelectItem>
                      <SelectItem value="Giornaliero">Giornaliero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Patenti e Abilitazioni */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Patenti e Abilitazioni</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patenti di Guida */}
                <div className="space-y-2">
                  <Label>Patenti di Guida</Label>
                  <div className="space-y-2">
                    {patentiGuida.map((patente, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={patente}
                          onChange={(e) => updatePatenteGuida(index, e.target.value)}
                          className="border-2 border-border bg-card"
                          placeholder="es. B, C, CE"
                        />
                        {patentiGuida.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePatenteGuida(index)}
                            className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPatenteGuida}
                      className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Patente
                    </Button>
                  </div>
                </div>

                {/* Patentini e Certificazioni */}
                <div className="space-y-2">
                  <Label>Patentini e Certificazioni</Label>
                  <div className="space-y-2">
                    {patentiniCert.map((patentino, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={patentino}
                          onChange={(e) => updatePatentino(index, e.target.value)}
                          className="border-2 border-border bg-card"
                          placeholder="es. Muletto, Gru, Piattaforma"
                        />
                        {patentiniCert.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePatentino(index)}
                            className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPatentino}
                      className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi Patentino
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DATI CONTRATTUALI */}
        {currentStep === 3 && (
          <div className="space-y-8">
            {/* Contratto */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Tipo di Contratto</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tipo_contratto">Tipologia Contratto</Label>
                  <Select value={tipoContratto} onValueChange={setTipoContratto}>
                    <SelectTrigger className="border-2 border-border bg-card">
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
                  <Label htmlFor="stato">Stato</Label>
                  <Select value={stato} onValueChange={setStato}>
                    <SelectTrigger className="border-2 border-border bg-card">
                      <SelectValue />
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
                  <Label htmlFor="data_assunzione">Data Assunzione</Label>
                  <Input
                    id="data_assunzione"
                    type="date"
                    value={dataAssunzione}
                    onChange={(e) => setDataAssunzione(e.target.value)}
                    className="border-2 border-border bg-card"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_fine_contratto">Data Fine Contratto</Label>
                  <Input
                    id="data_fine_contratto"
                    type="date"
                    value={dataFineContratto}
                    onChange={(e) => setDataFineContratto(e.target.value)}
                    className="border-2 border-border bg-card"
                  />
                  <p className="text-xs text-muted-foreground">Lascia vuoto se indeterminato</p>
                </div>
              </div>
            </div>

            {/* Orario di Lavoro */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Orario di Lavoro</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="ore_settimanali">Ore Settimanali</Label>
                  <Input
                    id="ore_settimanali"
                    type="number"
                    step="0.5"
                    value={oreSettimanali}
                    onChange={(e) => setOreSettimanali(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="40"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id="part_time"
                      checked={partTime}
                      onCheckedChange={(checked) => setPartTime(checked as boolean)}
                    />
                    <Label htmlFor="part_time" className="cursor-pointer">Part Time</Label>
                  </div>
                  {partTime && (
                    <Input
                      id="percentuale_part_time"
                      type="number"
                      value={percentualePartTime}
                      onChange={(e) => setPercentualePartTime(e.target.value)}
                      className="border-2 border-border bg-card"
                      placeholder="Percentuale (es. 50 per 50%)"
                      min="1"
                      max="99"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DATI RETRIBUTIVI */}
        {currentStep === 4 && (
          <div className="space-y-8">
            {/* Retribuzione */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Retribuzione</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="retribuzione_lorda_mensile">Retribuzione Lorda Mensile (€)</Label>
                  <Input
                    id="retribuzione_lorda_mensile"
                    type="number"
                    step="0.01"
                    value={retribuzioneLordaMensile}
                    onChange={(e) => setRetribuzioneLordaMensile(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="2500.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retribuzione_lorda_annua">Retribuzione Lorda Annua (€)</Label>
                  <Input
                    id="retribuzione_lorda_annua"
                    type="number"
                    step="0.01"
                    value={retribuzioneLordaAnnua}
                    onChange={(e) => setRetribuzioneLordaAnnua(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="30000.00"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="superminimo">Superminimo (€)</Label>
                  <Input
                    id="superminimo"
                    type="number"
                    step="0.01"
                    value={superminimo}
                    onChange={(e) => setSuperminimo(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="200.00"
                  />
                </div>
              </div>
            </div>

            {/* Dati Bancari */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Dati Bancari</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    className="border-2 border-border bg-card"
                    placeholder="IT00X0000000000000000000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intestatario_iban">Intestatario IBAN</Label>
                  <Input
                    id="intestatario_iban"
                    value={intestatarioIban}
                    onChange={(e) => setIntestatarioIban(e.target.value)}
                    className="border-2 border-border bg-card"
                    placeholder="Mario Rossi"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: DOCUMENTI & NOTE */}
        {currentStep === 5 && (
          <div className="space-y-8">
            {/* Note Interne */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Note Interne</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note_interne">Note</Label>
                <Textarea
                  id="note_interne"
                  value={noteInterne}
                  onChange={(e) => setNoteInterne(e.target.value)}
                  className="border-2 border-border bg-card min-h-[200px]"
                  placeholder="Note visibili solo agli amministratori..."
                />
              </div>
            </div>

            {/* Info Documenti */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Documenti e Scadenze</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Il caricamento di documenti (contratti, certificati medici, scadenze, etc.) sarà disponibile dopo aver creato il dipendente.
              </p>
            </div>
          </div>
        )}

        {/* STEP 6: ACCOUNT */}
        {currentStep === 6 && (
          <div className="space-y-8">
            {creaAccount ? (
              <>
                {/* Email Account Info */}
                <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Email Account</h3>
              </div>

              <div className="space-y-2">
                <Label>Email Account <span className="text-red-500">*</span></Label>
                <div className="p-4 rounded-lg border-2 border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-emerald-900">
                      {email || 'Email non inserita'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Email presa automaticamente dai Dati Anagrafici. L&apos;utente riceverà un&apos;email di invito per impostare la password.
                </p>
              </div>
            </div>

            {/* Ruolo Account */}
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-emerald-600 rounded-full" />
                <h3 className="text-lg font-bold">Ruolo</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_role">Seleziona Ruolo</Label>
                {availableRoles.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
                    Caricamento ruoli...
                  </div>
                ) : (
                  <Select
                    value={accountRole}
                    onValueChange={setAccountRole}
                  >
                    <SelectTrigger
                      className="border-2 border-border bg-card h-auto min-h-[60px]"
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                    >
                      <SelectValue placeholder="Seleziona un ruolo...">
                        {accountRole && availableRoles.find(r => r.id === accountRole) && (() => {
                          const selectedRole = availableRoles.find(r => r.id === accountRole)!;
                          const Icon = getRoleIcon(selectedRole.system_role_key, selectedRole.icon);
                          return (
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-emerald-700" />
                              </div>
                              <div className="flex flex-col items-start text-left">
                                <span className="font-semibold text-sm">{selectedRole.name}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  {selectedRole.description || 'Nessuna descrizione'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" sideOffset={5}>
                      {availableRoles.map((role) => {
                        const Icon = getRoleIcon(role.system_role_key, role.icon);
                        return (
                          <SelectItem key={role.id} value={role.id} className="h-auto py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Icon className="h-5 w-5 text-emerald-700" />
                              </div>
                              <div className="flex flex-col items-start text-left">
                                <span className="font-semibold text-sm">{role.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {role.description || 'Nessuna descrizione'}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {/* Descrizione permessi del ruolo selezionato */}
                {accountRole && availableRoles.find(r => r.id === accountRole) && (
                  <div className="mt-4 p-5 rounded-lg border-2 border-emerald-200 bg-emerald-50/30">
                    <p className="text-sm font-semibold text-emerald-900 mb-3">Permessi abilitati:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        const selectedRole = availableRoles.find(r => r.id === accountRole);
                        if (!selectedRole || !selectedRole.permissions) {
                          return <p className="col-span-2 text-sm text-gray-600">Nessun permesso definito</p>;
                        }

                        const permissions = selectedRole.permissions;
                        const permissionsList: string[] = [];

                        // Mappiamo i permessi in modo leggibile
                        if (permissions.users?.length > 0) permissionsList.push('Gestione Utenti & Ruoli');
                        if (permissions.dipendenti?.length > 0) permissionsList.push('Anagrafica Dipendenti');
                        if (permissions.rapportini?.length > 0) permissionsList.push('Rapportini');
                        if (permissions.commesse?.length > 0) permissionsList.push('Commesse & Progetti');
                        if (permissions.clienti?.length > 0) permissionsList.push('Gestione Clienti');
                        if (permissions.fornitori?.length > 0) permissionsList.push('Gestione Fornitori');
                        if (permissions.fatture?.length > 0) permissionsList.push('Fatturazione');
                        if (permissions.costi?.length > 0) permissionsList.push('Costi & Movimenti');
                        if (permissions.documenti?.length > 0) permissionsList.push('Documenti');
                        if (permissions.settings?.length > 0) permissionsList.push('Impostazioni');

                        if (permissionsList.length === 0) {
                          return <p className="col-span-2 text-sm text-gray-600">Nessun permesso abilitato</p>;
                        }

                        return permissionsList.map((perm, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                            <svg className="h-4 w-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">{perm}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email di Invito Info */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-blue-900">Email di invito automatica</p>
                  <p className="text-xs text-blue-700 mt-1">
                    L&apos;utente riceverà un&apos;email con un link sicuro per impostare la password (valido 24 ore) e le istruzioni per il primo accesso.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600">✓</span>
                  <span className="text-blue-700">Email di invito inviata automaticamente</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600">✓</span>
                  <span className="text-blue-700">Link sicuro valido per 24 ore</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600">✓</span>
                  <span className="text-blue-700">Istruzioni per il primo accesso incluse</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-600">✓</span>
                  <span className="text-blue-700">Password impostata dall&apos;utente</span>
                </div>
              </div>
            </div>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-card p-8 space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-emerald-100">
                    <svg className="h-12 w-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Pronto per salvare!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Hai completato tutti i campi necessari. Il dipendente verrà creato senza account di accesso al sistema.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Potrai creare l&apos;account in un secondo momento dalla pagina del dipendente.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Indietro
          </Button>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Annulla
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
              >
                Avanti
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={loading}
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e as any);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? 'Salvataggio...' : 'Crea Dipendente'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
