'use client';

import { useState, useEffect } from 'react';
import { Building2, Save, Mail, MapPin, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { TenantProfileFormData } from '@/types/tenant';

const FORME_GIURIDICHE = ['SRL', 'SPA', 'SRLS', 'SNC', 'SAS', 'Ditta Individuale', 'Altro'];

export function ImpostazioniAzienda() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [formData, setFormData] = useState<TenantProfileFormData>({
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    forma_giuridica: '',
    pec: '',
    email: '',
    telefono: '',
    fax: '',
    website: '',
    sede_legale_via: '',
    sede_legale_civico: '',
    sede_legale_cap: '',
    sede_legale_citta: '',
    sede_legale_provincia: '',
    sede_legale_nazione: 'Italia',
    iban: '',
    codice_sdi: '',
    rea: '',
    ateco: '',
  });

  useEffect(() => {
    loadTenantProfile();
  }, []);

  const loadTenantProfile = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenants) return;

      setTenantId(userTenants.tenant_id);

      const { data: profile } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('tenant_id', userTenants.tenant_id)
        .single();

      if (profile) {
        setFormData({
          ragione_sociale: profile.ragione_sociale || '',
          partita_iva: profile.partita_iva || '',
          codice_fiscale: profile.codice_fiscale || '',
          forma_giuridica: profile.forma_giuridica || '',
          pec: profile.pec || '',
          email: profile.email || '',
          telefono: profile.telefono || '',
          fax: profile.fax || '',
          website: profile.website || '',
          sede_legale_via: profile.sede_legale_via || '',
          sede_legale_civico: profile.sede_legale_civico || '',
          sede_legale_cap: profile.sede_legale_cap || '',
          sede_legale_citta: profile.sede_legale_citta || '',
          sede_legale_provincia: profile.sede_legale_provincia || '',
          sede_legale_nazione: profile.sede_legale_nazione || 'Italia',
          iban: profile.iban || '',
          codice_sdi: profile.codice_sdi || '',
          rea: profile.rea || '',
          ateco: profile.ateco || '',
        });
      }
    } catch {

      toast.error('Errore nel caricamento del profilo aziendale');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ragione_sociale) {
      toast.error('Ragione sociale obbligatoria');
      return;
    }

    try {
      setSaving(true);
      const supabase = createClient();

      const { error } = await supabase
        .from('tenant_profiles')
        .upsert({
          tenant_id: tenantId,
          ...formData,
          ragione_sociale: formData.ragione_sociale || null,
          partita_iva: formData.partita_iva || null,
          codice_fiscale: formData.codice_fiscale || null,
          forma_giuridica: formData.forma_giuridica || null,
          pec: formData.pec || null,
          email: formData.email || null,
          telefono: formData.telefono || null,
          fax: formData.fax || null,
          website: formData.website || null,
          sede_legale_via: formData.sede_legale_via || null,
          sede_legale_civico: formData.sede_legale_civico || null,
          sede_legale_cap: formData.sede_legale_cap || null,
          sede_legale_citta: formData.sede_legale_citta || null,
          sede_legale_provincia: formData.sede_legale_provincia || null,
          sede_legale_nazione: formData.sede_legale_nazione || 'Italia',
          iban: formData.iban || null,
          codice_sdi: formData.codice_sdi || null,
          rea: formData.rea || null,
          ateco: formData.ateco || null,
        });

      if (error) throw error;

      toast.success('Profilo aziendale salvato con successo');
    } catch {

      toast.error('Errore nel salvataggio del profilo aziendale');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Dati Aziendali */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Dati Aziendali</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="ragione_sociale">
              Ragione Sociale <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ragione_sociale"
              value={formData.ragione_sociale}
              onChange={(e) => setFormData({ ...formData, ragione_sociale: e.target.value })}
              className="h-11 border-2 border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forma_giuridica">Forma Giuridica</Label>
            <Select
              value={formData.forma_giuridica}
              onValueChange={(value) => setFormData({ ...formData, forma_giuridica: value })}
            >
              <SelectTrigger className="h-11 border-2 border-border">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {FORME_GIURIDICHE.map((forma) => (
                  <SelectItem key={forma} value={forma}>
                    {forma}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partita_iva">Partita IVA</Label>
            <Input
              id="partita_iva"
              value={formData.partita_iva}
              onChange={(e) => setFormData({ ...formData, partita_iva: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codice_fiscale">Codice Fiscale</Label>
            <Input
              id="codice_fiscale"
              value={formData.codice_fiscale}
              onChange={(e) => setFormData({ ...formData, codice_fiscale: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rea">REA</Label>
            <Input
              id="rea"
              value={formData.rea}
              onChange={(e) => setFormData({ ...formData, rea: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ateco">Codice ATECO</Label>
            <Input
              id="ateco"
              value={formData.ateco}
              onChange={(e) => setFormData({ ...formData, ateco: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codice_sdi">Codice SDI</Label>
            <Input
              id="codice_sdi"
              value={formData.codice_sdi}
              onChange={(e) => setFormData({ ...formData, codice_sdi: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>
        </div>
      </div>

      {/* Contatti */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Contatti</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pec">PEC</Label>
            <Input
              id="pec"
              type="email"
              value={formData.pec}
              onChange={(e) => setFormData({ ...formData, pec: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Telefono</Label>
            <Input
              id="telefono"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fax">Fax</Label>
            <Input
              id="fax"
              value={formData.fax}
              onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Sito Web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="h-11 border-2 border-border"
              placeholder="https://"
            />
          </div>
        </div>
      </div>

      {/* Sede Legale */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Sede Legale</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="sede_legale_via">Via</Label>
            <Input
              id="sede_legale_via"
              value={formData.sede_legale_via}
              onChange={(e) => setFormData({ ...formData, sede_legale_via: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sede_legale_civico">Civico</Label>
            <Input
              id="sede_legale_civico"
              value={formData.sede_legale_civico}
              onChange={(e) => setFormData({ ...formData, sede_legale_civico: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sede_legale_cap">CAP</Label>
            <Input
              id="sede_legale_cap"
              value={formData.sede_legale_cap}
              onChange={(e) => setFormData({ ...formData, sede_legale_cap: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sede_legale_citta">Città</Label>
            <Input
              id="sede_legale_citta"
              value={formData.sede_legale_citta}
              onChange={(e) => setFormData({ ...formData, sede_legale_citta: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sede_legale_provincia">Provincia</Label>
            <Input
              id="sede_legale_provincia"
              value={formData.sede_legale_provincia}
              onChange={(e) => setFormData({ ...formData, sede_legale_provincia: e.target.value })}
              className="h-11 border-2 border-border"
              maxLength={2}
              placeholder="RM"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sede_legale_nazione">Nazione</Label>
            <Input
              id="sede_legale_nazione"
              value={formData.sede_legale_nazione}
              onChange={(e) => setFormData({ ...formData, sede_legale_nazione: e.target.value })}
              className="h-11 border-2 border-border"
            />
          </div>
        </div>
      </div>

      {/* Dati Bancari */}
      <div className="bg-white dark:bg-gray-950 rounded-lg border-2 border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Dati Bancari</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="iban">IBAN</Label>
          <Input
            id="iban"
            value={formData.iban}
            onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
            className="h-11 border-2 border-border"
            placeholder="IT00A0000000000000000000000"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="submit"
          disabled={saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvataggio...' : 'Salva Modifiche'}
        </Button>
      </div>
    </form>
  );
}
