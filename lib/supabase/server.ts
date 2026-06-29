import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// This client runs on the server (Server Components, Route Handlers).
// It reads/writes the auth session via cookies, so the server always
// knows which user is logged in without exposing tokens to the browser.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can be called from a Server Component, where cookies
            // can't be set. Safe to ignore — middleware handles refreshing
            // the session in that case.
          }
        },
      },
    }
  );
}