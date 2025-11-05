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
      .single();

    if (!userTenants) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    // Load users from tenant with roles
    const { data: tenantUsers } = await supabase
      .from('user_tenants')
      .select('user_id, role')
      .eq('tenant_id', userTenants.tenant_id);

    if (!tenantUsers) {
      return NextResponse.json({ users: [] });
    }

    // Fetch user details using admin API and merge with role
    const usersData = await Promise.all(
      tenantUsers.map(async (ut) => {
        const { data, error } = await supabase.auth.admin.getUserById(ut.user_id);
        if (error) {
          return null;
        }
        // Merge auth user data with role from user_tenants
        return data?.user ? { ...data.user, role: ut.role } : null;
      })
    );

    const users = usersData.filter(Boolean);

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
