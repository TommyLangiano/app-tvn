'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, X, Check, ArrowLeft, Sparkles } from 'lucide-react';
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
      const errorMessage = error instanceof Error ? error.message : 'Errore nel caricamento del logo';
      toast.error(errorMessage);
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
    if (!logoUrl) {
      toast.error('Carica un logo prima di completare');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Update tenant profile with logo and mark onboarding as completed
      const { error } = await supabase
        .from('tenant_profiles')
        .update({
          logo_url: logoUrl,
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
      const errorMessage = error instanceof Error ? error.message : 'Errore nel completamento';
      toast.error(errorMessage);
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
          logo_url: null,
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
      const errorMessage = error instanceof Error ? error.message : 'Errore nel completamento';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo Upload Card */}
      <div className="bg-surface border border-border rounded-xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-pink-100 border border-orange-200">
            <ImageIcon className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Logo Aziendale</h3>
            <p className="text-sm text-muted-foreground">Personalizza l&apos;identità visiva della tua azienda</p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="relative">
          {previewUrl ? (
            // Preview State
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-64 h-64 rounded-2xl bg-white border-2 border-border p-8 flex items-center justify-center shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="absolute -top-3 -right-3 h-10 w-10 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Rimuovi logo"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-primary">
                  <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-medium">Caricamento in corso...</span>
                </div>
              )}

              {!uploading && logoUrl && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">Logo caricato con successo</span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-11 px-6"
              >
                <Upload className="h-4 w-4 mr-2" />
                Cambia Logo
              </Button>
            </div>
          ) : (
            // Empty State
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-6 transition-all ${
                uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
              }`}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20">
                <Upload className="h-10 w-10 text-primary" />
              </div>

              <div className="text-center space-y-2">
                <p className="text-base font-medium text-foreground">
                  Trascina qui il logo oppure clicca per selezionare
                </p>
                <p className="text-sm text-muted-foreground">
                  Formati supportati: PNG, JPG, SVG • Massimo 2MB
                </p>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-primary">
                  <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm font-medium">Caricamento in corso...</span>
                </div>
              )}
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
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Perché è importante avere un logo?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Il tuo logo verrà utilizzato su fatture, documenti, email e nell&apos;interfaccia dell&apos;applicazione.
              Conferisce professionalità e rafforza l&apos;identità della tua azienda. Potrai sempre modificarlo
              successivamente dalle impostazioni.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => router.push('/onboarding/step-1')}
          disabled={loading || uploading}
          className="h-11 px-6 flex items-center justify-center gap-2 bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Indietro</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading || uploading}
            className="h-11 px-6 flex items-center justify-center gap-2 bg-surface border border-border rounded-lg hover:border-primary/20 hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm font-medium">Salta per ora</span>
          </button>

          <Button
            onClick={handleComplete}
            disabled={loading || uploading || !logoUrl}
            className="h-11 px-8 text-sm font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Completamento...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Completa Configurazione
                <Check className="h-5 w-5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
