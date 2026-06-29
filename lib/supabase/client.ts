import { createBrowserClient } from '@supabase/ssr';

// This client runs in the browser (inside 'use client' components).
// It automatically reads the session cookie so the logged-in user
// stays logged in across page loads.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}