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
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();

      if (userTenant) {
        const { data: profile } = await supabase
          .from('tenant_profiles')
          .select('onboarding_completed')
          .eq('tenant_id', userTenant.tenant_id)
          .limit(1);

        const needsOnboarding = !profile?.[0]?.onboarding_completed;

        if (needsOnboarding) {
          return NextResponse.redirect(new URL('/onboarding/step-1', request.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    }

    // Check if user needs to complete onboarding
    if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api')) {
      const { data: userTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single();

      if (userTenant) {
        const { data: profile } = await supabase
          .from('tenant_profiles')
          .select('onboarding_completed')
          .eq('tenant_id', userTenant.tenant_id)
          .limit(1);

        const needsOnboarding = !profile?.[0]?.onboarding_completed;

        if (needsOnboarding) {
          return NextResponse.redirect(new URL('/onboarding/step-1', request.url));
        }
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
