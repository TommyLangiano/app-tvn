import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
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

    const userId = params.id;

    // Check if the user is in the same tenant
    const { data: targetUserTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', userTenant.tenant_id)
      .single();

    if (!targetUserTenant) {
      return NextResponse.json({ error: 'User not found in your tenant' }, { status: 404 });
    }

    // Get user email from auth.users
    const { data: targetUser, error: getUserError } = await adminClient.auth.admin.getUserById(userId);

    if (getUserError || !targetUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Resend invite email
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      targetUser.user.email!,
      {
        data: targetUser.user.user_metadata,
      }
    );

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email: targetUser.user.email,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
