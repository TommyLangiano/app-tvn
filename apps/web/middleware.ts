import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // If user is not logged in and trying to access protected routes
  if (!user && (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding'))) {
    const redirectUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is logged in
  if (user) {
    // 🚀 OTTIMIZZAZIONE: Fetch user_tenants e custom_role in parallelo una volta sola
    const { data: userTenant, error: tenantError } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        custom_role_id,
        custom_roles (
          system_role_key
        )
      `)
      .eq('user_id', user.id)
      .single();

    // CRITICAL: Handle missing tenant - redirect to account recovery
    if (tenantError || !userTenant) {
      console.error('[Middleware] Tenant not found for user:', user.id, tenantError);
      return NextResponse.redirect(new URL('/account-recovery', request.url));
    }

    // Support both old role string and new custom_role_id system
    const userRoleKey = (userTenant.custom_roles as any)?.system_role_key || userTenant.role;
    const isDipendente = userRoleKey === 'dipendente' || userRoleKey === 'operaio';

    // Skip onboarding check for signup and sign-in pages
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/signup')) {
      const { data: profile, error: profileError } = await supabase
        .from('tenant_profiles')
        .select('onboarding_completed')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      // CRITICAL: Handle missing tenant profile - redirect to account recovery
      if (profileError || !profile || profile.length === 0) {
        console.error('[Middleware] Tenant profile not found:', userTenant.tenant_id, profileError);
        return NextResponse.redirect(new URL('/account-recovery', request.url));
      }

      const needsOnboarding = !profile[0].onboarding_completed;

      if (needsOnboarding) {
        return NextResponse.redirect(new URL('/onboarding/step-1', request.url));
      } else {
        // Check if user is dipendente - redirect to mobile
        if (isDipendente) {
          return NextResponse.redirect(new URL('/mobile/home', request.url));
        }

        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Protect mobile routes - only dipendenti can access
    if (pathname.startsWith('/mobile')) {
      if (!isDipendente) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Protect admin routes - dipendenti cannot access
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/(app)')) {
      if (isDipendente) {
        return NextResponse.redirect(new URL('/mobile/home', request.url));
      }
    }

    // Check if user needs to complete onboarding
    if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api') && !pathname.startsWith('/tenant-error') && !pathname.startsWith('/account-recovery') && !pathname.startsWith('/mobile')) {
      const { data: profile, error: profileError } = await supabase
        .from('tenant_profiles')
        .select('onboarding_completed')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      // CRITICAL: Handle missing tenant profile - redirect to account recovery
      if (profileError || !profile || profile.length === 0) {
        console.error('[Middleware] Tenant profile not found:', userTenant.tenant_id, profileError);
        return NextResponse.redirect(new URL('/account-recovery', request.url));
      }

      const needsOnboarding = !profile[0].onboarding_completed;

      if (needsOnboarding) {
        return NextResponse.redirect(new URL('/onboarding/step-1', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/sign-in',
    '/signup',
    '/onboarding/:path*',
    '/(app)/:path*',
    '/mobile/:path*'
  ],
};
