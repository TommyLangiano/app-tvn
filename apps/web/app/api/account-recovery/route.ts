import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
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
    } = body;

    // Validate required fields
    if (!ragione_sociale || !partita_iva || !pec) {
      return NextResponse.json(
        { error: 'Campi obbligatori mancanti' },
        { status: 400 }
      );
    }

    // Check if user already has a tenant
    const { data: existingUserTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (existingUserTenant) {
      return NextResponse.json(
        { error: 'L\'utente ha già un tenant associato' },
        { status: 400 }
      );
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
      console.error('Error creating tenant:', tenantError);
      return NextResponse.json(
        { error: 'Errore nella creazione del tenant' },
        { status: 500 }
      );
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
      console.error('Error creating tenant profile:', profileError);
      // Rollback: delete the tenant
      await supabase.from('tenants').delete().eq('id', tenantId);
      return NextResponse.json(
        { error: 'Errore nella creazione del profilo tenant' },
        { status: 500 }
      );
    }

    // 3. Create user_tenants relation (assign as admin)
    const { error: userTenantError } = await supabase
      .from('user_tenants')
      .insert({
        user_id: user.id,
        tenant_id: tenantId,
        role: 'admin',
        created_at: new Date().toISOString(),
      });

    if (userTenantError) {
      console.error('Error creating user_tenant relation:', userTenantError);
      // Rollback: delete tenant and profile
      await supabase.from('tenant_profiles').delete().eq('tenant_id', tenantId);
      await supabase.from('tenants').delete().eq('id', tenantId);
      return NextResponse.json(
        { error: 'Errore nell\'assegnazione dell\'utente al tenant' },
        { status: 500 }
      );
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
    console.error('Account recovery error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
