import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/middleware/auth';
import { validateRequestBody, createUserSchema } from '@/lib/validation/api-schemas';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { checkIdempotency, storeIdempotencyResult } from '@/lib/idempotency';

export async function POST(request: Request) {
  return withAdminAuth(async (context) => {
    try {
      // ✅ Validate request body con Zod
      const validation = await validateRequestBody(request, createUserSchema);

      if (!validation.success) {
        throw ApiErrors.badRequest(validation.error);
      }

      const {
        email,
        first_name,
        last_name,
        role,
        custom_role_id,
        phone,
        position,
        notes,
        send_invite = true,
        birth_date,
        hire_date,
        medical_checkup_date,
        medical_checkup_expiry
      } = validation.data;

      // 🔒 IDEMPOTENCY: Check per prevenire duplicati su retry
      const idempotencyKey = request.headers.get('idempotency-key');
      if (idempotencyKey) {
        const cached = await checkIdempotency(
          idempotencyKey,
          'POST /api/users/create',
          validation.data,
          context.tenant.tenant_id
        );
        if (cached) return cached;
      }

      const adminClient = createAdminClient();

      // 🔒 SECURITY #21, #19 & #22: Validate custom_role_id BEFORE creating user (prevent timing attack)
      if (custom_role_id) {
        const checkStart = Date.now();
        const { data: customRole } = await adminClient
          .from('custom_roles')
          .select('id')
          .eq('id', custom_role_id)
          .eq('tenant_id', context.tenant.tenant_id)
          .single();

        // 🔒 SECURITY #22: Normalizza tempo di risposta per prevenire timing attack
        const elapsed = Date.now() - checkStart;
        if (elapsed < 50) {
          await new Promise(resolve => setTimeout(resolve, 50 - elapsed));
        }

        if (!customRole) {
          throw ApiErrors.badRequest('Custom role not found in your tenant');
        }
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
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/accept-invite`,
        });

        if (inviteError) {
          throw ApiErrors.badRequest(inviteError.message);
        }

        newUser = data.user;
        inviteSent = true;
      } else {
        // Create user without invite
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
          throw ApiErrors.badRequest(createError.message);
        }

        newUser = data.user;
      }

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Update user profile with additional fields
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

      // Profile errors non-critical (trigger creates it)
      if (profileError) {
        console.warn('Profile update warning:', profileError.message);
      }

      // Add user to tenant with specified role
      const userTenantData: any = {
        user_id: newUser.id,
        tenant_id: context.tenant.tenant_id,
        created_by: context.user.id,
        is_active: true,
      };

      // Assign role (validation already done above)
      if (custom_role_id) {
        userTenantData.custom_role_id = custom_role_id;
      } else if (role) {
        userTenantData.role = role;
      }

      const { error: tenantError } = await adminClient
        .from('user_tenants')
        .insert(userTenantData);

      if (tenantError) {
        // 🔒 SECURITY #24: Improved rollback con error handling
        try {
          await adminClient.auth.admin.deleteUser(newUser.id);
        } catch (deleteError) {
          // Log errore critico: orphan user created
          console.error(`[CRITICAL] Failed to rollback user ${newUser.id} after tenant assignment error:`, deleteError);
          // TODO: Implementare alert/monitoring per orphan users
        }
        throw new Error('Failed to assign user to tenant');
      }

      const result = {
        success: true,
        invite_sent: inviteSent,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name,
          role: role || null,
          custom_role_id: custom_role_id || null,
        },
      };

      // 🔒 IDEMPOTENCY: Store result se chiave presente
      if (idempotencyKey) {
        await storeIdempotencyResult(
          idempotencyKey,
          'POST /api/users/create',
          validation.data,
          result,
          200,
          context.tenant.tenant_id
        );
      }

      return NextResponse.json(result);
    } catch (error) {
      return handleApiError(error, 'POST /api/users/create');
    }
  });
}
