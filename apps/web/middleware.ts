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
    // Skip onboarding check for signup and sign-in pages
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/signup')) {
      // Check if user needs onboarding
      const { data: userTenant, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();

      // CRITICAL: Handle missing tenant
      if (tenantError || !userTenant) {
        console.error('[Middleware] Tenant not found for user:', user.id, tenantError);
        // Force logout and redirect to error page
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/tenant-error', request.url));
      }

      const { data: profile, error: profileError } = await supabase
        .from('tenant_profiles')
        .select('onboarding_completed')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      // CRITICAL: Handle missing tenant profile
      if (profileError || !profile || profile.length === 0) {
        console.error('[Middleware] Tenant profile not found:', userTenant.tenant_id, profileError);
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/tenant-error', request.url));
      }

      const needsOnboarding = !profile[0].onboarding_completed;

      if (needsOnboarding) {
        return NextResponse.redirect(new URL('/onboarding/step-1', request.url));
      } else {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check if user needs to complete onboarding
    if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api') && !pathname.startsWith('/tenant-error')) {
      const { data: userTenant, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();

      // CRITICAL: Handle missing tenant
      if (tenantError || !userTenant) {
        console.error('[Middleware] Tenant not found for user:', user.id, tenantError);
        // Force logout and redirect to error page
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/tenant-error', request.url));
      }

      const { data: profile, error: profileError } = await supabase
        .from('tenant_profiles')
        .select('onboarding_completed')
        .eq('tenant_id', userTenant.tenant_id)
        .limit(1);

      // CRITICAL: Handle missing tenant profile
      if (profileError || !profile || profile.length === 0) {
        console.error('[Middleware] Tenant profile not found:', userTenant.tenant_id, profileError);
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/tenant-error', request.url));
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
    '/(app)/:path*'
  ],
};
