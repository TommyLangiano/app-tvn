'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Building2, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const formeGiuridiche = [
  'SRL',
  'SPA',
  'SRLS',
  'SNC',
  'SAS',
  'Ditta Individuale',
  'Altro'
];

export default function OnboardingStep1() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [formData, setFormData] = useState({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    forma_giuridica: '',
    pec: '',
    telefono: '',
    settore_attivita: '',
    sede_legale_via: '',
    sede_legale_civico: '',
    sede_legale_cap: '',
    sede_legale_citta: '',
    sede_legale_provincia: '',
    sede_legale_nazione: 'Italia',
  });

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get user's tenant
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, tenants(name)')
        .eq('user_id', user.id)
        .single();

      if (!userTenant) {
        toast.error('Tenant non trovato');
        return;
      }

      setTenantId(userTenant.tenant_id);

      // Load existing tenant profile if any
      const { data: profile } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      if (profile && profile[0]) {
        setFormData({
          ragione_sociale: profile[0].ragione_sociale || '',
          partita_iva: profile[0].partita_iva || '',
          codice_fiscale: profile[0].codice_fiscale || '',
          forma_giuridica: profile[0].forma_giuridica || '',
          pec: profile[0].pec || '',
          telefono: profile[0].telefono || '',
          settore_attivita: profile[0].settore_attivita || '',
          sede_legale_via: profile[0].sede_legale_via || '',
          sede_legale_civico: profile[0].sede_legale_civico || '',
          sede_legale_cap: profile[0].sede_legale_cap || '',
          sede_legale_citta: profile[0].sede_legale_citta || '',
          sede_legale_provincia: profile[0].sede_legale_provincia || '',
          sede_legale_nazione: profile[0].sede_legale_nazione || 'Italia',
        });
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast.error('Errore nel caricamento dei dati');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.ragione_sociale || !formData.partita_iva || !formData.pec) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Update tenant profile
      const { error } = await supabase
        .from('tenant_profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success('Dati salvati con successo');
      router.push('/onboarding/step-2');

    } catch (error: unknown) {
      console.error('Error saving data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nel salvataggio';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Dati Fiscali */}
      <div className="bg-surface border border-border rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 border border-blue-200">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Dati Fiscali</h3>
            <p className="text-sm text-muted-foreground">Informazioni legali e fiscali dell&apos;azienda</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Label htmlFor="ragione_sociale" className="text-sm font-medium">
              Ragione Sociale <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ragione_sociale"
              value={formData.ragione_sociale}
              onChange={(e) => handleChange('ragione_sociale', e.target.value)}
              placeholder="Es. Costruzioni Edili SRL"
              required
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="partita_iva" className="text-sm font-medium">
              Partita IVA <span className="text-red-500">*</span>
            </Label>
            <Input
              id="partita_iva"
              value={formData.partita_iva}
              onChange={(e) => handleChange('partita_iva', e.target.value)}
              placeholder="12345678901"
              maxLength={11}
              required
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="codice_fiscale" className="text-sm font-medium">
              Codice Fiscale
            </Label>
            <Input
              id="codice_fiscale"
              value={formData.codice_fiscale}
              onChange={(e) => handleChange('codice_fiscale', e.target.value)}
              placeholder="12345678901"
              maxLength={16}
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="forma_giuridica" className="text-sm font-medium">
              Forma Giuridica
            </Label>
            <Select
              value={formData.forma_giuridica}
              onValueChange={(value) => handleChange('forma_giuridica', value)}
            >
              <SelectTrigger className="mt-2 h-11 bg-white border-gray-300">
                <SelectValue placeholder="Seleziona forma giuridica" />
              </SelectTrigger>
              <SelectContent>
                {formeGiuridiche.map((forma) => (
                  <SelectItem key={forma} value={forma}>
                    {forma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="settore_attivita" className="text-sm font-medium">
              Settore Attività
            </Label>
            <Input
              id="settore_attivita"
              value={formData.settore_attivita}
              onChange={(e) => handleChange('settore_attivita', e.target.value)}
              placeholder="Es. Costruzioni Edili, Ristrutturazioni"
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Contatti */}
      <div className="bg-surface border border-border rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 border border-green-200">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Contatti</h3>
            <p className="text-sm text-muted-foreground">Informazioni di contatto aziendali</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="pec" className="text-sm font-medium">
              PEC <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pec"
              type="email"
              value={formData.pec}
              onChange={(e) => handleChange('pec', e.target.value)}
              placeholder="azienda@pec.it"
              required
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="telefono" className="text-sm font-medium">
              Telefono Aziendale
            </Label>
            <Input
              id="telefono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              placeholder="+39 012 345 6789"
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Sede Legale */}
      <div className="bg-surface border border-border rounded-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 border border-purple-200">
            <MapPin className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Sede Legale</h3>
            <p className="text-sm text-muted-foreground">Indirizzo della sede legale dell&apos;azienda</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <Label htmlFor="sede_legale_via" className="text-sm font-medium">
              Via
            </Label>
            <Input
              id="sede_legale_via"
              value={formData.sede_legale_via}
              onChange={(e) => handleChange('sede_legale_via', e.target.value)}
              placeholder="Via Roma"
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="sede_legale_civico" className="text-sm font-medium">
              Civico
            </Label>
            <Input
              id="sede_legale_civico"
              value={formData.sede_legale_civico}
              onChange={(e) => handleChange('sede_legale_civico', e.target.value)}
              placeholder="123"
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="sede_legale_cap" className="text-sm font-medium">
              CAP
            </Label>
            <Input
              id="sede_legale_cap"
              value={formData.sede_legale_cap}
              onChange={(e) => handleChange('sede_legale_cap', e.target.value)}
              placeholder="00100"
              maxLength={5}
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="sede_legale_citta" className="text-sm font-medium">
              Città
            </Label>
            <Input
              id="sede_legale_citta"
              value={formData.sede_legale_citta}
              onChange={(e) => handleChange('sede_legale_citta', e.target.value)}
              placeholder="Roma"
              className="mt-2 h-11 bg-white border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="sede_legale_provincia" className="text-sm font-medium">
              Provincia
            </Label>
            <Input
              id="sede_legale_provincia"
              value={formData.sede_legale_provincia}
              onChange={(e) => handleChange('sede_legale_provincia', e.target.value)}
              placeholder="RM"
              maxLength={2}
              className="mt-2 h-11 bg-white border-gray-300 uppercase"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="h-12 px-8 text-base font-medium"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvataggio...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Continua
              <ArrowRight className="h-5 w-5" />
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
