import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';

// 🔒 SECURITY #8: Password complexity requirements
const passwordSchema = z.string()
  .min(8, 'Password deve essere di almeno 8 caratteri')
  .max(100, 'Password troppo lunga')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password deve contenere almeno una lettera maiuscola'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Password deve contenere almeno una lettera minuscola'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password deve contenere almeno un numero'
  )
  .refine(
    (val) => /[!@#$%^&*(),.?":{}|<>]/.test(val),
    'Password deve contenere almeno un carattere speciale (!@#$%^&*(),.?":{}|<>)'
  );

// Validation schema
const signupSchema = z.object({
  company_name: z.string().min(1, 'Nome azienda obbligatorio').max(100),
  first_name: z.string().min(1, 'Nome obbligatorio').max(50),
  last_name: z.string().min(1, 'Cognome obbligatorio').max(50),
  email: z.string().email('Email non valida'),
  password: passwordSchema,
});

// 🔒 SECURITY #9 & #10: Email verification e CAPTCHA
// TODO #9: Implementare email verification obbligatoria (email_confirm: false)
// TODO #10: Aggiungere Google reCAPTCHA v3 per prevenire bot signup
// Riferimenti:
// - Supabase Email Templates: https://supabase.com/docs/guides/auth/auth-email-templates
// - reCAPTCHA v3: https://developers.google.com/recaptcha/docs/v3

export async function POST(request: NextRequest) {
  try {
    // Verify environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create admin client inside function to avoid build-time issues
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    );
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
      throw ApiErrors.badRequest(validation.error.issues[0].message);
    }

    const { company_name, first_name, last_name, email, password } = validation.data;

    // 🔒 SECURITY & PERFORMANCE: Non usare listUsers() - è lentissimo!
    // Supabase gestisce automaticamente email duplicate con constraint unique
    // Step 1: Create auth user (restituirà errore se email già esistente)
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

    if (authError) {
      // 🔒 SECURITY: Email enumeration prevention - errore generico
      // Non esporre se l'email esiste o meno nel sistema (privacy)
      throw ApiErrors.badRequest('Errore nella registrazione. Verifica i dati inseriti.');
    }

    if (!authData.user) {
      throw new Error('Errore nella creazione dell\'utente');
    }

    const userId = authData.user.id;

    // Step 2: Create tenant
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: company_name,
        created_by: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tenantError || !tenantData) {
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error('Errore nella creazione dell\'azienda');
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
      // Rollback: delete tenant and user
      await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error('Errore nel collegamento utente-azienda');
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
      // Non-critical, continue
      console.warn('Profile update warning:', profileError.message);
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
      // Non-critical, continue
      console.warn('Tenant profile warning:', tenantProfileError.message);
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
    return handleApiError(error, 'POST /api/auth/signup');
  }
}
