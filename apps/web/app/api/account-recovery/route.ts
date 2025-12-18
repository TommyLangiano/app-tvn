import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const accountRecoverySchema = z.object({
  ragione_sociale: z.string().min(1, 'Ragione sociale obbligatoria'),
  partita_iva: z.string().min(1, 'Partita IVA obbligatoria'),
  pec: z.string().email('PEC non valida'),
  codice_fiscale: z.string().optional(),
  forma_giuridica: z.string().optional(),
  telefono: z.string().optional(),
  settore_attivita: z.string().optional(),
  sede_legale_via: z.string().optional(),
  sede_legale_civico: z.string().optional(),
  sede_legale_cap: z.string().optional(),
  sede_legale_citta: z.string().optional(),
  sede_legale_provincia: z.string().optional(),
  sede_legale_nazione: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw ApiErrors.notAuthenticated();
    }

    // 🔒 SECURITY #13: Rate limiting to prevent abuse
    const { success, reset } = await checkRateLimit(user.id, 'api');
    if (!success) {
      throw ApiErrors.rateLimitExceeded(Math.ceil((reset - Date.now()) / 1000));
    }

    const body = await request.json();

    // Validate with Zod
    const validation = accountRecoverySchema.safeParse(body);
    if (!validation.success) {
      throw ApiErrors.badRequest(validation.error.issues[0].message);
    }

    const {
      ragione_sociale,
      partita_iva,
      codice_fiscale,
      forma_giuridica,
      pec,
      telefono,
      settore_attivita,
      sede_legale_via,
      sede_legale_civico,
      sede_legale_cap,
      sede_legale_citta,
      sede_legale_provincia,
      sede_legale_nazione,
    } = validation.data;

    // 🔒 SECURITY #12 & #15: Timing attack prevention - use constant time check
    // Check if user already has a tenant
    const checkStart = Date.now();
    const { data: existingUserTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    // Aggiungi delay minimo per normalizzare il tempo di risposta (anti-timing attack)
    const elapsed = Date.now() - checkStart;
    if (elapsed < 100) {
      await new Promise(resolve => setTimeout(resolve, 100 - elapsed));
    }

    if (existingUserTenant) {
      // 🔒 SECURITY #15: Errore generico (non rivelare se utente ha tenant)
      throw ApiErrors.badRequest('Impossibile completare l\'operazione');
    }

    // 1. Create tenant
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: ragione_sociale,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (tenantError || !newTenant) {
      throw new Error('Errore nella creazione del tenant');
    }

    const tenantId = newTenant.id;

    // 2. Create tenant profile
    const { error: profileError } = await supabase
      .from('tenant_profiles')
      .insert({
        tenant_id: tenantId,
        ragione_sociale,
        partita_iva,
        codice_fiscale,
        forma_giuridica,
        pec,
        telefono,
        settore_attivita,
        sede_legale_via,
        sede_legale_civico,
        sede_legale_cap,
        sede_legale_citta,
        sede_legale_provincia,
        sede_legale_nazione,
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      // Rollback: delete the tenant
      await supabase.from('tenants').delete().eq('id', tenantId);
      throw new Error('Errore nella creazione del profilo tenant');
    }

    // 🔒 SECURITY #14: Prevent privilege escalation - only allow 'admin' role during recovery
    // Users cannot choose their own role via this endpoint
    // 3. Create user_tenants relation (assign as admin - hardcoded)
    const { error: userTenantError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: 'admin', // Hardcoded - no user input for role
        is_active: true,
        created_at: new Date().toISOString(),
      });

    if (userTenantError) {
      // Rollback: delete tenant and profile
      await supabase.from('tenant_profiles').delete().eq('tenant_id', tenantId);
      await supabase.from('tenants').delete().eq('id', tenantId);
      throw new Error('Errore nell\'assegnazione dell\'utente al tenant');
    }

    // 4. Create user profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          full_name: user.email?.split('@')[0] || 'Utente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      tenantId,
      message: 'Account recuperato con successo',
    });

  } catch (error) {
    return handleApiError(error, 'POST /api/account-recovery');
  }
}
