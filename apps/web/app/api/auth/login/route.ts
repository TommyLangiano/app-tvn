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
        { error: validation.error.errors[0].message },
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
      // Log failed attempt (could be stored in audit table)
      console.warn(`[Login] Failed attempt for ${email} from ${clientIp}`);

      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Log successful login (could be stored in audit table)
    console.info(`[Login] Successful login for ${email} from ${clientIp}`);

    return NextResponse.json({
      success: true,
      session: data.session,
      user: data.user,
    }, { status: 200 });

  } catch (error) {
    console.error('[Login] Error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
