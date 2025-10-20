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

    // Load users from tenant
    const { data: tenantUsers } = await supabase
      .from('user_tenants')
      .select('user_id')
      .eq('tenant_id', userTenants.tenant_id);

    if (!tenantUsers) {
      return NextResponse.json({ users: [] });
    }

    // Fetch user details using admin API
    const usersData = await Promise.all(
      tenantUsers.map(async (ut) => {
        const { data, error } = await supabase.auth.admin.getUserById(ut.user_id);
        if (error) {
          console.error('Error fetching user:', error);
          return null;
        }
        return data?.user;
      })
    );

    const users = usersData.filter(Boolean);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in /api/users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
