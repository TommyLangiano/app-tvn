import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  tenant: {
    tenant_id: string;
    role: string;
  };
}

/**
 * Middleware per autenticazione e verifica tenant
 * Centralizza il pattern ripetuto in tutte le API
 */
export async function withAuth(
  handler: (context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // 1. Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Ottieni tenant dell'utente
    // Supporta tenant selection via cookie o prende il più recente come fallback
    const { data: allTenants, error: tenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id, role, is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (tenantError || !allTenants || allTenants.length === 0) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // 🔒 SECURITY: Support multi-tenant selection via session/cookie
    // For now, use first active tenant as default (can be extended with tenant switching)
    const userTenant = allTenants.find(t => t.is_active) || allTenants[0];

    // 3. Verifica che l'utente sia attivo nel tenant
    if (!userTenant.is_active) {
      return NextResponse.json({ error: 'User is inactive' }, { status: 403 });
    }

    // 4. Crea context e passa all'handler
    const context: AuthContext = {
      user: {
        id: user.id,
        email: user.email,
      },
      tenant: {
        tenant_id: userTenant.tenant_id,
        role: userTenant.role,
      },
    };

    return await handler(context);

  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Middleware che richiede ruolo admin/owner
 */
export async function withAdminAuth(
  handler: (context: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(async (context) => {
    // Verifica ruolo admin
    if (context.tenant.role !== 'admin' && context.tenant.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    return await handler(context);
  });
}
