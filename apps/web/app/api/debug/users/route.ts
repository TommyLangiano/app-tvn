import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // Get all user_profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from('user_profiles')
      .select('user_id, email, first_name, last_name, username, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // Get all user_tenants
    const { data: userTenants, error: tenantsError } = await adminClient
      .from('user_tenants')
      .select('user_id, tenant_id, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    return NextResponse.json({
      total_profiles: profiles?.length || 0,
      total_user_tenants: userTenants?.length || 0,
      profiles,
      user_tenants: userTenants,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in /api/debug/users:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
