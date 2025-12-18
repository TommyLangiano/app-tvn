import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  return withAuth(async (context) => {
    try {
      // 🔒 Rate limit to prevent abuse
      const { success, reset } = await checkRateLimit(context.user.id, 'api');
      if (!success) {
        throw ApiErrors.rateLimitExceeded(Math.ceil((reset - Date.now()) / 1000));
      }

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

      // 🔒 CODE QUALITY #54 & #55: Explicit handling di profili mancanti + cleanup is_active confusion
      // Merge tenant data with profiles
      const users = tenantUsersData
        .map((ut) => {
          const profile = profilesMap.get(ut.user_id);

          // 🔒 CODE QUALITY #54: Log esplicitamente profili mancanti invece di filter(Boolean)
          if (!profile) {
            console.warn('[Users List] Missing profile for user:', {
              userId: ut.user_id,
              tenantId: context.tenant.tenant_id,
              timestamp: new Date().toISOString(),
            });
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
            // 🔒 CODE QUALITY #55: Clarify is_active fields
            is_active: ut.is_active, // Tenant membership status (primary)
            profile_is_active: profile.is_active, // Profile status (secondary, deprecated)
            user_metadata: {
              full_name: profile.full_name,
            }
          };
        })
        .filter((user): user is NonNullable<typeof user> => user !== null);

      return NextResponse.json({ users });
    } catch (error) {
      return handleApiError(error, 'GET /api/users');
    }
  });
}
