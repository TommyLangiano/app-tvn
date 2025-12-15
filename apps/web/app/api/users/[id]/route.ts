import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin (take most recent tenant if multiple)
    const { data: tenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const userTenant = tenants && tenants.length > 0 ? tenants[0] : null;

    if (!userTenant || (userTenant.role !== 'admin' && userTenant.role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: userId } = await params;

    // Check if the user to update is in the same tenant
    const { data: targetTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', userId)
      .eq('tenant_id', userTenant.tenant_id)
      .limit(1);

    const targetUserTenant = targetTenants && targetTenants.length > 0 ? targetTenants[0] : null;

    if (!targetUserTenant) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    // Get update data
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
    } = await request.json();

    // Update user profile including HR fields
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
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
      }
    }

    // Update role if changed
    if (role && role !== targetUserTenant.role) {
      if (!['admin', 'admin_readonly', 'operaio', 'billing_manager'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      const { error: roleError } = await supabase
        .from('user_tenants')
        .update({ role })
        .eq('user_id', userId)
        .eq('tenant_id', userTenant.tenant_id);

      if (roleError) {
        return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
      }
    }

    // Update email if changed (using auth admin API)
    if (email) {
      const { error: emailError } = await adminClient.auth.admin.updateUserById(userId, {
        email,
      });

      if (emailError) {
        return NextResponse.json({ error: 'Failed to update user email' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin (take most recent tenant if multiple)
    const { data: tenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const userTenant = tenants && tenants.length > 0 ? tenants[0] : null;

    if (!userTenant || (userTenant.role !== 'admin' && userTenant.role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id: userId } = await params;

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Check if the user to delete is in the same tenant
    const { data: targetTenants } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', userTenant.tenant_id)
      .limit(1);

    const targetUserTenant = targetTenants && targetTenants.length > 0 ? targetTenants[0] : null;

    if (!targetUserTenant) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
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
        const { error: storageError } = await supabase.storage
          .from('app-storage')
          .remove([profile.document_path]);

        if (storageError) {
          // Don't fail the request if storage deletion fails
        }
      } catch {
      }
    }

    // Delete user from tenant (this will cascade delete related data due to RLS)
    const { error: tenantError } = await adminClient
      .from('user_tenants')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', userTenant.tenant_id);

    if (tenantError) {
      return NextResponse.json({ error: 'Failed to remove user from tenant' }, { status: 500 });
    }

    // Delete user profile
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      // Continue anyway, auth deletion is more important
    }

    // Delete the auth user (this is the definitive deletion)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage, details: err }, { status: 500 });
  }
}
