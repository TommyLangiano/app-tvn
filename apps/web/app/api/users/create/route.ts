import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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

    // Get request data
    const {
      email,
      first_name,
      last_name,
      role,
      phone,
      position,
      notes,
      send_invite = true,
      birth_date,
      hire_date,
      medical_checkup_date,
      medical_checkup_expiry
    } = await request.json();

    if (!email || !first_name || !last_name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['admin', 'admin_readonly', 'operaio', 'billing_manager'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    let newUser;
    let inviteSent = false;
    const full_name = `${first_name} ${last_name}`;

    if (send_invite) {
      // Create user via email invite
      const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name,
          last_name,
          full_name,
        },
      });

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 });
      }

      newUser = data.user;
      inviteSent = true;
    } else {
      // Create user without invite (for future implementation if needed)
      const { data, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name,
          full_name,
        },
      });

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 400 });
      }

      newUser = data.user;
    }

    if (!newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Update user profile with additional fields including HR fields (using admin client to bypass RLS)
    // first_name, last_name will auto-generate username and full_name via triggers
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update({
        first_name,
        last_name,
        phone: phone || null,
        position: position || null,
        notes: notes || null,
        birth_date: birth_date || null,
        hire_date: hire_date || null,
        medical_checkup_date: medical_checkup_date || null,
        medical_checkup_expiry: medical_checkup_expiry || null,
      })
      .eq('user_id', newUser.id);

    if (profileError) {
      // Don't fail the request, profile will be created by trigger
    }

    // Add user to tenant with specified role (using admin client to bypass RLS)
    const { error: tenantError } = await adminClient
      .from('user_tenants')
      .insert({
        user_id: newUser.id,
        tenant_id: userTenant.tenant_id,
        role,
        created_by: user.id,
        is_active: true,
      });

    if (tenantError) {
      // Try to delete the created user if tenant assignment fails
      await adminClient.auth.admin.deleteUser(newUser.id);
      return NextResponse.json({ error: 'Failed to assign user to tenant' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invite_sent: inviteSent,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name,
        role,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
