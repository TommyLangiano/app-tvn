'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Mail, MapPin, FileText, Building2, LogOut } from 'lucide-react';
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

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');
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
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      setUserId(user.id);

      // Check if user already has tenant (should not be here)
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (userTenant) {
        // User already has tenant, redirect to dashboard
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/sign-in';
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
      const response = await fetch('/api/account-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il recupero account');
      }

      toast.success('Account recuperato con successo! 🎉');

      // Refresh the page to reload user context
      window.location.href = '/dashboard';

    } catch (error: unknown) {
      console.error('Error recovering account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nel recupero account';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Logout Button */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </div>

        {/* Logo Header */}
        <div className="flex justify-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <span className="text-2xl font-bold">TVN</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 border-4 border-blue-200">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Recupero Account
          </h1>
          <p className="text-muted-foreground text-lg">
            Completa i dati della tua azienda per ripristinare l'accesso
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
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
          <div className="flex justify-center pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-12 text-base font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recupero in corso...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Recupera Account
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Problemi? Contatta il supporto: <a href="mailto:support@tvn.com" className="text-primary hover:underline">support@tvn.com</a>
        </p>
      </div>
    </div>
  );
}
