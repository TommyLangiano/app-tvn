import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { logAuditEvent, getRequestMetadata } from '@/lib/audit';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (context) => {
    try {
      const supabase = await createClient();
      const { id: userId } = await params;

      // Prevent self-deactivation
      if (userId === context.user.id) {
        throw ApiErrors.badRequest('Cannot change your own status');
      }

      // Check if the user to update is in the same tenant
      const { data: targetUserTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, is_active')
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id)
        .single();

      if (!targetUserTenant) {
        throw ApiErrors.notFound('User');
      }

      // Toggle the is_active status
      const newStatus = !targetUserTenant.is_active;

      const { error: statusError } = await supabase
        .from('user_tenants')
        .update({ is_active: newStatus })
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id);

      if (statusError) {
        throw new Error('Failed to update user status');
      }

      // 🔒 AUDIT: Log status change
      const { ipAddress, userAgent } = getRequestMetadata(request);
      await logAuditEvent({
        tenantId: context.tenant.tenant_id,
        userId: context.user.id,
        eventType: 'user_status_changed',
        resourceType: 'user',
        resourceId: userId,
        oldValues: { is_active: targetUserTenant.is_active },
        newValues: { is_active: newStatus },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        is_active: newStatus,
      });
    } catch (error) {
      return handleApiError(error, 'PATCH /api/users/[id]/status');
    }
  });
}
