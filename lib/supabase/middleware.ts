import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // API routes handle their own authentication — never redirect them.
  // Without this, POST /api/auth/register gets bounced to /login
  // because the session cookie hasn't propagated yet at that moment.
  const isApiRoute = pathname.startsWith('/api/');

  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  // The marketing landing page — public, same as login/register.
  const isLandingPage = pathname === '/';

  // Not logged in, not on an auth/landing page, not an API route → bounce to login
  if (!user && !isAuthPage && !isLandingPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Already logged in and trying to reach login/register/landing → send to dashboard
  if (user && (isAuthPage || isLandingPage)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}