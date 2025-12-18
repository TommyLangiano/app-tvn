import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/auth';
import { validateRequestBody, updateUserSchema, updateUserStatusSchema } from '@/lib/validation/api-schemas';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (context) => {
    try {
      const { id: userId } = await params;

      // ✅ Validate request body
      const validation = await validateRequestBody(request, updateUserSchema);
      if (!validation.success) {
        throw ApiErrors.badRequest(validation.error);
      }

      const supabase = await createClient();
      const adminClient = createAdminClient();

      // Check if user to update is in same tenant
      const { data: targetTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id)
        .limit(1);

      const targetUserTenant = targetTenants && targetTenants.length > 0 ? targetTenants[0] : null;

      if (!targetUserTenant) {
        throw ApiErrors.notFound('User');
      }

      const {
        full_name,
        phone,
        position,
        notes,
        role,
        email,
        birth_date,
        hire_date,
        medical_checkup_date,
        medical_checkup_expiry
      } = validation.data;

      // Update user profile
      const profileUpdates: Record<string, string | null> = {};
      if (full_name !== undefined) profileUpdates.full_name = full_name;
      if (phone !== undefined) profileUpdates.phone = phone;
      if (position !== undefined) profileUpdates.position = position;
      if (notes !== undefined) profileUpdates.notes = notes;
      if (birth_date !== undefined) profileUpdates.birth_date = birth_date || null;
      if (hire_date !== undefined) profileUpdates.hire_date = hire_date || null;
      if (medical_checkup_date !== undefined) profileUpdates.medical_checkup_date = medical_checkup_date || null;
      if (medical_checkup_expiry !== undefined) profileUpdates.medical_checkup_expiry = medical_checkup_expiry || null;

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await adminClient
          .from('user_profiles')
          .update(profileUpdates)
          .eq('user_id', userId);

        if (profileError) {
          throw new Error('Failed to update user profile');
        }
      }

      // Update role if changed
      if (role && role !== targetUserTenant.role) {
        const { error: roleError } = await supabase
          .from('user_tenants')
          .update({ role })
          .eq('user_id', userId)
          .eq('tenant_id', context.tenant.tenant_id);

        if (roleError) {
          throw new Error('Failed to update user role');
        }
      }

      // Update email if changed
      if (email) {
        const { error: emailError } = await adminClient.auth.admin.updateUserById(userId, {
          email,
        });

        if (emailError) {
          throw new Error('Failed to update user email');
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, 'PUT /api/users/[id]');
    }
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminAuth(async (context) => {
    try {
      const { id: userId } = await params;

      // 🔒 Prevent self-deletion
      if (userId === context.user.id) {
        throw ApiErrors.badRequest('Cannot delete yourself');
      }

      const supabase = await createClient();
      const adminClient = createAdminClient();

      // Check if user to delete is in same tenant
      const { data: targetTenants } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id)
        .limit(1);

      if (!targetTenants || targetTenants.length === 0) {
        throw ApiErrors.notFound('User');
      }

      // Get user profile to check for documents
      const { data: profile } = await adminClient
        .from('user_profiles')
        .select('document_path')
        .eq('user_id', userId)
        .single();

      // Delete document from storage if exists
      if (profile?.document_path) {
        try {
          await supabase.storage
            .from('app-storage')
            .remove([profile.document_path]);
        } catch (error) {
          // Non-critical - continue deletion
          console.warn('Storage deletion warning:', error);
        }
      }

      // Delete user from tenant
      const { error: tenantError } = await adminClient
        .from('user_tenants')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id);

      if (tenantError) {
        throw new Error('Failed to remove user from tenant');
      }

      // Delete user profile
      await adminClient
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      // Delete auth user (definitive deletion)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, 'DELETE /api/users/[id]');
    }
  });
}
