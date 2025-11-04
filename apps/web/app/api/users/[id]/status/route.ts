import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userTenant || (userTenant.role !== 'admin' && userTenant.role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = params.id;

    // Check if the user to update is in the same tenant
    const { data: targetUserTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id, is_active')
      .eq('user_id', userId)
      .eq('tenant_id', userTenant.tenant_id)
      .single();

    if (!targetUserTenant) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    // Prevent self-deactivation
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot change your own status' }, { status: 400 });
    }

    // Toggle the is_active status
    const newStatus = !targetUserTenant.is_active;

    const { error: statusError } = await supabase
      .from('user_tenants')
      .update({ is_active: newStatus })
      .eq('user_id', userId)
      .eq('tenant_id', userTenant.tenant_id);

    if (statusError) {
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      is_active: newStatus,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
