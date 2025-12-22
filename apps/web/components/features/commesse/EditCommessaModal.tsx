'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Commessa, TipologiaCliente, TipologiaCommessa } from '@/types/commessa';
import { CityCombobox } from '@/components/ui/city-combobox';

interface EditCommessaModalProps {
  commessa: Commessa;
  onClose: () => void;
  onSuccess: () => void;
}

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

export function EditCommessaModal({
  commessa,
  onClose,
  onSuccess,
}: EditCommessaModalProps) {
  const [loading, setLoading] = useState(false);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [searchCliente, setSearchCliente] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    tipologia_cliente: commessa.tipologia_cliente as TipologiaCliente,
    tipologia_commessa: commessa.tipologia_commessa as TipologiaCommessa,
    nome_commessa: commessa.nome_commessa,
    codice_commessa: commessa.codice_commessa || '',
    cliente_commessa: commessa.cliente_commessa,
    importo_commessa: commessa.importo_commessa,
    budget_commessa: commessa.budget_commessa,
    costo_materiali: commessa.costo_materiali,
    data_inizio: commessa.data_inizio || '',
    data_fine_prevista: commessa.data_fine_prevista || '',
    via: commessa.via || '',
    numero_civico: commessa.numero_civico || '',
    citta: commessa.citta || '',
    provincia: commessa.provincia || '',
    cap: commessa.cap || '',
    cig: commessa.cig || '',
    cup: commessa.cup || '',
    descrizione: commessa.descrizione || '',
  });

  // Format currency for display
  const [budgetCommessa, setBudgetCommessa] = useState(
    commessa.budget_commessa ? commessa.budget_commessa.toString() : ''
  );
  const [costoMateriali, setCostoMateriali] = useState(
    commessa.costo_materiali ? commessa.costo_materiali.toString() : ''
  );
  const [importoCommessa, setImportoCommessa] = useState(
    commessa.importo_commessa ? commessa.importo_commessa.toString() : ''
  );

  useEffect(() => {
    loadClienti();
  }, []);

  useEffect(() => {
    // Find and set selected cliente if exists
    if (formData.cliente_commessa && clienti.length > 0) {
      const cliente = clienti.find(c => c.id === formData.cliente_commessa);
      setSelectedCliente(cliente || null);
    }
  }, [clienti, formData.cliente_commessa]);

  const loadClienti = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('clienti')
        .select('id, nome, cognome, email, telefono, partita_iva, codice_fiscale, forma_giuridica, ragione_sociale')
        .eq('tenant_id', commessa.tenant_id)
        .order('cognome', { ascending: true });

      if (error) throw error;
      if (data) {
        setClienti(data);
      }
    } catch {
      toast.error('Errore nel caricamento dei clienti');
    }
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

  const handleCurrencyChange = (
    value: string,
    setter: (value: string) => void,
    errorKey: string,
    warningKey?: string
  ) => {
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
    setter(cleanValue);

    // Check warnings for budget vs costo
    if (warningKey && budgetCommessa && costoMateriali) {
      const budget = parseFloat(budgetCommessa);
      const costo = parseFloat(costoMateriali);
      if (!isNaN(budget) && !isNaN(costo) && costo > budget) {
        setWarnings({ ...warnings, [warningKey]: true });
      } else {
        setWarnings({ ...warnings, [warningKey]: false });
      }
    }

    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: false });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.codice_commessa?.trim()) {
      newErrors.codice_commessa = true;
    }
    if (!formData.nome_commessa.trim()) {
      newErrors.nome_commessa = true;
    }
    if (!formData.tipologia_commessa) {
      newErrors.tipologia_commessa = true;
    }
    if (!formData.tipologia_cliente) {
      newErrors.tipologia_cliente = true;
    }
    if (!formData.cliente_commessa.trim()) {
      newErrors.cliente_commessa = true;
    }

    // Validate dates
    if (formData.data_inizio && formData.data_fine_prevista) {
      const dataInizio = new Date(formData.data_inizio);
      const dataFine = new Date(formData.data_fine_prevista);
      if (dataFine < dataInizio) {
        newErrors.data_fine_prevista = true;
      }
    }

    // Validate CIG/CUP for Pubblico
    if (formData.tipologia_cliente === 'Pubblico') {
      if (!formData.cig?.trim()) {
        newErrors.cig = true;
      }
      if (!formData.cup?.trim()) {
        newErrors.cup = true;
      }
    }

    // Validate currency values
    if (budgetCommessa) {
      const budget = parseFloat(budgetCommessa);
      if (isNaN(budget) || budget < 0) {
        newErrors.budget_commessa = true;
      }
    }
    if (costoMateriali) {
      const costo = parseFloat(costoMateriali);
      if (isNaN(costo) || costo < 0) {
        newErrors.costo_materiali = true;
      }
    }
    if (importoCommessa) {
      const importo = parseFloat(importoCommessa);
      if (isNaN(importo) || importo < 0) {
        newErrors.importo_commessa = true;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Controlla i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Generate new slug if nome_commessa changed
      const newSlug = formData.nome_commessa !== commessa.nome_commessa
        ? generateSlug(formData.nome_commessa)
        : commessa.slug;

      // Prepare update data
      const dataToUpdate: Record<string, unknown> = {
        ...formData,
        slug: newSlug,
        importo_commessa: importoCommessa ? parseFloat(importoCommessa) : null,
        budget_commessa: budgetCommessa ? parseFloat(budgetCommessa) : null,
        costo_materiali: costoMateriali ? parseFloat(costoMateriali) : null,
      };

      // Remove CIG and CUP if not Pubblico or if empty
      if (formData.tipologia_cliente !== 'Pubblico' || !formData.cig) {
        dataToUpdate.cig = null;
      }
      if (formData.tipologia_cliente !== 'Pubblico' || !formData.cup) {
        dataToUpdate.cup = null;
      }

      // Update commessa
      const { error } = await supabase
        .from('commesse')
        .update(dataToUpdate)
        .eq('id', commessa.id);

      if (error) throw error;

      toast.success('Commessa aggiornata con successo');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating commessa:', error);
      toast.error('Errore durante l\'aggiornamento della commessa');
    } finally {
      setLoading(false);
    }
  };

  const filteredClienti = clienti.filter(cliente => {
    const searchLower = searchCliente.toLowerCase();
    return (
      (cliente.cognome && cliente.cognome.toLowerCase().includes(searchLower)) ||
      (cliente.nome && cliente.nome.toLowerCase().includes(searchLower)) ||
      (cliente.email && cliente.email.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header - Fixed top */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-card z-10 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold">Modifica Commessa</DialogTitle>
              <DialogDescription>
                Modifica i dati della commessa. Tutti i campi obbligatori sono contrassegnati con *
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-full hover:bg-muted shrink-0"
              aria-label="Chiudi modal"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form id="edit-commessa-form" onSubmit={handleSubmit} className="space-y-6 [&_label]:text-foreground [&_label]:font-medium [&_label]:text-sm [&_input]:h-11 [&_input]:bg-white [&_input]:border-2 [&_input]:border-border [&_input]:rounded-sm [&_input]:px-4 [&_input]:text-base [&_input:focus]:border-primary [&_textarea]:bg-white [&_textarea]:border-2 [&_textarea]:border-border [&_textarea]:rounded-sm [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-base [&_textarea:focus]:border-primary [&_button[role=combobox]]:h-11 [&_button[role=combobox]]:bg-white [&_button[role=combobox]]:border-2 [&_button[role=combobox]]:border-border [&_button[role=combobox]]:rounded-sm [&_button[role=combobox]]:px-4 [&_button[role=combobox]]:text-base [&_button[role=combobox]:focus]:border-primary">
          {/* Informazioni Generali */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Informazioni Generali</h3>
              <p className="text-sm text-muted-foreground">Dati principali della commessa</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="codice_commessa">
                  Codice Commessa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="codice_commessa"
                  value={formData.codice_commessa}
                  onChange={(e) => {
                    setFormData({ ...formData, codice_commessa: e.target.value });
                    if (errors.codice_commessa) {
                      setErrors({ ...errors, codice_commessa: false });
                    }
                  }}
                  className={errors.codice_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.codice_commessa && (
                  <p className="text-sm text-red-500 font-medium">Il codice commessa è obbligatorio</p>
                )}
              </div>

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
                  className={errors.nome_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.nome_commessa && (
                  <p className="text-sm text-red-500 font-medium">Il nome commessa è obbligatorio</p>
                )}
              </div>
            </div>

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

          {/* Cliente */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Cliente</h3>
              <p className="text-sm text-muted-foreground">Informazioni del cliente</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        className="h-9 bg-white border-2 border-border rounded-sm"
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

            {formData.tipologia_cliente === 'Pubblico' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cig">
                    CIG <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cig"
                    value={formData.cig}
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

                <div className="space-y-2">
                  <Label htmlFor="cup">
                    CUP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cup"
                    value={formData.cup}
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

          {/* Luogo */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Luogo</h3>
              <p className="text-sm text-muted-foreground">Località della commessa</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="via">Via</Label>
                <Input
                  id="via"
                  value={formData.via}
                  onChange={(e) => setFormData({ ...formData, via: e.target.value })}
                  placeholder="Es. Via Roma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_civico">N. Civico</Label>
                <Input
                  id="numero_civico"
                  value={formData.numero_civico}
                  onChange={(e) => setFormData({ ...formData, numero_civico: e.target.value })}
                  placeholder="Es. 123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="citta">Città</Label>
                <CityCombobox
                  id="citta"
                  value={formData.citta}
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

              <div className="space-y-2">
                <Label htmlFor="provincia">Provincia</Label>
                <Input
                  id="provincia"
                  value={formData.provincia}
                  readOnly
                  disabled
                  placeholder="Auto"
                  className="uppercase opacity-100 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cap">CAP</Label>
                <Input
                  id="cap"
                  value={formData.cap}
                  readOnly
                  disabled
                  placeholder="Auto"
                  className="opacity-100 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Pianificazione */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Pianificazione</h3>
              <p className="text-sm text-muted-foreground">Date e importi della commessa</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="data_inizio">Data Inizio</Label>
                <Input
                  id="data_inizio"
                  type="date"
                  value={formData.data_inizio}
                  onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fine_prevista">Data Fine Prevista</Label>
                <Input
                  id="data_fine_prevista"
                  type="date"
                  value={formData.data_fine_prevista}
                  onChange={(e) => setFormData({ ...formData, data_fine_prevista: e.target.value })}
                  className={errors.data_fine_prevista ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.data_fine_prevista && (
                  <p className="text-sm text-red-500 font-medium">La data fine non può essere precedente alla data inizio</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="importo_commessa">Importo Contratto (€)</Label>
                <Input
                  id="importo_commessa"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formatCurrencyInput(importoCommessa)}
                  onChange={(e) => handleCurrencyChange(e.target.value, setImportoCommessa, 'importo_commessa')}
                  className={errors.importo_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.importo_commessa && (
                  <p className="text-sm text-red-500 font-medium">Inserisci un importo valido</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_commessa">Budget Commessa (€)</Label>
                <Input
                  id="budget_commessa"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formatCurrencyInput(budgetCommessa)}
                  onChange={(e) => handleCurrencyChange(e.target.value, setBudgetCommessa, 'budget_commessa', 'costo_materiali')}
                  className={errors.budget_commessa ? '!border-red-500 !border-2 focus:!border-red-500' : ''}
                />
                {errors.budget_commessa && (
                  <p className="text-sm text-red-500 font-medium">Inserisci un budget valido</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="costo_materiali">Costo Materiali (€)</Label>
                <Input
                  id="costo_materiali"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={formatCurrencyInput(costoMateriali)}
                  onChange={(e) => handleCurrencyChange(e.target.value, setCostoMateriali, 'costo_materiali', 'costo_materiali')}
                  className={
                    errors.costo_materiali
                      ? '!border-red-500 !border-2 focus:!border-red-500'
                      : warnings.costo_materiali
                        ? '!border-yellow-500 !border-2 focus:!border-yellow-500'
                        : ''
                  }
                />
                {errors.costo_materiali && (
                  <p className="text-sm text-red-500 font-medium">Inserisci un costo valido</p>
                )}
                {!errors.costo_materiali && warnings.costo_materiali && (
                  <p className="text-sm text-yellow-600 font-medium">Il costo materiali supera il budget</p>
                )}
              </div>
            </div>
          </div>

          {/* Descrizione */}
          <div className="space-y-6 p-6 rounded-xl bg-card shadow-sm">
            <div className="border-b-2 border-border pb-3 border-l-4 border-l-primary pl-4">
              <h3 className="text-lg font-semibold">Descrizione</h3>
              <p className="text-sm text-muted-foreground">Note e dettagli aggiuntivi</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea
                id="descrizione"
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                rows={6}
                placeholder="Inserisci una descrizione dettagliata della commessa..."
              />
            </div>
          </div>
          </form>
        </div>

        {/* Footer - Fixed bottom */}
        <DialogFooter className="px-6 py-4 border-t bg-card z-10 shrink-0 !gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="border-2 border-border h-11 px-6"
          >
            Annulla
          </Button>
          <Button
            type="submit"
            form="edit-commessa-form"
            disabled={loading}
            className="gap-2 font-semibold h-11 px-6"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
