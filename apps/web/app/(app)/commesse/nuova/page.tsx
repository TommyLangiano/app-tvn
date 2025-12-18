'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { CommessaFormData, TipologiaCliente, TipologiaCommessa } from '@/types/commessa';
import { TeamTable } from '@/components/features/commesse/TeamTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import React from 'react';
import { Check, Trash2, Upload, FileText, X } from 'lucide-react';
import { CityCombobox } from '@/components/ui/city-combobox';

interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  forma_giuridica?: string;
  ragione_sociale?: string;
}

interface TeamMember {
  id: string;
  nome: string;
  cognome: string;
  ruolo?: string;
  email?: string;
}

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  ruolo?: string;
  avatar_url?: string;
  email?: string;
}

export default function NuovaCommessaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);
  const [canSubmit, setCanSubmit] = useState(false);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [searchCliente, setSearchCliente] = useState('');
  const [durataGiorni, setDurataGiorni] = useState<number>(0);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [selectedDipendenti, setSelectedDipendenti] = useState<Set<string>>(new Set());
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [budgetCommessa, setBudgetCommessa] = useState<string>('');
  const [costoMateriali, setCostoMateriali] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<CommessaFormData>({
    tipologia_cliente: '' as TipologiaCliente,
    tipologia_commessa: '' as TipologiaCommessa,
    nome_commessa: '',
    cliente_commessa: '',
  });

  const steps = [
    { number: 1, title: 'Informazioni Generali', description: 'Dati principali della commessa' },
    { number: 2, title: 'Cliente & Luogo', description: 'Cliente e località della commessa' },
    { number: 3, title: 'Pianificazione', description: 'Date e tempistiche' },
    { number: 4, title: 'Descrizione & Documenti', description: 'Note e allegati' },
  ];

  useEffect(() => {
    loadTenantId();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentStep === 2 && tenantId) {
      loadClienti();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, tenantId]);

  useEffect(() => {
    if (currentStep === 3 && tenantId) {
      loadDipendenti();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, tenantId]);

  useEffect(() => {
    if (formData.data_inizio && formData.data_fine_prevista) {
      const startDate = new Date(formData.data_inizio);
      const endDate = new Date(formData.data_fine_prevista);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 per includere entrambi i giorni

      setDurataGiorni(diffDays > 0 ? diffDays : 0);
    } else {
      setDurataGiorni(0);
    }
  }, [formData.data_inizio, formData.data_fine_prevista]);

  const formatDurata = (giorni: number): string => {
    if (giorni === 0) return '0 Giorni';
    if (giorni <= 31) return `${giorni} Giorni`;

    const mesi = Math.floor(giorni / 30);
    const giorniRimanenti = giorni % 30;

    if (giorniRimanenti === 0) {
      return `${giorni} Giorni (${mesi} ${mesi === 1 ? 'mese' : 'mesi'})`;
    }

    return `${giorni} Giorni (${mesi} ${mesi === 1 ? 'mese' : 'mesi'} e ${giorniRimanenti} ${giorniRimanenti === 1 ? 'giorno' : 'giorni'})`;
  };

  const formatCurrency = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCurrencyInput = (value: string): string => {
    if (!value) return '';

    // Separa parte intera e decimale
    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Formatta parte intera con separatore migliaia
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Ricostruisci il numero
    if (decimalPart !== undefined) {
      return `${formattedInteger},${decimalPart}`;
    }

    return formattedInteger;
  };

  const parseCurrencyInput = (value: string): string => {
    // Rimuovi i punti (separatore migliaia) e sostituisci la virgola con il punto
    return value.replace(/\./g, '').replace(',', '.');
  };

  const handleBudgetChange = (value: string) => {
    // Se l'utente sta digitando, gestisci il formato in real-time
    const rawValue = value.replace(/[^\d,]/g, ''); // Rimuovi tutto tranne numeri e virgola

    // Conta le virgole
    const commaCount = (rawValue.match(/,/g) || []).length;
    if (commaCount > 1) return; // Previeni più di una virgola

    // Separa parte intera e decimale
    const parts = rawValue.split(',');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Limita decimali a 2
    if (decimalPart && decimalPart.length > 2) {
      return;
    }

    // Verifica limite massimo sulla parte numerica pura
    const numericValue = rawValue.replace(',', '.');
    const num = parseFloat(numericValue);
    if (!isNaN(num) && num > 999999999.99) {
      return;
    }

    // Salva il valore pulito (senza separatori migliaia)
    const cleanValue = integerPart + (decimalPart !== undefined ? '.' + decimalPart : '');
    setBudgetCommessa(cleanValue);

    // Controllo warning: costo materiali > budget
    if (cleanValue && costoMateriali) {
      const budget = parseFloat(cleanValue);
      const costo = parseFloat(costoMateriali);
      if (!isNaN(budget) && !isNaN(costo) && costo > budget) {
        setWarnings({ ...warnings, costo_materiali: true });
      } else {
        setWarnings({ ...warnings, costo_materiali: false });
      }
    }

    // Clear error se presente
    if (errors.budget_commessa) {
      setErrors({ ...errors, budget_commessa: false });
    }
  };

  const handleCostoMaterialiChange = (value: string) => {
    // Se l'utente sta digitando, gestisci il formato in real-time
    const rawValue = value.replace(/[^\d,]/g, ''); // Rimuovi tutto tranne numeri e virgola

    // Conta le virgole
    const commaCount = (rawValue.match(/,/g) || []).length;
    if (commaCount > 1) return; // Previeni più di una virgola

    // Separa parte intera e decimale
    const parts = rawValue.split(',');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Limita decimali a 2
    if (decimalPart && decimalPart.length > 2) {
      return;
    }

    // Verifica limite massimo sulla parte numerica pura
    const numericValue = rawValue.replace(',', '.');
    const num = parseFloat(numericValue);
    if (!isNaN(num) && num > 999999999.99) {
      return;
    }

    // Salva il valore pulito (senza separatori migliaia)
    const cleanValue = integerPart + (decimalPart !== undefined ? '.' + decimalPart : '');
    setCostoMateriali(cleanValue);

    // Controllo warning: costo materiali > budget
    if (budgetCommessa && cleanValue) {
      const budget = parseFloat(budgetCommessa);
      const costo = parseFloat(cleanValue);
      if (!isNaN(budget) && !isNaN(costo) && costo > budget) {
        setWarnings({ ...warnings, costo_materiali: true });
      } else {
        setWarnings({ ...warnings, costo_materiali: false });
      }
    }

    // Clear error se presente
    if (errors.costo_materiali) {
      setErrors({ ...errors, costo_materiali: false });
    }
  };

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
        .order('created_at', { ascending: false })
        .limit(1);

      if (userTenants && userTenants.length > 0) {
        setTenantId(userTenants[0].tenant_id);
      }
    } catch {

    }
  };

  const loadClienti = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clienti')
        .select('id, nome, cognome, email, telefono, partita_iva, codice_fiscale, forma_giuridica, ragione_sociale')
        .eq('tenant_id', tenantId)
        .order('cognome', { ascending: true });

      if (error) throw error;
      if (data) {
        setClienti(data);
      }
    } catch {
      toast.error('Errore nel caricamento dei clienti');
    }
  };

  const loadDipendenti = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('dipendenti')
        .select('id, nome, cognome, qualifica, mansione, avatar_url, email')
        .eq('tenant_id', tenantId)
        .order('cognome', { ascending: true });

      if (error) throw error;
      if (data) {
        // Map qualifica or mansione to ruolo field for display
        const dipendentiWithRuolo = data.map(d => ({
          id: d.id,
          nome: d.nome,
          cognome: d.cognome,
          email: d.email,
          avatar_url: d.avatar_url,
          ruolo: d.qualifica || d.mansione || undefined
        }));
        setDipendenti(dipendentiWithRuolo);
      }
    } catch {
      toast.error('Errore nel caricamento dei dipendenti');
    }
  };

  const getAvatarUrl = (avatarPath: string | undefined) => {
    if (!avatarPath) return null;
    const supabase = createClient();
    const { data } = supabase.storage.from('app-storage').getPublicUrl(avatarPath);
    return data.publicUrl;
  };

  const getInitials = (nome: string, cognome: string) => {
    const n = nome?.charAt(0).toUpperCase() || '';
    const c = cognome?.charAt(0).toUpperCase() || '';
    return `${n}${c}`;
  };

  const toggleDipendenteSelection = (id: string) => {
    setSelectedDipendenti(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const addSelectedToTeam = () => {
    const newMembers = dipendenti
      .filter(d => selectedDipendenti.has(d.id))
      .filter(d => !teamMembers.find(m => m.id === d.id)) // Evita duplicati
      .map(d => ({
        id: d.id,
        nome: d.nome,
        cognome: d.cognome,
        ruolo: d.ruolo,
        email: d.email
      }));

    setTeamMembers([...teamMembers, ...newMembers]);
    setSelectedDipendenti(new Set());
    setIsTeamModalOpen(false);
    toast.success(`${newMembers.length} ${newMembers.length === 1 ? 'persona aggiunta' : 'persone aggiunte'} al team`);
  };

  const filteredClienti = clienti.filter(cliente => {
    const searchLower = searchCliente.toLowerCase();
    return (
      (cliente.cognome && cliente.cognome.toLowerCase().includes(searchLower)) ||
      (cliente.nome && cliente.nome.toLowerCase().includes(searchLower)) ||
      (cliente.email && cliente.email.toLowerCase().includes(searchLower))
    );
  });

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, boolean> = {};
    let firstErrorField: string | null = null;

    if (currentStep === 1) {
      // Verifica campi obbligatori step 1
      if (!formData.codice_commessa?.trim()) {
        newErrors.codice_commessa = true;
        if (!firstErrorField) firstErrorField = 'codice_commessa';
      }
      if (!formData.nome_commessa.trim()) {
        newErrors.nome_commessa = true;
        if (!firstErrorField) firstErrorField = 'nome_commessa';
      }
      if (!formData.tipologia_commessa) {
        newErrors.tipologia_commessa = true;
        if (!firstErrorField) firstErrorField = 'tipologia_commessa';
      }
    }
    if (currentStep === 2) {
      // Verifica campi obbligatori step 2
      if (!formData.tipologia_cliente) {
        newErrors.tipologia_cliente = true;
        if (!firstErrorField) firstErrorField = 'tipologia_cliente';
      }
      if (!formData.cliente_commessa.trim()) {
        newErrors.cliente_commessa = true;
        if (!firstErrorField) firstErrorField = 'cliente_commessa';
      }
      // Se cliente pubblico, verifica CIG e CUP
      if (formData.tipologia_cliente === 'Pubblico') {
        if (!formData.cig?.trim()) {
          newErrors.cig = true;
          if (!firstErrorField) firstErrorField = 'cig';
        }
        if (!formData.cup?.trim()) {
          newErrors.cup = true;
          if (!firstErrorField) firstErrorField = 'cup';
        }
      }
    }
    if (currentStep === 3) {
      // Verifica validità date
      if (formData.data_inizio && formData.data_fine_prevista) {
        const dataInizio = new Date(formData.data_inizio);
        const dataFine = new Date(formData.data_fine_prevista);

        if (dataFine < dataInizio) {
          newErrors.data_fine_prevista = true;
          if (!firstErrorField) firstErrorField = 'data_fine_prevista';
        }
      }

      // Verifica budget e costi non negativi
      if (budgetCommessa) {
        const budget = parseFloat(budgetCommessa);
        if (isNaN(budget) || budget < 0) {
          newErrors.budget_commessa = true;
          if (!firstErrorField) firstErrorField = 'budget_commessa';
        }
      }

      if (costoMateriali) {
        const costo = parseFloat(costoMateriali);
        if (isNaN(costo) || costo < 0) {
          newErrors.costo_materiali = true;
          if (!firstErrorField) firstErrorField = 'costo_materiali';
        }
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0 && firstErrorField) {
      // Scroll to first error field
      setTimeout(() => {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }, 100);
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setErrors({});
      setCurrentStep(prev => Math.min(4, prev + 1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Previeni il submit se non è stato esplicitamente autorizzato
    if (!canSubmit) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Devi essere autenticato');
        return;
      }

      // Clean up data - remove empty optional fields
      const dataToInsert: Record<string, unknown> = {
        ...formData,
        tenant_id: tenantId,
        created_by: user.id,
        budget_commessa: budgetCommessa ? parseFloat(budgetCommessa) : null,
        costo_materiali: costoMateriali ? parseFloat(costoMateriali) : null,
      };

      // Remove CIG and CUP if not Pubblico or if empty
      if (formData.tipologia_cliente !== 'Pubblico' || !formData.cig) {
        delete dataToInsert.cig;
      }
      if (formData.tipologia_cliente !== 'Pubblico' || !formData.cup) {
        delete dataToInsert.cup;
      }

      // Insert and get the created commessa with id and slug
      const { data: newCommessa, error } = await supabase
        .from('commesse')
        .insert(dataToInsert)
        .select('id, slug')
        .single();

      if (error) throw error;

      // Save team members if present
      if (teamMembers.length > 0 && newCommessa?.id) {
        const teamInserts = teamMembers.map(member => ({
          commessa_id: newCommessa.id,
          dipendente_id: member.id,
          tenant_id: tenantId
        }));

        const { error: teamError } = await supabase
          .from('commesse_team')
          .insert(teamInserts);

        if (teamError) {
          console.error('Errore salvataggio team:', teamError);
          toast.error('Errore nel salvataggio del team');
        }
      }

      // Upload documenti if present
      if (uploadedFiles.length > 0 && newCommessa?.id) {
        setUploadingFiles(true);

        for (const file of uploadedFiles) {
          try {
            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `commesse/${newCommessa.id}/${fileName}`;

            // Upload file to storage
            const { error: uploadError } = await supabase.storage
              .from('app-storage')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) throw uploadError;

            // Save document metadata to database
            const { error: dbError } = await supabase
              .from('commesse_documenti')
              .insert({
                commessa_id: newCommessa.id,
                tenant_id: tenantId,
                nome_file: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                uploaded_by: user.id
              });

            if (dbError) throw dbError;
          } catch (uploadErr) {
            console.error('Errore upload documento:', uploadErr);
            toast.error(`Errore nel caricamento di ${file.name}`);
          }
        }

        setUploadingFiles(false);
      }

      toast.success('Commessa creata con successo!');

      // Redirect to the new commessa detail page using slug
      if (newCommessa?.slug) {
        router.push(`/commesse/${newCommessa.slug}`);
      } else if (newCommessa?.id) {
        router.push(`/commesse/${newCommessa.id}`);
      } else {
        router.push('/commesse');
      }
    } catch {

      toast.error('Errore nella creazione della commessa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Step Indicator */}
      <div className="w-full max-w-4xl mx-auto">
        {/* Cerchi e linee */}
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={`step-${step.number}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all border-2 shrink-0 ${
                currentStep === step.number
                  ? 'bg-primary text-white border-primary'
                  : currentStep > step.number
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background text-foreground border-border'
              }`}>
                {step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-[2px] flex-1 mx-4 transition-all ${
                  currentStep > step.number ? 'bg-primary' : 'bg-border'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        {/* Testi */}
        <div className="flex items-start justify-between">
          {steps.map((step) => (
            <p key={`text-${step.number}`} className={`text-xs font-medium text-center w-10 ${currentStep === step.number ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.title}
            </p>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8 [&_label]:text-foreground [&_label]:font-medium [&_label]:text-sm [&_input]:h-11 [&_input]:bg-background [&_input]:border-2 [&_input]:border-border [&_input]:rounded-lg [&_input]:px-4 [&_input]:text-base [&_input:focus]:border-primary [&_textarea]:bg-background [&_textarea]:border-2 [&_textarea]:border-border [&_textarea]:rounded-lg [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-base [&_textarea:focus]:border-primary [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:bg-background [&_button[role=combobox]]:border-2 [&_button[role=combobox]]:border-border [&_button[role=combobox]]:rounded-lg [&_button[role=combobox]]:px-4 [&_button[role=combobox]]:text-base [&_button[role=combobox]:focus]:border-primary">

        {/* Step 1: Informazioni Generali */}
        {currentStep === 1 && (
        <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
          <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
            <h3 className="text-lg font-semibold">Informazioni Generali</h3>
            <p className="text-sm text-muted-foreground">
              Dati principali della commessa
            </p>
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Codice Commessa */}
              <div className="space-y-2">
                <Label htmlFor="codice_commessa">
                  Codice Commessa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codice_commessa"
                  value={formData.codice_commessa || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, codice_commessa: e.target.value });
                    if (errors.codice_commessa) {
                      setErrors({ ...errors, codice_commessa: false });
                    }
                  }}
                  placeholder="Es. COM-2025-001"
                  className={errors.codice_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.codice_commessa && (
                  <p className="text-sm text-red-500 font-medium">Il codice commessa è obbligatorio</p>
                )}
              </div>

              {/* Nome Commessa */}
              <div className="space-y-2">
                <Label htmlFor="nome_commessa">
                  Nome Commessa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nome_commessa"
                  value={formData.nome_commessa}
                  onChange={(e) => {
                    setFormData({ ...formData, nome_commessa: e.target.value });
                    if (errors.nome_commessa) {
                      setErrors({ ...errors, nome_commessa: false });
                    }
                  }}
                  placeholder="Es. Ristrutturazione Edificio A"
                  className={errors.nome_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.nome_commessa && (
                  <p className="text-sm text-red-500 font-medium">Il nome commessa è obbligatorio</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Tipologia Commessa */}
              <div className="space-y-2">
                <Label htmlFor="tipologia_commessa">
                  Tipologia Commessa <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipologia_commessa}
                  onValueChange={(value: TipologiaCommessa) => {
                    setFormData({ ...formData, tipologia_commessa: value });
                    if (errors.tipologia_commessa) {
                      setErrors({ ...errors, tipologia_commessa: false });
                    }
                  }}
                >
                  <SelectTrigger id="tipologia_commessa" className={errors.tipologia_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}>
                    <SelectValue placeholder="Seleziona una tipologia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Appalto">Appalto</SelectItem>
                    <SelectItem value="ATI">ATI</SelectItem>
                    <SelectItem value="Sub Appalto">Sub Appalto</SelectItem>
                    <SelectItem value="Sub Affidamento">Sub Affidamento</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipologia_commessa && (
                  <p className="text-sm text-red-500 font-medium">Seleziona una tipologia di commessa</p>
                )}
              </div>
            </div>
        </div>
        )}

        {/* Step 2: Cliente & Luogo */}
        {currentStep === 2 && (
        <div className="space-y-6">
          {/* Card Cliente */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Cliente</h3>
              <p className="text-sm text-muted-foreground">
                Informazioni del cliente
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipologia Cliente */}
              <div className="space-y-2">
                <Label htmlFor="tipologia_cliente">
                  Tipologia Cliente <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.tipologia_cliente}
                  onValueChange={(value: TipologiaCliente) => {
                    setFormData({ ...formData, tipologia_cliente: value });
                    if (errors.tipologia_cliente) {
                      setErrors({ ...errors, tipologia_cliente: false });
                    }
                  }}
                >
                  <SelectTrigger id="tipologia_cliente" className={errors.tipologia_cliente ? '!border-red-500 !border-2 focus:!border-red-500' : ''}>
                    <SelectValue placeholder="Seleziona tipologia cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Privato">Privato</SelectItem>
                    <SelectItem value="Pubblico">Pubblico</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipologia_cliente && (
                  <p className="text-sm text-red-500 font-medium">Seleziona la tipologia di cliente</p>
                )}
              </div>

              {/* Cliente Commessa */}
              <div className="space-y-2">
                <Label htmlFor="cliente_commessa">
                  Cliente Commessa <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.cliente_commessa}
                  onValueChange={(value) => {
                    setFormData({ ...formData, cliente_commessa: value });
                    const cliente = clienti.find(c => c.id === value);
                    setSelectedCliente(cliente || null);
                    setSearchCliente('');
                    if (errors.cliente_commessa) {
                      setErrors({ ...errors, cliente_commessa: false });
                    }
                  }}
                >
                  <SelectTrigger id="cliente_commessa" className={errors.cliente_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}>
                    <SelectValue placeholder="Seleziona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 pb-2">
                      <Input
                        placeholder="Cerca cliente..."
                        value={searchCliente}
                        onChange={(e) => setSearchCliente(e.target.value)}
                        className="h-9"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {filteredClienti.length > 0 ? (
                      filteredClienti.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.cognome} {cliente.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nessun cliente trovato
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {errors.cliente_commessa && (
                  <p className="text-sm text-red-500 font-medium">Seleziona un cliente</p>
                )}
              </div>
            </div>

            {/* Dati Cliente */}
            <div className="p-6 rounded-sm border-2 border-border bg-background">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Forma Giuridica</p>
                  <p className="text-sm font-medium">
                    {selectedCliente?.forma_giuridica === 'persona_fisica'
                      ? 'Persona Fisica'
                      : selectedCliente?.forma_giuridica === 'persona_giuridica'
                        ? 'Persona Giuridica'
                        : selectedCliente?.forma_giuridica || '-'}
                  </p>
                </div>
                {selectedCliente?.forma_giuridica === 'persona_giuridica' && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Ragione Sociale</p>
                    <p className="text-sm font-medium">{selectedCliente?.ragione_sociale || '-'}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Cognome</p>
                  <p className="text-sm font-medium">{selectedCliente?.cognome || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Nome</p>
                  <p className="text-sm font-medium">{selectedCliente?.nome || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedCliente?.email || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Telefono</p>
                  <p className="text-sm font-medium">{selectedCliente?.telefono || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">P.IVA</p>
                  <p className="text-sm font-medium">{selectedCliente?.partita_iva || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Codice Fiscale</p>
                  <p className="text-sm font-medium">{selectedCliente?.codice_fiscale || '-'}</p>
                </div>
              </div>
            </div>

            {/* CIG e CUP - Solo per Pubblico */}
            {formData.tipologia_cliente === 'Pubblico' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CIG */}
                <div className="space-y-2">
                  <Label htmlFor="cig">
                    CIG <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cig"
                    value={formData.cig || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, cig: e.target.value });
                      if (errors.cig) {
                        setErrors({ ...errors, cig: false });
                      }
                    }}
                    placeholder="Es. 1234567890"
                    className={errors.cig ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                  />
                  {errors.cig && (
                    <p className="text-sm text-red-500 font-medium">Il CIG è obbligatorio per clienti pubblici</p>
                  )}
                </div>

                {/* CUP */}
                <div className="space-y-2">
                  <Label htmlFor="cup">
                    CUP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cup"
                    value={formData.cup || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, cup: e.target.value });
                      if (errors.cup) {
                        setErrors({ ...errors, cup: false });
                      }
                    }}
                    placeholder="Es. A12B34567890123"
                    className={errors.cup ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                  />
                  {errors.cup && (
                    <p className="text-sm text-red-500 font-medium">Il CUP è obbligatorio per clienti pubblici</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Card Luogo */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Luogo</h3>
              <p className="text-sm text-muted-foreground">
                Località della commessa
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Via */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="via">Via</Label>
                <Input
                  id="via"
                  value={formData.via || ''}
                  onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                  placeholder="Es. Via Roma"
                />
              </div>

              {/* Numero Civico */}
              <div className="space-y-2">
                <Label htmlFor="numero_civico">N. Civico</Label>
                <Input
                  id="numero_civico"
                  value={formData.numero_civico || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_civico: e.target.value })
                  }
                  placeholder="Es. 123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Città - Autocomplete ISTAT */}
              <div className="space-y-2">
                <Label htmlFor="citta">Città</Label>
                <CityCombobox
                  id="citta"
                  value={formData.citta || ''}
                  onSelect={(comune) => {
                    if (comune) {
                      setFormData({
                        ...formData,
                        citta: comune.nome,
                        provincia: comune.sigla_provincia,
                        cap: comune.cap,
                      });
                    } else {
                      setFormData({
                        ...formData,
                        citta: '',
                        provincia: '',
                        cap: '',
                      });
                    }
                  }}
                  placeholder="Seleziona città..."
                />
              </div>

              {/* Provincia - Auto-populated */}
              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={formData.provincia || ''}
                  readOnly
                  disabled
                  placeholder="Auto"
                  className="uppercase opacity-100 cursor-not-allowed"
                />
              </div>

              {/* CAP - Auto-populated */}
              <div className="space-y-2">
                <Label htmlFor="cap">CAP</Label>
                <Input
                  id="cap"
                  value={formData.cap || ''}
                  readOnly
                  disabled
                  placeholder="Auto"
                  className="opacity-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Step 3: Pianificazione */}
        {currentStep === 3 && (
        <div className="space-y-6">
          {/* Card Pianificazione Temporale */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Pianificazione Temporale</h3>
              <p className="text-sm text-muted-foreground">
                Date e tempistiche della commessa
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Data Inizio */}
              <div className="space-y-2">
                <Label htmlFor="data_inizio">Data Inizio</Label>
                <Input
                  id="data_inizio"
                  type="date"
                  value={formData.data_inizio || ''}
                  onChange={(e) => {
                    const newDataInizio = e.target.value;
                    setFormData({ ...formData, data_inizio: newDataInizio });

                    // Verifica real-time se data fine è precedente
                    if (formData.data_fine_prevista && newDataInizio) {
                      const dataInizio = new Date(newDataInizio);
                      const dataFine = new Date(formData.data_fine_prevista);
                      if (dataFine < dataInizio) {
                        setErrors({ ...errors, data_fine_prevista: true });
                      } else {
                        setErrors({ ...errors, data_fine_prevista: false });
                      }
                    }
                  }}
                />
              </div>

              {/* Data Fine Prevista */}
              <div className="space-y-2">
                <Label htmlFor="data_fine_prevista">Data Fine Prevista</Label>
                <Input
                  id="data_fine_prevista"
                  type="date"
                  value={formData.data_fine_prevista || ''}
                  onChange={(e) => {
                    const newDataFine = e.target.value;
                    setFormData({ ...formData, data_fine_prevista: newDataFine });

                    // Verifica real-time se data fine è precedente
                    if (formData.data_inizio && newDataFine) {
                      const dataInizio = new Date(formData.data_inizio);
                      const dataFine = new Date(newDataFine);
                      if (dataFine < dataInizio) {
                        setErrors({ ...errors, data_fine_prevista: true });
                      } else {
                        setErrors({ ...errors, data_fine_prevista: false });
                      }
                    } else {
                      setErrors({ ...errors, data_fine_prevista: false });
                    }
                  }}
                  className={errors.data_fine_prevista ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.data_fine_prevista && (
                  <p className="text-sm text-red-500 font-medium">La data fine non può essere precedente alla data inizio</p>
                )}
              </div>

              {/* Durata Prevista */}
              <div className="space-y-2">
                <Label>Durata Prevista</Label>
                <Input
                  value={formatDurata(durataGiorni)}
                  readOnly
                  disabled
                  className="opacity-100"
                />
              </div>
            </div>
          </div>

          {/* Card Pianificazione Economica */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Pianificazione Economica</h3>
              <p className="text-sm text-muted-foreground">
                Budget e costi previsti
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Budget Commessa */}
              <div className="space-y-2">
                <Label htmlFor="budget_commessa">Budget Commessa (€)</Label>
                <Input
                  id="budget_commessa"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formatCurrencyInput(budgetCommessa)}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  className={errors.budget_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.budget_commessa && (
                  <p className="text-sm text-red-500 font-medium">Il budget deve essere un valore valido non negativo (max 999.999.999,99)</p>
                )}
              </div>

              {/* Costo Materiali */}
              <div className="space-y-2">
                <Label htmlFor="costo_materiali">Costo Materiali (€)</Label>
                <Input
                  id="costo_materiali"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formatCurrencyInput(costoMateriali)}
                  onChange={(e) => handleCostoMaterialiChange(e.target.value)}
                  className={
                    errors.costo_materiali
                      ? '!border-red-500 !border-2 focus:!border-red-500'
                      : warnings.costo_materiali
                        ? '!border-yellow-500 !border-2 focus:!border-yellow-500'
                        : ''
                  }
                />
                {errors.costo_materiali && (
                  <p className="text-sm text-red-500 font-medium">Il costo materiali deve essere un valore valido non negativo (max 999.999.999,99)</p>
                )}
                {!errors.costo_materiali && warnings.costo_materiali && (
                  <p className="text-sm text-yellow-600 font-medium">Il costo materiali supera il budget commessa</p>
                )}
              </div>
            </div>
          </div>

          {/* Card Team */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Team</h3>
              <p className="text-sm text-muted-foreground">
                Persone che lavoreranno alla commessa
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTeamModalOpen(true)}
                >
                  Aggiungi Persona al Team
                </Button>

                {selectedTeamIds.size > 0 && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setTeamMembers(teamMembers.filter(m => !selectedTeamIds.has(m.id)));
                      toast.success(`${selectedTeamIds.size} ${selectedTeamIds.size === 1 ? 'persona rimossa' : 'persone rimosse'} dal team`);
                      setSelectedTeamIds(new Set());
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina Selezionati ({selectedTeamIds.size})
                  </Button>
                )}
              </div>

              <TeamTable
                members={teamMembers}
                selectedIds={selectedTeamIds}
                onSelectionChange={setSelectedTeamIds}
                onRemove={(id) => {
                  setTeamMembers(teamMembers.filter(m => m.id !== id));
                  toast.success('Persona rimossa dal team');
                }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Step 4: Descrizione & Documenti */}
        {currentStep === 4 && (
        <div className="space-y-6">
          {/* Card Descrizione */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Descrizione</h3>
              <p className="text-sm text-muted-foreground">
                Note e dettagli aggiuntivi
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione || ''}
                onChange={(e) =>
                  setFormData({ ...formData, descrizione: e.target.value })
                }
                rows={6}
                placeholder="Inserisci una descrizione dettagliata della commessa..."
              />
            </div>
          </div>

          {/* Card Documenti */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Documenti</h3>
              <p className="text-sm text-muted-foreground">
                Carica documenti relativi alla commessa (PDF, Word, Excel, etc.)
              </p>
            </div>

            {/* Upload Area */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setUploadedFiles([...uploadedFiles, ...files]);
                      e.target.value = '';
                    }
                  }}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Clicca per caricare o trascina i file qui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Excel, immagini (max 10MB per file)
                  </p>
                </label>
              </div>

              {/* Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>File caricati ({uploadedFiles.length})</Label>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border-2 border-border bg-background"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
                          }}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className="border-2 border-border h-11 px-6"
            >
              Indietro
            </Button>
          )}

          <div className={`flex gap-4 ${currentStep === 1 ? 'ml-auto' : ''}`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="border-2 border-border h-11 px-6"
            >
              Annulla
            </Button>

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="font-semibold h-11 px-6"
              >
                Avanti
              </Button>
            ) : (
              <Button
                type="button"
                disabled={loading || uploadingFiles}
                className="font-semibold h-11 px-6"
                onClick={() => {
                  setCanSubmit(true);
                  const form = document.querySelector('form');
                  if (form) {
                    form.requestSubmit();
                  }
                }}
              >
                {uploadingFiles ? 'Caricamento documenti...' : loading ? 'Creazione in corso...' : 'Crea Commessa'}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Modal Selezione Dipendenti */}
      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aggiungi Persone al Team</DialogTitle>
            <DialogDescription>
              Seleziona uno o più dipendenti da aggiungere al team della commessa
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {dipendenti.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nessun dipendente disponibile
              </div>
            ) : (
              dipendenti.map((dipendente) => {
                const isSelected = selectedDipendenti.has(dipendente.id);
                const isAlreadyInTeam = teamMembers.some(m => m.id === dipendente.id);

                return (
                  <div
                    key={dipendente.id}
                    onClick={() => {
                      if (!isAlreadyInTeam) {
                        toggleDipendenteSelection(dipendente.id);
                      }
                    }}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isAlreadyInTeam
                        ? 'border-muted bg-muted/30 cursor-not-allowed opacity-60'
                        : isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-primary/5'
                      }
                    `}
                  >
                    {isSelected && !isAlreadyInTeam && (
                      <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {isAlreadyInTeam && (
                      <div className="absolute top-2 right-2 text-xs bg-muted px-2 py-1 rounded">
                        Già nel team
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 overflow-hidden flex items-center justify-center font-bold text-lg shrink-0">
                        {getAvatarUrl(dipendente.avatar_url) ? (
                          <img
                            src={getAvatarUrl(dipendente.avatar_url)!}
                            alt={`${dipendente.cognome} ${dipendente.nome}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(dipendente.nome, dipendente.cognome)}</span>
                        )}
                      </div>
                      {/* Nome e Ruolo */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {dipendente.cognome} {dipendente.nome}
                        </p>
                        {dipendente.ruolo && (
                          <p className="text-sm text-muted-foreground truncate">
                            {dipendente.ruolo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedDipendenti(new Set());
                setIsTeamModalOpen(false);
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={addSelectedToTeam}
              disabled={selectedDipendenti.size === 0}
            >
              Aggiungi {selectedDipendenti.size > 0 ? `(${selectedDipendenti.size})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
