import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Validation schema
const signupSchema = z.object({
  company_name: z.string().min(1, 'Nome azienda obbligatorio').max(100),
  first_name: z.string().min(1, 'Nome obbligatorio').max(50),
  last_name: z.string().min(1, 'Cognome obbligatorio').max(50),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password deve essere di almeno 8 caratteri'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const { success, limit, remaining, reset } = await checkRateLimit(clientIp, 'signup');

    if (!success) {
      return NextResponse.json(
        {
          error: 'Troppi tentativi di registrazione. Riprova più tardi.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    const body = await request.json();

    // Validate input with Zod
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { company_name, first_name, last_name, email, password } = validation.data;

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    if (existingUser?.users?.some(u => u.email === email)) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 409 }
      );
    }

    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: `${first_name} ${last_name}`,
        first_name,
        last_name
      }
    });

    if (authError || !authData.user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Errore nella creazione dell\'utente' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Step 2: Create tenant
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: company_name,
        created_by: userId
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      console.error('Tenant error:', tenantError);
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Errore nella creazione dell\'azienda' },
        { status: 500 }
      );
    }

    const tenantId = tenantData.id;

    // Step 3: Link user to tenant with role='owner'
    const { error: linkError } = await supabaseAdmin
      .from('user_tenants')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'owner'
      });

    if (linkError) {
      console.error('Link error:', linkError);
      // Rollback: delete tenant and user
      await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Errore nel collegamento utente-azienda' },
        { status: 500 }
      );
    }

    // Step 4: Update user_profile with full name (trigger should have created it)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: `${first_name} ${last_name}`,
        position: 'Titolare'
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Non-critical, continue
    }

    // Step 5: Create empty tenant_profile with onboarding_completed = false
    const { error: tenantProfileError } = await supabaseAdmin
      .from('tenant_profiles')
      .insert({
        tenant_id: tenantId,
        ragione_sociale: company_name,
        onboarding_completed: false
      });

    if (tenantProfileError) {
      console.error('Tenant profile error:', tenantProfileError);
      // Non-critical, continue
    }

    return NextResponse.json({
      success: true,
      message: 'Registrazione completata con successo',
      data: {
        user_id: userId,
        tenant_id: tenantId,
        email: email
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
