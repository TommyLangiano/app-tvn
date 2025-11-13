'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Building2 } from 'lucide-react';
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
      toast.error(error.message || 'Errore nel salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dati dell'Azienda</h2>
            <p className="text-sm text-muted">
              Completa i dati fiscali e legali della tua azienda
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dati Fiscali */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Dati Fiscali</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ragione_sociale">
                Ragione Sociale <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ragione_sociale"
                value={formData.ragione_sociale}
                onChange={(e) => handleChange('ragione_sociale', e.target.value)}
                placeholder="Es. Costruzioni Edili SRL"
                required
              />
            </div>

            <div>
              <Label htmlFor="forma_giuridica">Forma Giuridica</Label>
              <Select
                value={formData.forma_giuridica}
                onValueChange={(value) => handleChange('forma_giuridica', value)}
              >
                <SelectTrigger>
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
              <Label htmlFor="partita_iva">
                Partita IVA <span className="text-destructive">*</span>
              </Label>
              <Input
                id="partita_iva"
                value={formData.partita_iva}
                onChange={(e) => handleChange('partita_iva', e.target.value)}
                placeholder="Es. 12345678901"
                maxLength={11}
                required
              />
            </div>

            <div>
              <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
              <Input
                id="codice_fiscale"
                value={formData.codice_fiscale}
                onChange={(e) => handleChange('codice_fiscale', e.target.value)}
                placeholder="Es. 12345678901"
              />
            </div>
          </div>
        </div>

        {/* Contatti */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Contatti</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pec">
                PEC <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pec"
                type="email"
                value={formData.pec}
                onChange={(e) => handleChange('pec', e.target.value)}
                placeholder="Es. azienda@pec.it"
                required
              />
            </div>

            <div>
              <Label htmlFor="telefono">Telefono Aziendale</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                placeholder="Es. +39 012 345 6789"
              />
            </div>
          </div>
        </div>

        {/* Settore */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Attività</h3>

          <div>
            <Label htmlFor="settore_attivita">Settore Attività</Label>
            <Input
              id="settore_attivita"
              value={formData.settore_attivita}
              onChange={(e) => handleChange('settore_attivita', e.target.value)}
              placeholder="Es. Costruzioni Edili, Ristrutturazioni, ecc."
            />
          </div>
        </div>

        {/* Sede Legale */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Sede Legale</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="sede_legale_via">Via</Label>
              <Input
                id="sede_legale_via"
                value={formData.sede_legale_via}
                onChange={(e) => handleChange('sede_legale_via', e.target.value)}
                placeholder="Es. Via Roma"
              />
            </div>

            <div>
              <Label htmlFor="sede_legale_civico">Civico</Label>
              <Input
                id="sede_legale_civico"
                value={formData.sede_legale_civico}
                onChange={(e) => handleChange('sede_legale_civico', e.target.value)}
                placeholder="Es. 123"
              />
            </div>

            <div>
              <Label htmlFor="sede_legale_cap">CAP</Label>
              <Input
                id="sede_legale_cap"
                value={formData.sede_legale_cap}
                onChange={(e) => handleChange('sede_legale_cap', e.target.value)}
                placeholder="Es. 00100"
                maxLength={5}
              />
            </div>

            <div>
              <Label htmlFor="sede_legale_citta">Città</Label>
              <Input
                id="sede_legale_citta"
                value={formData.sede_legale_citta}
                onChange={(e) => handleChange('sede_legale_citta', e.target.value)}
                placeholder="Es. Roma"
              />
            </div>

            <div>
              <Label htmlFor="sede_legale_provincia">Provincia</Label>
              <Input
                id="sede_legale_provincia"
                value={formData.sede_legale_provincia}
                onChange={(e) => handleChange('sede_legale_provincia', e.target.value)}
                placeholder="Es. RM"
                maxLength={2}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="h-11 px-8"
          >
            {loading ? 'Salvataggio...' : (
              <>
                Continua
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
