import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (context) => {
    try {
      // 🔒 SECURITY #34: Rate limiting to prevent email bombing
      const { success, reset } = await checkRateLimit(context.user.id, 'api');
      if (!success) {
        throw ApiErrors.rateLimitExceeded(Math.ceil((reset - Date.now()) / 1000));
      }

      const supabase = await createClient();
      const adminClient = createAdminClient();

      const { id: userId } = await params;

      // Check if the user is in the same tenant
      const { data: targetUserTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id)
        .single();

      if (!targetUserTenant) {
        throw ApiErrors.notFound('User');
      }

      // Get user email from auth.users
      const { data: targetUser, error: getUserError } = await adminClient.auth.admin.getUserById(userId);

      if (getUserError || !targetUser.user) {
        throw ApiErrors.notFound('User');
      }

      // Resend invite email
      const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
        targetUser.user.email!,
        {
          data: targetUser.user.user_metadata,
        }
      );

      if (inviteError) {
        throw new Error(inviteError.message);
      }

      return NextResponse.json({
        success: true,
        email: targetUser.user.email,
      });
    } catch (error) {
      return handleApiError(error, 'POST /api/users/[id]/resend-invite');
    }
  });
}
