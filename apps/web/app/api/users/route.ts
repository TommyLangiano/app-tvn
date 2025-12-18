import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors/api-errors';

export async function GET() {
  return withAuth(async (context) => {
    try {
      const supabase = await createClient();

      // Load users from tenant with roles
      const { data: tenantUsersData } = await supabase
        .from('user_tenants')
        .select('user_id, role, is_active')
        .eq('tenant_id', context.tenant.tenant_id);

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
    } catch (error) {
      return handleApiError(error, 'GET /api/users');
    }
  });
}
