import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get tenant
    const { data: userTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const currentUserTenant = userTenants && userTenants.length > 0 ? userTenants[0] : null;

    if (!currentUserTenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Load users from tenant with roles
    const { data: tenantUsersData } = await supabase
      .from('user_tenants')
      .select('user_id, role, is_active')
      .eq('tenant_id', currentUserTenant.tenant_id);

    if (!tenantUsersData) {
      return NextResponse.json({ users: [] });
    }

    // Get user IDs
    const userIds = tenantUsersData.map(ut => ut.user_id);

    // Fetch user profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, email, first_name, last_name, full_name, username, avatar_url, position, is_active')
      .in('user_id', userIds);

    if (!profiles) {
      return NextResponse.json({ users: [] });
    }

    // Map profiles by user_id for quick lookup
    const profilesMap = new Map(profiles.map(p => [p.user_id, p]));

    // Merge tenant data with profiles
    const users = tenantUsersData.map((ut) => {
      const profile = profilesMap.get(ut.user_id);
      if (!profile) {
        return null;
      }

      return {
        id: ut.user_id,
        email: profile.email,
        full_name: profile.full_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.username,
        avatar_url: profile.avatar_url,
        position: profile.position,
        role: ut.role,
        is_active: profile.is_active,
        is_active_in_tenant: ut.is_active,
        user_metadata: {
          full_name: profile.full_name,
        }
      };
    }).filter(Boolean);

    return NextResponse.json({ users });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
