'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function OnboardingStep2() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!userTenant) {
        toast.error('Tenant non trovato');
        return;
      }

      setTenantId(userTenant.tenant_id);

      // Load existing logo if any
      const { data: profile } = await supabase
        .from('tenant_profiles')
        .select('logo_url')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      if (profile && profile[0] && profile[0].logo_url) {
        setLogoUrl(profile[0].logo_url);
        setPreviewUrl(profile[0].logo_url);
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast.error('Errore nel caricamento dei dati');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Il file deve essere inferiore a 2MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadLogo(file);
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);

    try {
      const supabase = createClient();

      // Generate unique filename following the structure: {tenant_id}/logos/{filename}
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `${tenantId}/logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('app-storage')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('app-storage')
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast.success('Logo caricato con successo');

    } catch (error: unknown) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Errore nel caricamento del logo');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Update tenant profile with logo and mark onboarding as completed
      const { error } = await supabase
        .from('tenant_profiles')
        .update({
          logo_url: logoUrl || null,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success('Configurazione completata!');
      router.push('/dashboard');

    } catch (error: unknown) {
      console.error('Error completing onboarding:', error);
      toast.error(error.message || 'Errore nel completamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Mark onboarding as completed without logo
      const { error } = await supabase
        .from('tenant_profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      toast.success('Configurazione completata!');
      router.push('/dashboard');

    } catch (error: unknown) {
      console.error('Error completing onboarding:', error);
      toast.error(error.message || 'Errore nel completamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Logo & Branding</h2>
            <p className="text-sm text-muted">
              Carica il logo della tua azienda (opzionale)
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-4">
          <Label>Logo Azienda</Label>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-xl bg-background">
            {previewUrl ? (
              <div className="relative">
                <div className="w-48 h-48 rounded-xl bg-white border border-border p-4 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-white hover:bg-destructive/90 transition-colors"
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted mb-4" />
                <p className="text-sm text-muted mb-1">
                  Trascina qui il tuo logo oppure
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-2"
                >
                  Seleziona File
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <p className="text-xs text-muted text-center">
            Formati supportati: PNG, JPG, SVG • Massimo 2MB
          </p>

          {uploading && (
            <p className="text-sm text-primary text-center animate-pulse">
              Caricamento in corso...
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground">
            <strong>💡 Suggerimento:</strong> Il logo verrà utilizzato in fatture, documenti,
            email e nell'interfaccia dell'applicazione. Puoi sempre modificarlo successivamente
            dalle impostazioni aziendali.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={loading || uploading}
          >
            Salta per ora
          </Button>

          <Button
            onClick={handleComplete}
            disabled={loading || uploading || !logoUrl}
            className="h-11 px-8"
          >
            {loading ? 'Completamento...' : (
              <>
                Completa Configurazione
                <Check className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
