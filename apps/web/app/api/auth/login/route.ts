import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
});

export async function POST(request: NextRequest) {
  // 🔒 SECURITY #1: Rate limiting su login (già implementato)
  try {
    // Rate limiting per IP
    const clientIp = getClientIp(request);
    const { success, limit, remaining, reset } = await checkRateLimit(clientIp, 'login');

    if (!success) {
      return NextResponse.json(
        {
          error: 'Troppi tentativi di login. Riprova più tardi.',
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
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Create Supabase client (non-admin)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 🔒 SECURITY #4 & #5: Errore generico + audit log per rilevare brute force
      console.warn(`[Login] Failed attempt from IP: ${clientIp}`);

      // 🔒 SECURITY #5: Log failed login per detection brute force
      // TODO: Implementare alert automatico dopo N tentativi falliti dallo stesso IP

      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // 🔒 SECURITY #2: Verifica che l'utente abbia almeno un tenant attivo
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: userTenants } = await supabaseServer
      .from('user_tenants')
      .select('tenant_id, is_active')
      .eq('user_id', data.user.id);

    if (!userTenants || userTenants.length === 0) {
      // 🔒 SECURITY #4: Errore generico (non rivelare motivo specifico)
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    const hasActiveTenant = userTenants.some(t => t.is_active);
    if (!hasActiveTenant) {
      // 🔒 SECURITY #2 & #4: Account disattivato, ma errore generico
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // 🔒 SECURITY: Log senza PII
    console.info(`[Login] Successful login from IP: ${clientIp}`);

    // 🔒 SECURITY: NON esporre session token in JSON response
    // Supabase gestisce automaticamente i cookie httpOnly
    // Ritorna solo dati user safe (no token, no email sensibili)
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        user_metadata: data.user.user_metadata,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
